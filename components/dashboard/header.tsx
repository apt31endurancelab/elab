"use client"

import { useEffect, useState } from "react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Badge } from "@/components/ui/badge"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Switch } from "@/components/ui/switch"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

interface DemoUser {
  id: string
  email: string
  user_metadata?: { full_name?: string }
}

const pathLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/shopify": "Shopify Analytics",
  "/dashboard/tasks": "Tareas",
  "/dashboard/affiliates": "Afiliados",
  "/dashboard/affiliates/links": "Enlaces y Códigos",
  "/dashboard/affiliates/commissions": "Comisiones",
  "/dashboard/settings": "Ajustes",
  "/dashboard/settings/access": "Gestión de Acceso",
  "/dashboard/clients": "CRM Clientes",
  "/dashboard/invoices": "Facturas",
  "/dashboard/invoices/calendar": "Calendario Facturas",
  "/dashboard/invoices/new": "Nueva Factura",
}

export function DashboardHeader({ user, isDemo = false }: { user: DemoUser; isDemo?: boolean }) {
  const pathname = usePathname()
  const pageTitle = pathLabels[pathname] || "Dashboard"
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium">{pageTitle}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      
      <div className="ml-auto flex items-center gap-3">
        {mounted && (
          <div className="flex items-center gap-2">
            <Sun className="h-4 w-4 text-muted-foreground" />
            <Switch
              checked={theme === "dark"}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              aria-label="Toggle theme"
            />
            <Moon className="h-4 w-4 text-muted-foreground" />
          </div>
        )}
        {isDemo && (
          <>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
              Modo Demo
            </Badge>
            <Button size="sm" asChild>
              <Link href="/auth/login">Iniciar Sesión</Link>
            </Button>
          </>
        )}
      </div>
    </header>
  )
}
