import { cookies } from "next/headers"
import { resolveRange, type ResolvedRange } from "@/lib/shopify/analytics"

// Reads the global date filter (set from the navbar) so any server page can apply
// the same range. Default: last 30 days.
export async function getGlobalRange(): Promise<{ preset: string; compare: boolean; range: ResolvedRange | null }> {
  const c = await cookies()
  const preset = c.get("g_range")?.value || "30d"
  const compare = c.get("g_compare")?.value === "1"
  const range = resolveRange(preset, new Date())
  return { preset, compare, range }
}
