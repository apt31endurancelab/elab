"use client"

import { useCurrency } from "@/components/currency-provider"
import { convertToClp, isCurrencyCode } from "@/lib/currency"

type Props = {
  amount: number | string | null | undefined
  /** Source currency the amount is stored in. Defaults to CLP. */
  from?: string | null
  className?: string
  /** Shown when amount is null/undefined/NaN. Default: "—" */
  fallback?: string
}

/**
 * Renders a monetary amount in the user's selected display currency.
 *
 * - If `from` is omitted (or "CLP"), the amount is treated as CLP and converted
 *   to the user's selected currency.
 * - If `from` is another supported currency (EUR/USD/GBP), the amount is first
 *   converted to CLP, then to the selected currency.
 * - Unknown currency codes fall back to CLP-as-source (no conversion before
 *   display formatting).
 */
export function Money({ amount, from, className, fallback = "—" }: Props) {
  const { format } = useCurrency()
  const n = typeof amount === "string" ? Number(amount) : amount
  if (n === null || n === undefined || Number.isNaN(n)) {
    return <span className={className}>{fallback}</span>
  }
  const source = isCurrencyCode(from) ? from : "CLP"
  const clp = source === "CLP" ? n : convertToClp(n, source)
  return <span className={className}>{format(clp)}</span>
}
