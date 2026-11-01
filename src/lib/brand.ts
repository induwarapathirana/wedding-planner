import "server-only"
import { prisma } from "@/lib/prisma"

export type PlannerBrand = { name: string; logoUrl: string | null; color: string | null; website: string | null }

const PLANNER_ROLES = ["planner", "vendor", "pro"]

/** Google Drive share links don't render as images; point them at the image host instead. */
export function imageUrl(url: string | null) {
  if (!url) return null
  if (url.includes("drive.google.com") && url.includes("/file/d/")) {
    return `https://lh3.googleusercontent.com/d/${url.split("/file/d/")[1].split("/")[0]}`
  }
  return /^https?:\/\//i.test(url) ? url : null
}

/**
 * The planner behind a wedding, for showing their branding to the couple and
 * guests: the planner whose client record links to it, else a planner
 * collaborating on it. Null for weddings couples plan on their own.
 */
export async function getPlannerBrand(weddingId: string): Promise<PlannerBrand | null> {
  const select = { companyName: true, name: true, logoUrl: true, brandingColor: true, website: true, role: true }
  const viaClient = await prisma.client.findFirst({ where: { weddingId }, select: { planner: { select } }, orderBy: { createdAt: "asc" } })
  let planner = viaClient?.planner && PLANNER_ROLES.includes(viaClient.planner.role) ? viaClient.planner : null
  if (!planner) {
    const collab = await prisma.collaborator.findFirst({
      where: { weddingId, role: { in: ["owner", "editor"] }, user: { role: { in: PLANNER_ROLES } } },
      select: { user: { select } },
    })
    planner = collab?.user ?? null
  }
  if (!planner) return null
  const name = planner.companyName || planner.name
  if (!name) return null
  return {
    name,
    logoUrl: imageUrl(planner.logoUrl),
    color: /^#[0-9a-f]{6}$/i.test(planner.brandingColor) && planner.brandingColor.toLowerCase() !== "#000000" ? planner.brandingColor : null,
    website: planner.website && /^https?:\/\//i.test(planner.website) ? planner.website : planner.website ? `https://${planner.website}` : null,
  }
}
