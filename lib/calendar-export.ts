// Minimal ICS (RFC 5545) builder for invoice/task events. We build all-day VEVENTs because
// most items here are tied to a date, not a time-of-day.

type IcsEvent = {
  uid: string
  date: string // YYYY-MM-DD
  summary: string
  description?: string
}

function pad(n: number) { return String(n).padStart(2, "0") }

function toIcsDate(date: string): string {
  // YYYY-MM-DD -> YYYYMMDD
  return date.replace(/-/g, "")
}

function nowStamp(): string {
  const d = new Date()
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
}

function addDays(date: string, days: number): string {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;")
}

export function buildIcs(events: IcsEvent[], calendarName = "Endurance Lab"): string {
  const stamp = nowStamp()
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Endurance Lab//Calendar//ES",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ]
  for (const ev of events) {
    const start = toIcsDate(ev.date)
    const end = toIcsDate(addDays(ev.date, 1)) // all-day events use exclusive DTEND next day
    lines.push("BEGIN:VEVENT")
    lines.push(`UID:${ev.uid}`)
    lines.push(`DTSTAMP:${stamp}`)
    lines.push(`DTSTART;VALUE=DATE:${start}`)
    lines.push(`DTEND;VALUE=DATE:${end}`)
    lines.push(`SUMMARY:${escapeText(ev.summary)}`)
    if (ev.description) lines.push(`DESCRIPTION:${escapeText(ev.description)}`)
    lines.push("END:VEVENT")
  }
  lines.push("END:VCALENDAR")
  return lines.join("\r\n")
}

export function downloadIcs(content: string, filename: string) {
  if (typeof window === "undefined") return
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
