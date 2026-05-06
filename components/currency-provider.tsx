"use client"

import { createContext, useContext, useEffect, useState } from "react"
import {
  CURRENCIES,
  formatFromClp,
  isCurrencyCode,
  type CurrencyCode,
} from "@/lib/currency"

type CurrencyContextValue = {
  currency: CurrencyCode
  setCurrency: (c: CurrencyCode) => void
  /** Format a CLP-stored amount in the user's selected display currency. */
  format: (clpAmount: number) => string
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

const STORAGE_KEY = "endurancelab_currency"

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("CLP")

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (isCurrencyCode(stored)) setCurrencyState(stored)
    } catch {}
  }, [])

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c)
    try {
      localStorage.setItem(STORAGE_KEY, c)
    } catch {}
  }

  const format = (clpAmount: number) => formatFromClp(clpAmount, currency)

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, format }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext)
  if (ctx) return ctx
  // Fallback for components rendered outside the provider (SSR-safe default)
  const fallback = CURRENCIES.CLP
  return {
    currency: "CLP",
    setCurrency: () => {},
    format: (n: number) =>
      new Intl.NumberFormat(fallback.locale, {
        style: "currency",
        currency: "CLP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(n),
  }
}
