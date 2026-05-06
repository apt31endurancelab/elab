export type CurrencyCode = "CLP" | "EUR" | "USD" | "GBP"

export const CURRENCY_CODES: CurrencyCode[] = ["CLP", "EUR", "USD", "GBP"]

type CurrencyConfig = {
  code: CurrencyCode
  symbol: string
  name: string
  flag: string
  clpRate: number
  decimals: number
  locale: string
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  CLP: {
    code: "CLP",
    symbol: "$",
    name: "Peso chileno",
    flag: "🇨🇱",
    clpRate: 1,
    decimals: 0,
    locale: "es-CL",
  },
  EUR: {
    code: "EUR",
    symbol: "€",
    name: "Euro",
    flag: "🇪🇺",
    clpRate: 1030,
    decimals: 2,
    locale: "es-ES",
  },
  USD: {
    code: "USD",
    symbol: "US$",
    name: "Dólar estadounidense",
    flag: "🇺🇸",
    clpRate: 950,
    decimals: 2,
    locale: "en-US",
  },
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "Libra esterlina",
    flag: "🇬🇧",
    clpRate: 1190,
    decimals: 2,
    locale: "en-GB",
  },
}

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === "string" && (CURRENCY_CODES as string[]).includes(value)
}

export function convertFromClp(clpAmount: number, target: CurrencyCode): number {
  if (target === "CLP") return clpAmount
  return clpAmount / CURRENCIES[target].clpRate
}

export function convertToClp(amount: number, source: CurrencyCode): number {
  if (source === "CLP") return amount
  return amount * CURRENCIES[source].clpRate
}

export function formatCurrency(amount: number, currency: CurrencyCode): string {
  const cfg = CURRENCIES[currency]
  return new Intl.NumberFormat(cfg.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  }).format(amount)
}

/** Format a CLP-stored amount in the given display currency. */
export function formatFromClp(clpAmount: number, displayCurrency: CurrencyCode): string {
  return formatCurrency(convertFromClp(clpAmount, displayCurrency), displayCurrency)
}
