"use server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// ============================================
// AUTH HELPERS
// ============================================

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) return null
  return session.user
}

export async function getUserProfile() {
  const session = await auth()
  if (!session?.user?.id) return null

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  })
  return user
}

export async function updateUserRole(role: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role },
  })
  revalidatePath("/dashboard")
}

// ============================================
// WEDDING OPERATIONS
// ============================================

export async function getUserWeddingId() {
  const session = await auth()
  if (!session?.user?.id) return null

  const collab = await prisma.collaborator.findFirst({
    where: { userId: session.user.id },
    select: { weddingId: true },
  })
  return collab?.weddingId ?? null
}

export async function getWeddingById(id: string) {
  return prisma.wedding.findUnique({ where: { id } })
}

export async function createWedding(data: {
  coupleName1: string
  coupleName2: string
  weddingDate: string
  styleTheme?: string
}) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14)

  const wedding = await prisma.wedding.create({
    data: {
      createdById: session.user.id,
      coupleName1: data.coupleName1,
      coupleName2: data.coupleName2,
      weddingDate: data.weddingDate ? new Date(data.weddingDate) : null,
      styleTheme: data.styleTheme || "Elegant",
      tier: "free",
      premiumTrialEndsAt: trialEndsAt,
    },
  })

  // Add creator as owner collaborator
  await prisma.collaborator.create({
    data: {
      weddingId: wedding.id,
      userId: session.user.id,
      role: "owner",
    },
  })

  return wedding
}

// ============================================
// GUEST OPERATIONS
// ============================================

export async function getGuests(weddingId: string) {
  return prisma.guest.findMany({
    where: { weddingId },
    orderBy: { createdAt: "desc" },
  })
}

export async function createGuest(weddingId: string, data: any) {
  const guest = await prisma.guest.create({
    data: { weddingId, ...data },
  })
  revalidatePath("/dashboard/guests")
  return guest
}

export async function updateGuest(id: string, data: any) {
  const guest = await prisma.guest.update({
    where: { id },
    data,
  })
  revalidatePath("/dashboard/guests")
  return guest
}

export async function deleteGuest(id: string) {
  await prisma.guest.delete({ where: { id } })
  revalidatePath("/dashboard/guests")
}

export async function deleteGuests(ids: string[]) {
  await prisma.guest.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/dashboard/guests")
}

// ============================================
// BUDGET OPERATIONS
// ============================================

export async function getBudgetItems(weddingId: string) {
  return prisma.budgetItem.findMany({
    where: { weddingId },
    orderBy: { dueDate: "asc" },
  })
}

export async function createBudgetItem(weddingId: string, data: any) {
  const item = await prisma.budgetItem.create({
    data: { weddingId, ...data },
  })
  revalidatePath("/dashboard/budget")
  return item
}

export async function updateBudgetItem(id: string, data: any) {
  const item = await prisma.budgetItem.update({
    where: { id },
    data,
  })
  revalidatePath("/dashboard/budget")
  return item
}

export async function deleteBudgetItem(id: string) {
  await prisma.budgetItem.delete({ where: { id } })
  revalidatePath("/dashboard/budget")
}

export async function deleteBudgetItems(ids: string[]) {
  await prisma.budgetItem.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/dashboard/budget")
}

// ============================================
// CHECKLIST OPERATIONS
// ============================================

export async function getChecklistItems(weddingId: string) {
  return prisma.checklistItem.findMany({
    where: { weddingId },
    orderBy: { dueDate: "asc" },
  })
}

export async function createChecklistItem(weddingId: string, data: any) {
  const item = await prisma.checklistItem.create({
    data: { weddingId, ...data },
  })
  revalidatePath("/dashboard/checklist")
  return item
}

export async function updateChecklistItem(id: string, data: any) {
  const item = await prisma.checklistItem.update({
    where: { id },
    data,
  })
  revalidatePath("/dashboard/checklist")
  return item
}

export async function deleteChecklistItem(id: string) {
  await prisma.checklistItem.delete({ where: { id } })
  revalidatePath("/dashboard/checklist")
}

export async function deleteChecklistItems(ids: string[]) {
  await prisma.checklistItem.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/dashboard/checklist")
}

// ============================================
// VENDOR OPERATIONS
// ============================================

export async function getVendors(weddingId: string) {
  return prisma.vendor.findMany({
    where: { weddingId },
    orderBy: { createdAt: "desc" },
  })
}

export async function createVendor(weddingId: string, data: any) {
  const vendor = await prisma.vendor.create({
    data: { weddingId, ...data },
  })
  revalidatePath("/dashboard/vendors")
  return vendor
}

export async function updateVendor(id: string, data: any) {
  const vendor = await prisma.vendor.update({
    where: { id },
    data,
  })
  revalidatePath("/dashboard/vendors")
  return vendor
}

export async function deleteVendor(id: string) {
  await prisma.vendor.delete({ where: { id } })
  revalidatePath("/dashboard/vendors")
}

export async function deleteVendors(ids: string[]) {
  await prisma.vendor.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/dashboard/vendors")
}

export async function insertVendors(weddingId: string, vendors: any[]) {
  await prisma.vendor.createMany({
    data: vendors.map((v: any) => ({ weddingId, ...v })),
  })
  revalidatePath("/dashboard/vendors")
}

// ============================================
// DIRECTORY VENDOR OPERATIONS
// ============================================

export async function getDirectoryVendors() {
  const session = await auth()
  if (!session?.user?.id) return []

  return prisma.directoryVendor.findMany({
    where: { userId: session.user.id },
    orderBy: { companyName: "asc" },
  })
}

export async function createDirectoryVendor(data: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const vendor = await prisma.directoryVendor.create({
    data: { userId: session.user.id, ...data },
  })
  revalidatePath("/dashboard/vendors")
  return vendor
}

export async function updateDirectoryVendor(id: string, data: any) {
  const vendor = await prisma.directoryVendor.update({
    where: { id },
    data,
  })
  revalidatePath("/dashboard/vendors")
  return vendor
}

export async function deleteDirectoryVendor(id: string) {
  await prisma.directoryVendor.delete({ where: { id } })
  revalidatePath("/dashboard/vendors")
}

// ============================================
// INVENTORY OPERATIONS
// ============================================

export async function getInventoryItems(weddingId: string) {
  return prisma.inventoryItem.findMany({
    where: { weddingId },
    orderBy: { createdAt: "desc" },
  })
}

export async function createInventoryItem(weddingId: string, data: any) {
  const item = await prisma.inventoryItem.create({
    data: { weddingId, ...data },
  })
  revalidatePath("/dashboard/inventory")
  return item
}

export async function updateInventoryItem(id: string, data: any) {
  const item = await prisma.inventoryItem.update({
    where: { id },
    data,
  })
  revalidatePath("/dashboard/inventory")
  return item
}

export async function deleteInventoryItem(id: string) {
  await prisma.inventoryItem.delete({ where: { id } })
  revalidatePath("/dashboard/inventory")
}

// ============================================
// EVENT / ITINERARY OPERATIONS
// ============================================

export async function getEvents(weddingId: string) {
  return prisma.event.findMany({
    where: { weddingId },
    orderBy: { startTime: "asc" },
  })
}

export async function createEvent(weddingId: string, data: any) {
  const event = await prisma.event.create({
    data: { weddingId, ...data },
  })
  revalidatePath("/dashboard/itinerary")
  return event
}

export async function updateEvent(id: string, data: any) {
  const event = await prisma.event.update({
    where: { id },
    data,
  })
  revalidatePath("/dashboard/itinerary")
  return event
}

export async function deleteEvent(id: string) {
  await prisma.event.delete({ where: { id } })
  revalidatePath("/dashboard/itinerary")
}

export async function deleteEvents(ids: string[]) {
  await prisma.event.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/dashboard/itinerary")
}

// ============================================
// INVITATION OPERATIONS
// ============================================

export async function getInvitations(weddingId: string) {
  return prisma.invitation.findMany({
    where: { weddingId },
    orderBy: { createdAt: "desc" },
  })
}

export async function createInvitation(weddingId: string, data: any) {
  return prisma.invitation.create({
    data: { weddingId, ...data },
  })
}

export async function deleteInvitation(id: string) {
  await prisma.invitation.delete({ where: { id } })
}

export async function acceptInvitation(token: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const invitation = await prisma.invitation.findUnique({
    where: { token },
  })
  if (!invitation) throw new Error("Invalid invitation")

  // Add user as collaborator
  await prisma.collaborator.upsert({
    where: {
      weddingId_userId: {
        weddingId: invitation.weddingId,
        userId: session.user.id,
      },
    },
    update: {},
    create: {
      weddingId: invitation.weddingId,
      userId: session.user.id,
      role: invitation.role || "editor",
    },
  })

  // Mark invitation as accepted
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { accepted: true },
  })

  return { weddingId: invitation.weddingId }
}

// ============================================
// FEEDBACK OPERATIONS
// ============================================

export async function submitFeedback(message: string, rating?: number) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return prisma.feedback.create({
    data: {
      userId: session.user.id,
      message,
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
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  return prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    update: { p256dh: data.p256dh, auth: data.auth },
    create: {
      userId: session.user.id,
      ...data,
    },
  })
}

export async function deletePushSubscription(endpoint: string) {
  await prisma.pushSubscription.deleteMany({
    where: { endpoint },
  })
}

// ============================================
// CLIENT OPERATIONS (FOR PLANNERS)
// ============================================

export async function getClients() {
  const session = await auth()
  if (!session?.user?.id) return []

  return prisma.client.findMany({
    where: { plannerId: session.user.id },
    orderBy: { createdAt: "desc" },
  })
}

export async function createClient(data: any) {
  const session = await auth()
  if (!session?.user?.id) throw new Error("Unauthorized")

  const client = await prisma.client.create({
    data: { plannerId: session.user.id, ...data },
  })
  revalidatePath("/dashboard/clients")
  return client
}

// ============================================
// DASHBOARD STATS
// ============================================

export async function getDashboardStats(weddingId: string) {
  const [guests, budgetItems, upcomingTasks, pendingPayments, pendingGuests, wedding] =
    await Promise.all([
      prisma.guest.findMany({
        where: { weddingId },
        select: { rsvpStatus: true, companionGuestCount: true },
      }),
      prisma.budgetItem.findMany({
        where: { weddingId },
        select: { estimatedCost: true },
      }),
      prisma.checklistItem.findMany({
        where: { weddingId, isCompleted: false },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      prisma.budgetItem.findMany({
        where: { weddingId, paidAt: null },
        orderBy: { dueDate: "asc" },
        take: 5,
      }),
      prisma.guest.findMany({
        where: { weddingId, rsvpStatus: "pending" },
        take: 5,
      }),
      prisma.wedding.findUnique({
        where: { id: weddingId },
        select: { targetGuestCount: true, estimatedBudget: true, currency: true },
      }),
    ])

  const guestCount = guests.reduce(
    (acc, g) => acc + 1 + (g.companionGuestCount || 0),
    0
  )
  const confirmedGuest = guests
    .filter((g) => g.rsvpStatus === "accepted")
    .reduce((acc, g) => acc + 1 + (g.companionGuestCount || 0), 0)
  const pendingGuestCount = guests
    .filter((g) => g.rsvpStatus === "pending")
    .reduce((acc, g) => acc + 1 + (g.companionGuestCount || 0), 0)
  const totalBudget = budgetItems.reduce(
    (acc, item) => acc + Number(item.estimatedCost),
    0
  )

  return {
    stats: {
      guestCount,
      confirmedGuest,
      pendingGuest: pendingGuestCount,
      targetGuest: wedding?.targetGuestCount || 0,
      totalBudget,
      estBudget: Number(wedding?.estimatedBudget || 0),
      currency: wedding?.currency || "USD",
    },
    upcomingTasks,
    pendingPayments,
    pendingGuests,
  }
}
