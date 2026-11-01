import "server-only"
import { prisma } from "@/lib/prisma"

/** Scheduled payments, plus due dates on budget lines that have no schedule. */
export async function calendarPayments(weddingIds: string[]) {
  const [payments, items] = await Promise.all([
    prisma.payment.findMany({
      where: { weddingId: { in: weddingIds }, dueDate: { not: null } },
      select: { id: true, label: true, amount: true, dueDate: true, paidAt: true, weddingId: true, budgetItem: { select: { name: true } } },
    }),
    prisma.budgetItem.findMany({
      where: { weddingId: { in: weddingIds }, dueDate: { not: null }, payments: { none: {} } },
      select: { id: true, name: true, dueDate: true, paidAt: true, weddingId: true },
    }),
  ])
  return [
    ...payments.map((p) => ({ id: p.id, title: `${p.budgetItem.name} (${p.label})`, amount: Number(p.amount), dueDate: p.dueDate!, isPaid: !!p.paidAt, weddingId: p.weddingId })),
    ...items.map((b) => ({ id: b.id, title: b.name, amount: null as number | null, dueDate: b.dueDate!, isPaid: !!b.paidAt, weddingId: b.weddingId })),
  ]
}

type FeedWedding = { id: string; coupleName1: string; coupleName2: string; weddingDate: Date | null; location: string | null; currency: string }

/**
 * Everything the subscribe feed shows, looked up by a secret token: a single
 * wedding's token, or a planner's token covering every wedding they're on.
 */
export async function getCalendarFeed(token: string) {
  if (!token || token.length < 20) return null
  const select = { id: true, coupleName1: true, coupleName2: true, weddingDate: true, location: true, currency: true }

  let weddings: FeedWedding[]
  let name: string
  const single = await prisma.wedding.findUnique({ where: { calendarToken: token }, select })
  if (single) {
    weddings = [single]
    name = `${[single.coupleName1, single.coupleName2].filter(Boolean).join(" & ")} wedding`
  } else {
    const user = await prisma.user.findUnique({ where: { calendarToken: token }, select: { id: true, companyName: true, name: true } })
    if (!user) return null
    const collabs = await prisma.collaborator.findMany({ where: { userId: user.id }, select: { wedding: { select } } })
    weddings = collabs.map((c) => c.wedding)
    name = `${user.companyName || user.name || "My"} weddings`
  }

  const ids = weddings.map((w) => w.id)
  const [events, tasks, payments] = await Promise.all([
    prisma.event.findMany({
      where: { weddingId: { in: ids }, startTime: { not: null } },
      select: { id: true, title: true, startTime: true, endTime: true, location: true, description: true, weddingId: true },
    }),
    prisma.checklistItem.findMany({
      where: { weddingId: { in: ids }, isCompleted: false, dueDate: { not: null } },
      select: { id: true, title: true, dueDate: true, notes: true, assignee: true, weddingId: true },
    }),
    calendarPayments(ids),
  ])
  return { name, multi: !single, weddings, events, tasks, payments: payments.filter((p) => !p.isPaid) }
}
