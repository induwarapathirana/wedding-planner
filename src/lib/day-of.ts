import "server-only"
import { prisma } from "@/lib/prisma"
import { getPlannerBrand } from "@/lib/brand"

/** The run of show and vendor contacts for the shared day-of link, looked up by its secret token. */
export async function getDayOf(token: string) {
  if (!token || token.length < 16) return null
  const wedding = await prisma.wedding.findUnique({
    where: { dayOfToken: token },
    select: { id: true, coupleName1: true, coupleName2: true, weddingDate: true, location: true },
  })
  if (!wedding) return null
  const [events, vendors, planner] = await Promise.all([
    prisma.event.findMany({
      where: { weddingId: wedding.id, startTime: { not: null } },
      orderBy: { startTime: "asc" },
      select: { id: true, title: true, startTime: true, endTime: true, location: true, category: true, notes: true, description: true },
    }),
    prisma.vendor.findMany({
      where: { weddingId: wedding.id, status: "hired" },
      orderBy: { category: "asc" },
      select: { id: true, companyName: true, contactName: true, category: true, phone: true },
    }),
    getPlannerBrand(wedding.id),
  ])
  return {
    couple: [wedding.coupleName1, wedding.coupleName2].filter(Boolean).join(" & "),
    weddingDate: wedding.weddingDate?.toISOString().slice(0, 10) ?? null,
    location: wedding.location,
    events: events.map((e) => ({ ...e, startTime: e.startTime!.toISOString(), endTime: e.endTime?.toISOString() ?? null })),
    vendors,
    planner,
  }
}
