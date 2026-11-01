import { getCalendarFeed } from "@/lib/calendar"

/**
 * iCal feed for Google Calendar, Apple Calendar and Outlook subscriptions:
 * /api/calendar/<token>.ics. The token is the only credential, so it is long,
 * random and can be reset from the calendar page.
 */

export const dynamic = "force-dynamic"

const escape = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (c) => `\\${c}`)
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
const day = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "")
const nextDay = (d: Date) => day(new Date(d.getTime() + 86_400_000))

const utf8 = new TextEncoder()

/** Lines longer than 75 octets are folded, as RFC 5545 asks (never inside a character). */
function fold(line: string) {
  const out: string[] = []
  let current = ""
  let bytes = 0
  for (const ch of line) {
    const size = utf8.encode(ch).length
    if (bytes + size > 74) {
      out.push(current)
      current = " "
      bytes = 1
    }
    current += ch
    bytes += size
  }
  out.push(current)
  return out.join("\r\n")
}

type Entry = { uid: string; summary: string; allDay?: Date; start?: Date; end?: Date; location?: string | null; description?: string | null }

function vevent(e: Entry, now: string) {
  const lines = ["BEGIN:VEVENT", `UID:${e.uid}@weddingplanner`, `DTSTAMP:${now}`, `SUMMARY:${escape(e.summary)}`]
  if (e.allDay) {
    lines.push(`DTSTART;VALUE=DATE:${day(e.allDay)}`, `DTEND;VALUE=DATE:${nextDay(e.allDay)}`, "TRANSP:TRANSPARENT")
  } else if (e.start) {
    lines.push(`DTSTART:${stamp(e.start)}`, `DTEND:${stamp(e.end && e.end > e.start ? e.end : new Date(e.start.getTime() + 3_600_000))}`)
  }
  if (e.location) lines.push(`LOCATION:${escape(e.location)}`)
  if (e.description) lines.push(`DESCRIPTION:${escape(e.description)}`)
  lines.push("END:VEVENT")
  return lines.map(fold).join("\r\n")
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const feed = await getCalendarFeed(token.replace(/\.ics$/, ""))
  if (!feed) return new Response("Not found", { status: 404 })

  const { name, multi, weddings, events, tasks, payments } = feed
  const now = stamp(new Date())
  const byId = new Map(weddings.map((w) => [w.id, w]))
  const couple = (id: string) => {
    const w = byId.get(id)
    return w ? [w.coupleName1, w.coupleName2].filter(Boolean).join(" & ") : ""
  }
  // With several weddings in one calendar, say whose each entry is
  const tag = (id: string) => (multi ? ` · ${couple(id)}` : "")
  const money = (id: string, n: number) => `${byId.get(id)?.currency ?? ""} ${Math.round(n).toLocaleString("en")}`.trim()

  const entries: Entry[] = [
    ...weddings
      .filter((w) => w.weddingDate)
      .map((w) => ({ uid: `wedding-${w.id}`, summary: `💍 ${couple(w.id)}'s wedding`, allDay: w.weddingDate!, location: w.location })),
    ...events.map((e) => ({ uid: `event-${e.id}`, summary: `${e.title}${tag(e.weddingId)}`, start: e.startTime!, end: e.endTime ?? undefined, location: e.location, description: e.description })),
    ...tasks.map((t) => ({
      uid: `task-${t.id}`,
      summary: `☐ ${t.title}${tag(t.weddingId)}`,
      allDay: t.dueDate!,
      description: [t.assignee && `Who: ${t.assignee}`, t.notes].filter(Boolean).join("\n") || null,
    })),
    ...payments.map((p) => ({ uid: `payment-${p.id}`, summary: `💸 Pay ${p.title}${p.amount ? `: ${money(p.weddingId, p.amount)}` : ""}${tag(p.weddingId)}`, allDay: p.dueDate })),
  ]

  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Wedding Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${escape(name)}`),
    "X-PUBLISHED-TTL:PT1H",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    ...entries.map((e) => vevent(e, now)),
    "END:VCALENDAR",
    "",
  ].join("\r\n")

  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="wedding.ics"`,
      "Cache-Control": "private, max-age=900",
    },
  })
}
