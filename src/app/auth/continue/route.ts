import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PLANNER_ROLES = new Set(["planner", "vendor", "pro"]);

/** Accept only same-site paths, so `next` can't send people to another site. */
function safeNext(raw: string | null, origin: string): string | null {
    if (!raw) return null;
    try {
        const url = new URL(raw, origin);
        if (url.origin !== origin) return null;
        const path = url.pathname + url.search;
        // These are the default destinations or auth pages; let the role logic decide instead
        if (["/", "/dashboard", "/login"].includes(url.pathname) || url.pathname.startsWith("/auth")) return null;
        return path;
    } catch {
        return null;
    }
}

/**
 * Single place that decides where a user lands after signing in:
 * pending invite → the invite page, planners → their client overview,
 * couples without a wedding → onboarding, everyone else → the dashboard.
 */
export async function GET(request: NextRequest) {
    const url = new URL(request.url);
    const go = (path: string) => NextResponse.redirect(new URL(path, url.origin));

    const session = await auth();
    const userId = session?.user?.id;
    if (!userId) return go("/login");

    const invite = url.searchParams.get("invite");
    if (invite) return go(`/invite/${encodeURIComponent(invite)}`);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, _count: { select: { collaborators: true, clients: true } } },
    });
    if (!user) return go("/login?error=AccountMissing");

    // Apply the role picked on the sign-up screen, but only to a fresh account,
    // so an existing user can't be switched by revisiting sign-up.
    let role = user.role;
    const requestedRole = url.searchParams.get("role");
    const isFresh = user._count.collaborators === 0 && user._count.clients === 0;
    if ((requestedRole === "couple" || requestedRole === "planner") && isFresh && requestedRole !== role) {
        await prisma.user.update({ where: { id: userId }, data: { role: requestedRole } });
        role = requestedRole;
    }

    const next = safeNext(url.searchParams.get("next"), url.origin);
    if (next) return go(next);

    if (PLANNER_ROLES.has(role)) return go("/dashboard"); // shows the planner overview
    if (user._count.collaborators === 0) return go("/onboarding");
    return go("/dashboard");
}
