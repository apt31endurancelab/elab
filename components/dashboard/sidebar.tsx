"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  ShoppingBag,
  CheckSquare,
  Users,
  Link2,
  DollarSign,
  Settings,
  LogOut,
  FlaskConical,
  Building2,
  FileText,
  FilePlus,
  CalendarDays,
  Shield,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { hasAccess } from "@/lib/access/helpers"
import type { Role, UserPermission, SectionKey } from "@/lib/access/types"

interface DemoUser {
  id: string
  email: string
  user_metadata?: { full_name?: string }
}

const navItems = [
  {
    title: "Panel Principal",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, sectionKey: "dashboard" as SectionKey },
      { title: "Shopify Analytics", href: "/dashboard/shopify", icon: ShoppingBag, sectionKey: "shopify" as SectionKey },
    ],
  },
  {
    title: "Gestión",
    items: [
      { title: "Tareas", href: "/dashboard/tasks", icon: CheckSquare, sectionKey: "tasks" as SectionKey },
    ],
  },
  {
    title: "Clientes",
    items: [
      { title: "CRM Clientes", href: "/dashboard/clients", icon: Building2, sectionKey: "clients" as SectionKey },
    ],
  },
  {
    title: "Facturación",
    items: [
      { title: "Facturas", href: "/dashboard/invoices", icon: FileText, sectionKey: "invoices" as SectionKey },
      { title: "Calendario", href: "/dashboard/invoices/calendar", icon: CalendarDays, sectionKey: "invoices/calendar" as SectionKey },
      { title: "Nueva Factura", href: "/dashboard/invoices/new", icon: FilePlus, sectionKey: "invoices/new" as SectionKey },
    ],
  },
  {
    title: "Afiliados",
    items: [
      { title: "Gestionar Afiliados", href: "/dashboard/affiliates", icon: Users, sectionKey: "affiliates" as SectionKey },
      { title: "Enlaces y Códigos", href: "/dashboard/affiliates/links", icon: Link2, sectionKey: "affiliates/links" as SectionKey },
      { title: "Comisiones", href: "/dashboard/affiliates/commissions", icon: DollarSign, sectionKey: "affiliates/commissions" as SectionKey },
    ],
  },
]

const roleLabels: Record<string, string> = {
  superadmin: "Superadmin",
  admin: "Admin",
  viewer: "Viewer",
  affiliate: "Afiliado",
}

export function DashboardSidebar({
  user,
  isDemo = false,
  role = "admin",
  permissions = [],
}: {
  user: DemoUser
  isDemo?: boolean
  role?: Role
  permissions?: UserPermission[]
}) {
  const pathname = usePathname()
  const router = useRouter()

  const handleSignOut = async () => {
    if (!isDemo) {
      const supabase = createClient()
      await supabase.auth.signOut()
    }
    router.push("/auth/login")
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3">
          <img
            src="https://www.endurancelab.cc/cdn/shop/files/elab_white_logo.png?height=36&v=1759948221"
            alt="Endurance Lab"
            className="h-8 w-auto invert dark:invert-0"
          />
          <div className="flex flex-col">
            <span className="font-semibold text-sm">Lactate Pro</span>
            <span className="text-xs text-sidebar-foreground/60">Back Office</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {isDemo && (
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-amber-500/10 border border-amber-500/20">
              <FlaskConical className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-amber-600 dark:text-amber-400">Modo Demo</span>
            </div>
          </div>
        )}
        {navItems.map((group) => {
          const visibleItems = group.items.filter(item =>
            hasAccess(role, permissions, item.sectionKey)
          )
          if (visibleItems.length === 0) return null
          return (
            <SidebarGroup key={group.title}>
              <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {visibleItems.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === item.href}
                      >
                        <Link href={item.href}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )
        })}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-xs font-medium">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.email}</p>
              <p className="text-xs text-sidebar-foreground/60">
                {isDemo ? "Demo" : roleLabels[role] || role}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start text-sidebar-foreground/70"
              asChild
            >
              <Link href="/dashboard/settings">
                <Settings className="h-4 w-4 mr-2" />
                Ajustes
              </Link>
            </Button>
            {role === "superadmin" && (
              <Button
                variant="ghost"
                size="sm"
                className="text-sidebar-foreground/70"
                asChild
              >
                <Link href="/dashboard/settings/access">
                  <Shield className="h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-sidebar-foreground/70"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
