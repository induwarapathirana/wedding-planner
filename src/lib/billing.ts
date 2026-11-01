import "server-only"
import { prisma } from "@/lib/prisma"
import { FREE_ACTIVE_WEDDINGS, PRO_PRICE } from "@/lib/plans"

/**
 * Planner Pro: prices, trial, grace period and what a free planner can do.
 * Every Pro check goes through `getPlannerPlan`, on the server.
 */

export const PRICES = {
  planner_pro: PRO_PRICE,
  wedding_premium: 990,
} as const
export const CURRENCY = "LKR"

export const TRIAL_DAYS = 30
export const GRACE_DAYS = 7
export { FREE_ACTIVE_WEDDINGS }

const DAY = 86_400_000
const PLANNER_ROLES = ["planner", "vendor", "pro"]

export type PlannerPlan = {
  isPlanner: boolean
  isPro: boolean
  /** Why they have Pro, or why not */
  state: "trial" | "active" | "grace" | "cancelled_until_end" | "free" | "not_planner"
  trialEndsAt: string | null
  proUntil: string | null
  graceUntil: string | null
  interval: string | null
  status: string | null
  activeWeddings: number
  freeLimit: number
}

type UserPlanFields = {
  role: string
  plan: string
  planStatus: string | null
  planInterval: string | null
  proUntil: Date | null
  proTrialEndsAt: Date | null
}

export function planFor(user: UserPlanFields, activeWeddings = 0, now = new Date()): PlannerPlan {
  const isPlanner = PLANNER_ROLES.includes(user.role)
  const trialLive = !!user.proTrialEndsAt && user.proTrialEndsAt > now
  const paidLive = !!user.proUntil && user.proUntil > now
  const graceUntil = user.proUntil ? new Date(user.proUntil.getTime() + GRACE_DAYS * DAY) : null
  // A failed renewal keeps Pro for the grace period; a cancellation keeps it to the end of the paid period
  const inGrace = !paidLive && user.planStatus === "past_due" && !!graceUntil && graceUntil > now

  let state: PlannerPlan["state"]
  if (!isPlanner) state = "not_planner"
  else if (paidLive) state = user.planStatus === "cancelled" ? "cancelled_until_end" : "active"
  else if (inGrace) state = "grace"
  else if (trialLive) state = "trial"
  else state = "free"

  return {
    isPlanner,
    isPro: isPlanner && (paidLive || inGrace || trialLive),
    state,
    trialEndsAt: user.proTrialEndsAt?.toISOString() ?? null,
    proUntil: user.proUntil?.toISOString() ?? null,
    graceUntil: inGrace ? graceUntil!.toISOString() : null,
    interval: user.planInterval,
    status: user.planStatus,
    activeWeddings,
    freeLimit: FREE_ACTIVE_WEDDINGS,
  }
}

const PLAN_SELECT = { role: true, plan: true, planStatus: true, planInterval: true, proUntil: true, proTrialEndsAt: true } as const

/** Client weddings still being planned: linked to a client and not yet past. */
export async function countActiveClientWeddings(userId: string) {
  const today = new Date(new Date().toISOString().slice(0, 10))
  return prisma.client.count({
    where: {
      plannerId: userId,
      weddingId: { not: null },
      status: { notIn: ["completed", "lost"] },
      OR: [{ wedding: { weddingDate: null } }, { wedding: { weddingDate: { gte: today } } }],
    },
  })
}

export async function getPlannerPlan(userId: string): Promise<PlannerPlan | null> {
  const [user, activeWeddings] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: PLAN_SELECT }),
    countActiveClientWeddings(userId),
  ])
  return user ? planFor(user, activeWeddings) : null
}

export async function isProPlanner(userId: string) {
  return (await getPlannerPlan(userId))?.isPro ?? false
}

/** Throws a friendly error for Pro-only features. */
export async function requirePro(userId: string, feature: string) {
  if (!(await isProPlanner(userId))) throw new Error(`${feature} is part of Planner Pro. Upgrade in Billing to use it.`)
}

/** Throws when a free planner already has the maximum number of client weddings in progress. */
export async function assertCanAddClientWedding(userId: string) {
  const plan = await getPlannerPlan(userId)
  if (!plan?.isPlanner || plan.isPro) return
  if (plan.activeWeddings >= FREE_ACTIVE_WEDDINGS) {
    throw new Error(`The free plan covers ${FREE_ACTIVE_WEDDINGS} client weddings at a time. Upgrade to Planner Pro in Billing for unlimited weddings.`)
  }
}

/** New planners get a free trial once. */
export async function startTrialIfNeeded(userId: string) {
  await prisma.user.updateMany({
    where: { id: userId, proTrialEndsAt: null, role: { in: PLANNER_ROLES } },
    data: { proTrialEndsAt: new Date(Date.now() + TRIAL_DAYS * DAY) },
  })
}

/** When a payment for a Pro period starts or renews, extend the paid-through date. */
export function nextPaidUntil(current: Date | null, interval: string, reportedNext?: string | null) {
  const fromPayHere = reportedNext && /^\d{4}-\d{2}-\d{2}/.test(reportedNext) ? new Date(`${reportedNext.slice(0, 10)}T23:59:59Z`) : null
  if (fromPayHere && fromPayHere > new Date()) return fromPayHere
  const base = current && current > new Date() ? current : new Date()
  const next = new Date(base)
  if (interval === "year") next.setUTCFullYear(next.getUTCFullYear() + 1)
  else next.setUTCMonth(next.getUTCMonth() + 1)
  return next
}
