"use server"

import { cache } from "react"
import { randomBytes } from "crypto"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import type { Prisma } from "@prisma/client"
import {
  validate,
  guestCreate, guestUpdate,
  budgetItemCreate, budgetItemUpdate,
  checklistItemCreate, checklistItemUpdate,
  vendorCreate, vendorUpdate,
  directoryVendorCreate, directoryVendorUpdate,
  inventoryItemCreate, inventoryItemUpdate,
  eventCreate, eventUpdate,
  clientUpdate, weddingUpdate,
} from "@/lib/validation"
import { getEffectiveTier } from "@/lib/trial"
import { PLAN_LIMITS } from "@/lib/limits"

// ============================================
// AUTH HELPERS
// ============================================
//
// Every exported function in this file is a public POST endpoint, so each one
// must check who is calling it. Reads return empty results when the caller has
// no access; writes throw. Write payloads are validated by the schemas in
// src/lib/validation.ts, which only allow the columns a client may set.

function serializeDecimals<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof (obj as any).toNumber === 'function') return (obj as any).toNumber();
  if (obj instanceof Date) return obj as any;
  if (Array.isArray(obj)) return obj.map(serializeDecimals) as unknown as T;
  if (typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, serializeDecimals(v)])) as unknown as T;
  }
  return obj;
}

// Deduplicated per request, so several actions in one render share one lookup.
const getSessionUserId = cache(async (): Promise<string | null> => {
  const session = await auth()
  return session?.user?.id ?? null
})

const getRoleFor = cache(async (weddingId: string, userId: string): Promise<WeddingRole> => {
  const collab = await prisma.collaborator.findUnique({
    where: { weddingId_userId: { weddingId, userId } },
    select: { role: true },
  })
  return (collab?.role as WeddingRole) || null
})

async function requireUserId() {
  const userId = await getSessionUserId()
  if (!userId) throw new Error("Unauthorized")
  return userId
}

/** Throws unless the caller can read (or, with `write`, edit) the wedding. */
async function requireWeddingAccess(weddingId: string, write = false) {
  const userId = await requireUserId()
  const role = await getRoleFor(weddingId, userId)
  if (!role || (write && role === "viewer")) throw new Error("You don't have access to this wedding")
  return { userId, role }
}

/** Returns false instead of throwing; used by read actions. */
async function canReadWedding(weddingId: string) {
  const userId = await getSessionUserId()
  if (!userId || !weddingId) return false
  return !!(await getRoleFor(weddingId, userId))
}

/** Relation filter limiting a record to weddings the user can edit. */
function editableBy(userId: string): Prisma.WeddingWhereInput {
  return { collaborators: { some: { userId, role: { in: ["owner", "editor"] } } } }
}

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) return null
  return session.user
}

export async function getUserProfile() {
  const userId = await getSessionUserId()
  if (!userId) return null

  return prisma.user.findUnique({ where: { id: userId } })
}

export async function updateUserRole(role: string) {
  const userId = await requireUserId()
  if (role !== "couple" && role !== "planner") throw new Error("Invalid role")

  await prisma.user.update({
    where: { id: userId },
    data: { role },
  })
  revalidatePath("/dashboard")
}

// ============================================
// WEDDING OPERATIONS
// ============================================

export async function getUserWeddingId() {
  const userId = await getSessionUserId()
  if (!userId) return null

  const collab = await prisma.collaborator.findFirst({
    where: { userId },
    select: { weddingId: true },
  })
  return collab?.weddingId ?? null
}

export async function getWeddingById(id: string) {
  if (!(await canReadWedding(id))) return null
  const w = await prisma.wedding.findUnique({ where: { id } })
  return serializeDecimals(w);
}

export async function createWedding(data: {
  coupleName1: string
  coupleName2: string
  weddingDate: string
  styleTheme?: string
}) {
  const userId = await requireUserId()

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14)

  // Nested create keeps the wedding and its owner row in one transaction
  const wedding = await prisma.wedding.create({
    data: {
      createdById: userId,
      coupleName1: data.coupleName1,
      coupleName2: data.coupleName2,
      weddingDate: data.weddingDate ? new Date(data.weddingDate) : null,
      styleTheme: data.styleTheme || "Elegant",
      tier: "free",
      premiumTrialEndsAt: trialEndsAt,
      collaborators: { create: { userId, role: "owner" } },
    },
  })

  return serializeDecimals(wedding)
}

// ============================================
// GUEST OPERATIONS
// ============================================

export async function getGuests(weddingId: string) {
  if (!(await canReadWedding(weddingId))) return []
  return prisma.guest.findMany({
    where: { weddingId },
    orderBy: { createdAt: "desc" },
  })
}

export async function createGuest(weddingId: string, data: any) {
  await requireWeddingAccess(weddingId, true)
  const guest = await prisma.guest.create({
    data: { ...validate(guestCreate, data), weddingId },
  })
  revalidatePath("/dashboard/guests")
  return guest
}

export async function updateGuest(id: string, data: any) {
  const userId = await requireUserId()
  const guest = await prisma.guest.update({
    where: { id, wedding: editableBy(userId) },
    data: validate(guestUpdate, data),
  })
  revalidatePath("/dashboard/guests")
  return guest
}

export async function deleteGuest(id: string) {
  const userId = await requireUserId()
  await prisma.guest.delete({ where: { id, wedding: editableBy(userId) } })
  revalidatePath("/dashboard/guests")
}

export async function deleteGuests(ids: string[]) {
  const userId = await requireUserId()
  await prisma.guest.deleteMany({ where: { id: { in: ids }, wedding: editableBy(userId) } })
  revalidatePath("/dashboard/guests")
}

// ============================================
// BUDGET OPERATIONS
// ============================================

export async function getBudgetItems(weddingId: string) {
  if (!(await canReadWedding(weddingId))) return []
  const items = await prisma.budgetItem.findMany({
    where: { weddingId },
    orderBy: { category: "asc" },
  })
  return serializeDecimals(items);
}

export async function createBudgetItem(weddingId: string, data: any) {
  await requireWeddingAccess(weddingId, true)
  const item = await prisma.budgetItem.create({
    data: { ...validate(budgetItemCreate, data), weddingId },
  })
  revalidatePath("/dashboard/budget")
  return serializeDecimals(item)
}

export async function updateBudgetItem(id: string, data: any) {
  const userId = await requireUserId()
  const item = await prisma.budgetItem.update({
    where: { id, wedding: editableBy(userId) },
    data: validate(budgetItemUpdate, data),
  })
  revalidatePath("/dashboard/budget")
  return serializeDecimals(item)
}

export async function deleteBudgetItem(id: string) {
  const userId = await requireUserId()
  await prisma.budgetItem.delete({ where: { id, wedding: editableBy(userId) } })
  revalidatePath("/dashboard/budget")
}

export async function deleteBudgetItems(ids: string[]) {
  const userId = await requireUserId()
  await prisma.budgetItem.deleteMany({ where: { id: { in: ids }, wedding: editableBy(userId) } })
  revalidatePath("/dashboard/budget")
}

// ============================================
// CHECKLIST OPERATIONS
// ============================================

export async function getChecklistItems(weddingId: string) {
  if (!(await canReadWedding(weddingId))) return []
  return prisma.checklistItem.findMany({
    where: { weddingId },
    orderBy: { dueDate: "asc" },
  })
}

export async function createChecklistItem(weddingId: string, data: any) {
  await requireWeddingAccess(weddingId, true)
  const item = await prisma.checklistItem.create({
    data: { ...validate(checklistItemCreate, data), weddingId },
  })
  revalidatePath("/dashboard/checklist")
  return item
}

export async function updateChecklistItem(id: string, data: any) {
  const userId = await requireUserId()
  const item = await prisma.checklistItem.update({
    where: { id, wedding: editableBy(userId) },
    data: validate(checklistItemUpdate, data),
  })
  revalidatePath("/dashboard/checklist")
  return item
}

export async function deleteChecklistItem(id: string) {
  const userId = await requireUserId()
  await prisma.checklistItem.delete({ where: { id, wedding: editableBy(userId) } })
  revalidatePath("/dashboard/checklist")
}

export async function deleteChecklistItems(ids: string[]) {
  const userId = await requireUserId()
  await prisma.checklistItem.deleteMany({ where: { id: { in: ids }, wedding: editableBy(userId) } })
  revalidatePath("/dashboard/checklist")
}

// ============================================
// VENDOR OPERATIONS
// ============================================

export async function getVendors(weddingId: string) {
  if (!(await canReadWedding(weddingId))) return []
  const vendors = await prisma.vendor.findMany({
    where: { weddingId },
    orderBy: { category: "asc" },
  })
  return serializeDecimals(vendors);
}

export async function createVendor(weddingId: string, data: any) {
  await requireWeddingAccess(weddingId, true)
  const vendor = await prisma.vendor.create({
    data: { ...validate(vendorCreate, data), weddingId },
  })
  revalidatePath("/dashboard/vendors")
  return serializeDecimals(vendor)
}

export async function updateVendor(id: string, data: any) {
  const userId = await requireUserId()
  const vendor = await prisma.vendor.update({
    where: { id, wedding: editableBy(userId) },
    data: validate(vendorUpdate, data),
  })
  revalidatePath("/dashboard/vendors")
  return serializeDecimals(vendor)
}

export async function deleteVendor(id: string) {
  const userId = await requireUserId()
  await prisma.vendor.delete({ where: { id, wedding: editableBy(userId) } })
  revalidatePath("/dashboard/vendors")
}

export async function deleteVendors(ids: string[]) {
  const userId = await requireUserId()
  await prisma.vendor.deleteMany({ where: { id: { in: ids }, wedding: editableBy(userId) } })
  revalidatePath("/dashboard/vendors")
}

export async function insertVendors(weddingId: string, vendors: any[]) {
  await requireWeddingAccess(weddingId, true)
  await prisma.vendor.createMany({
    data: vendors.map((v: any) => ({ ...validate(vendorCreate, v), weddingId })),
  })
  revalidatePath("/dashboard/vendors")
}

// ============================================
// DIRECTORY VENDOR OPERATIONS
// ============================================

export async function getDirectoryVendors() {
  const userId = await getSessionUserId()
  if (!userId) return []

  const vendors = await prisma.directoryVendor.findMany({
    where: { userId },
    orderBy: { companyName: "asc" },
  })
  return serializeDecimals(vendors)
}

export async function createDirectoryVendor(data: any) {
  const userId = await requireUserId()

  const vendor = await prisma.directoryVendor.create({
    data: { ...validate(directoryVendorCreate, data), userId },
  })
  revalidatePath("/dashboard/vendors")
  return serializeDecimals(vendor)
}

export async function updateDirectoryVendor(id: string, data: any) {
  const userId = await requireUserId()
  const vendor = await prisma.directoryVendor.update({
    where: { id, userId },
    data: validate(directoryVendorUpdate, data),
  })
  revalidatePath("/dashboard/vendors")
  return vendor
}

export async function deleteDirectoryVendor(id: string) {
  const userId = await requireUserId()
  await prisma.directoryVendor.delete({ where: { id, userId } })
  revalidatePath("/dashboard/vendors")
}

// ============================================
// INVENTORY OPERATIONS
// ============================================

export async function getInventoryItems(weddingId: string) {
  if (!(await canReadWedding(weddingId))) return []
  const items = await prisma.inventoryItem.findMany({
    where: { weddingId },
    orderBy: { category: "asc" },
  })
  return serializeDecimals(items);
}

export async function createInventoryItem(weddingId: string, data: any) {
  await requireWeddingAccess(weddingId, true)
  const item = await prisma.inventoryItem.create({
    data: { ...validate(inventoryItemCreate, data), weddingId },
  })
  revalidatePath("/dashboard/inventory")
  return serializeDecimals(item)
}

export async function updateInventoryItem(id: string, data: any) {
  const userId = await requireUserId()
  const item = await prisma.inventoryItem.update({
    where: { id, wedding: editableBy(userId) },
    data: validate(inventoryItemUpdate, data),
  })
  revalidatePath("/dashboard/inventory")
  return serializeDecimals(item)
}

export async function deleteInventoryItem(id: string) {
  const userId = await requireUserId()
  await prisma.inventoryItem.delete({ where: { id, wedding: editableBy(userId) } })
  revalidatePath("/dashboard/inventory")
}

// ============================================
// EVENT / ITINERARY OPERATIONS
// ============================================

export async function getEvents(weddingId: string) {
  if (!(await canReadWedding(weddingId))) return []
  return prisma.event.findMany({
    where: { weddingId },
    orderBy: { startTime: "asc" },
  })
}

export async function createEvent(weddingId: string, data: any) {
  await requireWeddingAccess(weddingId, true)
  const event = await prisma.event.create({
    data: { ...validate(eventCreate, data), weddingId },
  })
  revalidatePath("/dashboard/itinerary")
  return event
}

export async function updateEvent(id: string, data: any) {
  const userId = await requireUserId()
  const event = await prisma.event.update({
    where: { id, wedding: editableBy(userId) },
    data: validate(eventUpdate, data),
  })
  revalidatePath("/dashboard/itinerary")
  return event
}

export async function deleteEvent(id: string) {
  const userId = await requireUserId()
  await prisma.event.delete({ where: { id, wedding: editableBy(userId) } })
  revalidatePath("/dashboard/itinerary")
}

export async function deleteEvents(ids: string[]) {
  const userId = await requireUserId()
  await prisma.event.deleteMany({ where: { id: { in: ids }, wedding: editableBy(userId) } })
  revalidatePath("/dashboard/itinerary")
}

// ============================================
// INVITATION OPERATIONS
// ============================================

export async function getInvitations(weddingId: string) {
  try {
    await requireWeddingAccess(weddingId, true)
  } catch {
    return []
  }
  return prisma.invitation.findMany({
    where: { weddingId },
    orderBy: { createdAt: "desc" },
  })
}

export async function createInvitation(weddingId: string, data: { email?: string; role?: string; token?: string }) {
  await requireWeddingAccess(weddingId, true)

  const { effectiveTier } = await getEffectiveTier(weddingId)
  if (effectiveTier === "free") {
    const [members, pending] = await Promise.all([
      prisma.collaborator.count({ where: { weddingId, role: { not: "owner" } } }),
      prisma.invitation.count({ where: { weddingId, accepted: false } }),
    ])
    if (members + pending >= PLAN_LIMITS.free.collaborators) {
      throw new Error("The free plan includes one collaborator. Upgrade to Premium to invite more people.")
    }
  }

  // Invitations can never grant ownership, and the token is generated here so
  // it is unguessable regardless of what the client sends.
  const role = data.role === "viewer" ? "viewer" : "editor"
  const token = randomBytes(24).toString("base64url")

  return prisma.invitation.create({
    data: { weddingId, email: data.email || null, role, token },
  })
}

export async function deleteInvitation(id: string) {
  const userId = await requireUserId()
  await prisma.invitation.delete({ where: { id, wedding: editableBy(userId) } })
}

export async function acceptInvitation(token: string) {
  const userId = await requireUserId()

  const invitation = await prisma.invitation.findUnique({
    where: { token },
  })
  if (!invitation || invitation.accepted) throw new Error("Invalid invitation")

  await prisma.$transaction([
    prisma.collaborator.upsert({
      where: { weddingId_userId: { weddingId: invitation.weddingId, userId } },
      update: {},
      create: {
        weddingId: invitation.weddingId,
        userId,
        role: invitation.role === "viewer" ? "viewer" : "editor",
      },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { accepted: true },
    }),
  ])

  return { weddingId: invitation.weddingId }
}

// ============================================
// FEEDBACK OPERATIONS
// ============================================

export async function submitFeedback(message: string, rating?: number) {
  const userId = await requireUserId()

  return prisma.feedback.create({
    data: {
      userId,
      message: String(message).slice(0, 5000),
      rating,
    },
  })
}

// ============================================
// PUSH SUBSCRIPTION OPERATIONS
// ============================================

export async function savePushSubscription(data: {
  endpoint: string
  p256dh: string
  auth: string
}) {
  const userId = await requireUserId()

  return prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    update: { userId, p256dh: data.p256dh, auth: data.auth },
    create: {
      userId,
      endpoint: data.endpoint,
      p256dh: data.p256dh,
      auth: data.auth,
    },
  })
}

export async function deletePushSubscription(endpoint: string) {
  const userId = await requireUserId()
  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId },
  })
}

// ============================================
// CLIENT OPERATIONS (FOR PLANNERS)
// ============================================

export async function getClients() {
  const userId = await getSessionUserId()
  if (!userId) return []

  const clients = await prisma.client.findMany({
    where: { plannerId: userId },
    orderBy: { createdAt: "desc" },
    include: {
      wedding: {
        select: {
          id: true,
          coupleName1: true,
          coupleName2: true,
          weddingDate: true,
        },
      },
    },
  })
  return serializeDecimals(clients);
}

/** A client may only be linked to a wedding the planner collaborates on. */
async function cleanClientData(userId: string, data: any) {
  const { weddingId, ...rest } = data ?? {}
  const cleaned: Record<string, unknown> = validate(clientUpdate, rest)
  if (weddingId) {
    if (!(await getRoleFor(weddingId, userId))) throw new Error("You don't have access to this wedding")
    cleaned.weddingId = weddingId
  } else if (weddingId === null) {
    cleaned.weddingId = null
  }
  return cleaned
}

export async function createClient(data: any) {
  const userId = await requireUserId()

  const client = await prisma.client.create({
    data: { ...(await cleanClientData(userId, data)), plannerId: userId },
  })
  revalidatePath("/dashboard/clients")
  return serializeDecimals(client)
}

export async function updateClient(id: string, data: any) {
  const userId = await requireUserId()
  const client = await prisma.client.update({
    where: { id, plannerId: userId },
    data: await cleanClientData(userId, data),
  })
  revalidatePath("/dashboard/clients")
  return serializeDecimals(client)
}

export async function updateWedding(id: string, data: any) {
  await requireWeddingAccess(id, true)
  // Plan fields only change through the payment webhook
  const wedding = await prisma.wedding.update({
    where: { id },
    data: validate(weddingUpdate, data),
  })
  revalidatePath("/dashboard/settings")
  revalidatePath("/dashboard")
  return serializeDecimals(wedding)
}

export async function createClientWedding(clientData: {
  name: string
  weddingDate?: string | null
  budget?: number
}) {
  const userId = await requireUserId()

  const nameParts = clientData.name.split(/ and | & /)
  const coupleName1 = nameParts[0]?.trim() || clientData.name
  const coupleName2 = nameParts[1]?.trim() || ''

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14)

  const wedding = await prisma.wedding.create({
    data: {
      createdById: userId,
      coupleName1,
      coupleName2,
      weddingDate: clientData.weddingDate ? new Date(clientData.weddingDate) : null,
      estimatedBudget: clientData.budget || 0,
      currency: 'USD',
      tier: 'free',
      premiumTrialEndsAt: trialEndsAt,
      collaborators: { create: { userId, role: 'owner' } },
    },
  })

  return serializeDecimals(wedding)
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats(weddingId: string) {
  await requireWeddingAccess(weddingId)

  // Aggregate in the database instead of pulling every guest and budget row
  const [
    guestGroups,
    budgetTotals,
    checklistGroups,
    vendorGroups,
    upcomingTasks,
    pendingPayments,
    pendingGuests,
    wedding,
  ] = await Promise.all([
    prisma.guest.groupBy({
      by: ["rsvpStatus"],
      where: { weddingId },
      _count: { _all: true },
      _sum: { companionGuestCount: true },
    }),
    prisma.budgetItem.aggregate({
      where: { weddingId },
      _sum: { estimatedCost: true, paidAmount: true },
    }),
    prisma.checklistItem.groupBy({
      by: ["isCompleted"],
      where: { weddingId },
      _count: { _all: true },
    }),
    prisma.vendor.groupBy({
      by: ["status"],
      where: { weddingId },
      _count: { _all: true },
    }),
    prisma.checklistItem.findMany({
      where: { weddingId, isCompleted: false },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
      take: 5,
    }),
    prisma.budgetItem.findMany({
      where: { weddingId, paidAt: null },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }],
      take: 5,
    }),
    prisma.guest.findMany({
      where: { weddingId, rsvpStatus: "pending" },
      select: { id: true, name: true },
      take: 5,
    }),
    prisma.wedding.findUnique({
      where: { id: weddingId },
      select: { targetGuestCount: true, estimatedBudget: true, currency: true },
    }),
  ])

  const headcount = (status?: string) =>
    guestGroups
      .filter((g) => !status || g.rsvpStatus === status)
      .reduce((acc, g) => acc + g._count._all + (g._sum.companionGuestCount || 0), 0)

  const tasksDone = checklistGroups.find((g) => g.isCompleted)?._count._all || 0
  const tasksTotal = checklistGroups.reduce((acc, g) => acc + g._count._all, 0)
  const vendorsTotal = vendorGroups.reduce((acc, g) => acc + g._count._all, 0)
  const vendorsBooked = vendorGroups
    .filter((g) => g.status === "hired" || g.status === "booked" || g.status === "paid")
    .reduce((acc, g) => acc + g._count._all, 0)

  return serializeDecimals({
    stats: {
      guestCount: headcount(),
      confirmedGuest: headcount("accepted"),
      declinedGuest: headcount("declined"),
      pendingGuest: headcount("pending"),
      targetGuest: wedding?.targetGuestCount || 0,
      totalBudget: Number(budgetTotals._sum.estimatedCost || 0),
      paidBudget: Number(budgetTotals._sum.paidAmount || 0),
      estBudget: Number(wedding?.estimatedBudget || 0),
      currency: wedding?.currency || "USD",
      tasksDone,
      tasksTotal,
      vendorsBooked,
      vendorsTotal,
    },
    upcomingTasks,
    pendingPayments,
    pendingGuests,
  })
}

// ============================================
// USER PROFILE OPERATIONS (for planner settings)
// ============================================

const PROFILE_FIELDS = ["name", "image", "companyName", "logoUrl", "website", "signatureUrl", "brandingColor"] as const

export async function updateUserProfile(data: any) {
  const userId = await requireUserId()

  const allowed = Object.fromEntries(
    Object.entries(data ?? {}).filter(([k]) => (PROFILE_FIELDS as readonly string[]).includes(k))
  )
  const user = await prisma.user.update({
    where: { id: userId },
    data: allowed,
  })
  revalidatePath("/dashboard/settings")
  return user
}

export async function getUserIdFromSession() {
  return getSessionUserId()
}

// ============================================
// COLLABORATOR & TEAM OPERATIONS
// ============================================

export async function getCollaborators(weddingId: string) {
  if (!(await canReadWedding(weddingId))) return []
  return prisma.collaborator.findMany({
    where: { weddingId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
        },
      },
    },
  })
}

export async function deleteCollaborator(weddingId: string, userId: string) {
  const { userId: callerId, role } = await requireWeddingAccess(weddingId)
  // Owners can remove anyone else; everyone can remove themselves
  if (role !== "owner" && callerId !== userId) throw new Error("Only the owner can remove members")

  await prisma.collaborator.deleteMany({
    where: { weddingId, userId, role: { not: "owner" } },
  })
  revalidatePath("/dashboard/settings")
}

// ============================================
// WEDDING DELETE CASCADE
// ============================================

export async function deleteWeddingCascade(weddingId: string) {
  const { role } = await requireWeddingAccess(weddingId, true)
  if (role !== "owner") throw new Error("Only the wedding owner can delete it")

  // Delete all related data in correct order
  await prisma.$transaction([
    prisma.guest.deleteMany({ where: { weddingId } }),
    prisma.budgetItem.deleteMany({ where: { weddingId } }),
    prisma.checklistItem.deleteMany({ where: { weddingId } }),
    prisma.vendor.deleteMany({ where: { weddingId } }),
    prisma.event.deleteMany({ where: { weddingId } }),
    prisma.inventoryItem.deleteMany({ where: { weddingId } }),
    prisma.invitation.deleteMany({ where: { weddingId } }),
    prisma.collaborator.deleteMany({ where: { weddingId } }),
    prisma.wedding.delete({ where: { id: weddingId } }),
  ])

  revalidatePath("/dashboard")
}

// ============================================
// VENDOR NAME LOOKUP (for directory import)
// ============================================

export async function getVendorNames(weddingId: string) {
  if (!(await canReadWedding(weddingId))) return []
  const vendors = await prisma.vendor.findMany({
    where: { weddingId },
    select: { companyName: true },
  })
  return vendors.map((v) => v.companyName).filter(Boolean) as string[]
}

export type WeddingRole = 'owner' | 'editor' | 'viewer' | null;

export async function checkWeddingPermission(weddingId: string): Promise<WeddingRole> {
  const userId = await getSessionUserId()
  if (!userId) return null
  return getRoleFor(weddingId, userId)
}

type WeddingDetails = {
  id: string;
  coupleName1: string;
  coupleName2: string;
  weddingDate: string;
};

export async function getUserWeddings(): Promise<WeddingDetails[]> {
  const userId = await getSessionUserId()
  if (!userId) return [];

  const collabs = await prisma.collaborator.findMany({
    where: { userId },
    select: {
      wedding: { select: { id: true, coupleName1: true, coupleName2: true, weddingDate: true } },
    },
  });

  return collabs.map((c) => ({
    id: c.wedding.id,
    coupleName1: c.wedding.coupleName1,
    coupleName2: c.wedding.coupleName2,
    weddingDate: c.wedding.weddingDate ? c.wedding.weddingDate.toISOString() : '',
  }));
}

// ============================================
// CALENDAR (all weddings the user collaborates on)
// ============================================

export type CalendarEntry = {
  id: string
  title: string
  date: string
  type: "event" | "task" | "payment" | "wedding-date"
  weddingId: string
  weddingName?: string
  time?: string
  isCompleted?: boolean
  isPaid?: boolean
}

const dateOnly = (d: Date) => d.toISOString().slice(0, 10)

/** Wedding dates, events, dated tasks and payment due dates, for one wedding or all of them. */
export async function getCalendarData(weddingId?: string | null) {
  const userId = await getSessionUserId()
  if (!userId) return { weddings: [], items: [] as CalendarEntry[] }

  const collabs = await prisma.collaborator.findMany({
    where: { userId },
    select: { wedding: { select: { id: true, coupleName1: true, coupleName2: true, weddingDate: true } } },
  })
  const weddings = collabs.map(({ wedding: w }) => ({
    id: w.id,
    couple_name: w.coupleName1 && w.coupleName2 ? `${w.coupleName1} & ${w.coupleName2}` : w.coupleName1 || "Unnamed Wedding",
    weddingDate: w.weddingDate,
  }))
  const names = Object.fromEntries(weddings.map((w) => [w.id, w.couple_name]))

  // Only ever query weddings the user belongs to
  const ids = weddingId && names[weddingId] ? [weddingId] : weddings.map((w) => w.id)
  if (ids.length === 0) return { weddings: [], items: [] as CalendarEntry[] }

  const [events, tasks, payments] = await Promise.all([
    prisma.event.findMany({
      where: { weddingId: { in: ids }, startTime: { not: null } },
      select: { id: true, title: true, startTime: true, weddingId: true },
    }),
    prisma.checklistItem.findMany({
      where: { weddingId: { in: ids }, dueDate: { not: null } },
      select: { id: true, title: true, dueDate: true, isCompleted: true, weddingId: true },
    }),
    prisma.budgetItem.findMany({
      where: { weddingId: { in: ids }, dueDate: { not: null } },
      select: { id: true, name: true, dueDate: true, paidAt: true, weddingId: true },
    }),
  ])

  const items: CalendarEntry[] = [
    ...weddings
      .filter((w) => ids.includes(w.id) && w.weddingDate)
      .map((w) => ({
        id: `wed-${w.id}`,
        title: `💍 Wedding Day: ${w.couple_name}`,
        date: dateOnly(w.weddingDate!),
        type: "wedding-date" as const,
        weddingId: w.id,
        weddingName: w.couple_name,
      })),
    ...events.map((e) => ({
      id: `evt-${e.id}`,
      title: e.title,
      date: e.startTime!.toISOString(),
      type: "event" as const,
      weddingId: e.weddingId,
      weddingName: names[e.weddingId],
      time: e.startTime!.toISOString(),
    })),
    ...tasks.map((t) => ({
      id: `tsk-${t.id}`,
      title: t.title,
      date: dateOnly(t.dueDate!),
      type: "task" as const,
      weddingId: t.weddingId,
      weddingName: names[t.weddingId],
      isCompleted: t.isCompleted,
    })),
    ...payments.map((p) => ({
      id: `pay-${p.id}`,
      title: `Payment: ${p.name}`,
      date: dateOnly(p.dueDate!),
      type: "payment" as const,
      weddingId: p.weddingId,
      weddingName: names[p.weddingId],
      isPaid: !!p.paidAt,
    })),
  ]

  return { weddings: weddings.map(({ id, couple_name }) => ({ id, couple_name })), items }
}

// ============================================
// SEARCH (command palette)
// ============================================

export type SearchHit = {
  type: "guest" | "vendor" | "task" | "budget" | "event"
  id: string
  title: string
  subtitle?: string
  href: string
}

export async function searchWedding(weddingId: string, query: string): Promise<SearchHit[]> {
  const q = query.trim()
  if (q.length < 2 || !(await canReadWedding(weddingId))) return []

  const contains = { contains: q, mode: "insensitive" as const }
  const take = 5

  const [guests, vendors, tasks, budget, events] = await Promise.all([
    prisma.guest.findMany({
      where: { weddingId, OR: [{ name: contains }, { email: contains }] },
      select: { id: true, name: true, rsvpStatus: true, tableAssignment: true },
      take,
    }),
    prisma.vendor.findMany({
      where: { weddingId, OR: [{ companyName: contains }, { contactName: contains }, { category: contains }] },
      select: { id: true, companyName: true, category: true, status: true },
      take,
    }),
    prisma.checklistItem.findMany({
      where: { weddingId, title: contains },
      select: { id: true, title: true, isCompleted: true },
      take,
    }),
    prisma.budgetItem.findMany({
      where: { weddingId, OR: [{ name: contains }, { category: contains }] },
      select: { id: true, name: true, category: true },
      take,
    }),
    prisma.event.findMany({
      where: { weddingId, OR: [{ title: contains }, { location: contains }] },
      select: { id: true, title: true, location: true },
      take,
    }),
  ])

  return [
    ...guests.map((g) => ({
      type: "guest" as const,
      id: g.id,
      title: g.name,
      subtitle: [g.rsvpStatus, g.tableAssignment && `Table ${g.tableAssignment}`].filter(Boolean).join(" · "),
      href: "/dashboard/guests",
    })),
    ...vendors.map((v) => ({
      type: "vendor" as const,
      id: v.id,
      title: v.companyName || "Untitled vendor",
      subtitle: [v.category, v.status].filter(Boolean).join(" · "),
      href: "/dashboard/vendors",
    })),
    ...tasks.map((t) => ({
      type: "task" as const,
      id: t.id,
      title: t.title,
      subtitle: t.isCompleted ? "Done" : "To do",
      href: "/dashboard/checklist",
    })),
    ...budget.map((b) => ({
      type: "budget" as const,
      id: b.id,
      title: b.name,
      subtitle: b.category,
      href: "/dashboard/budget",
    })),
    ...events.map((e) => ({
      type: "event" as const,
      id: e.id,
      title: e.title,
      subtitle: e.location || undefined,
      href: "/dashboard/itinerary",
    })),
  ]
}
