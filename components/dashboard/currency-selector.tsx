"use client"

import { useCurrency } from "@/components/currency-provider"
import { CURRENCIES, CURRENCY_CODES, type CurrencyCode } from "@/lib/currency"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function CurrencySelector() {
  const { currency, setCurrency } = useCurrency()
  const active = CURRENCIES[currency]

  return (
    <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
      <SelectTrigger
        className="h-8 gap-1.5 rounded-lg border-white/10 bg-white/[0.02] px-2.5 text-xs font-medium hover:bg-white/[0.05]"
        aria-label="Cambiar moneda"
      >
        <SelectValue>
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true">{active.flag}</span>
            <span>{active.code}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="end" className="min-w-[180px]">
        {CURRENCY_CODES.map((code) => {
          const c = CURRENCIES[code]
          return (
            <SelectItem key={code} value={code} className="text-xs">
              <span className="mr-2" aria-hidden="true">{c.flag}</span>
              <span className="font-medium">{c.code}</span>
              <span className="ml-2 text-muted-foreground">{c.name}</span>
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
