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

/** Everything the subscribe feed shows, looked up by the wedding's secret token. */
export async function getCalendarFeed(token: string) {
  if (!token || token.length < 20) return null
  const wedding = await prisma.wedding.findUnique({
    where: { calendarToken: token },
    select: { id: true, coupleName1: true, coupleName2: true, weddingDate: true, location: true, currency: true },
  })
  if (!wedding) return null
  const [events, tasks, payments] = await Promise.all([
    prisma.event.findMany({
      where: { weddingId: wedding.id, startTime: { not: null } },
      select: { id: true, title: true, startTime: true, endTime: true, location: true, description: true },
    }),
    prisma.checklistItem.findMany({
      where: { weddingId: wedding.id, isCompleted: false, dueDate: { not: null } },
      select: { id: true, title: true, dueDate: true, notes: true, assignee: true },
    }),
    calendarPayments([wedding.id]),
  ])
  return { wedding, events, tasks, payments: payments.filter((p) => !p.isPaid) }
}
