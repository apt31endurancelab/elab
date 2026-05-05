export const SECTION_KEYS = [
  'dashboard',
  'timeline',
  'shopify',
  'tasks',
  'clients',
  'invoices',
  'invoices/calendar',
  'invoices/new',
  'affiliates',
  'affiliates/links',
  'affiliates/commissions',
  'products',
  'stock',
  'suppliers',
  'settings',
] as const

export type SectionKey = (typeof SECTION_KEYS)[number]
export type Role = 'superadmin' | 'admin' | 'viewer' | 'affiliate'

export const SECTION_LABELS: Record<SectionKey, string> = {
  'dashboard': 'Dashboard',
  'timeline': 'Timeline',
  'shopify': 'Shopify Analytics',
  'tasks': 'Tareas',
  'clients': 'CRM Clientes',
  'invoices': 'Facturas',
  'invoices/calendar': 'Calendario Facturas',
  'invoices/new': 'Nueva Factura',
  'affiliates': 'Gestionar Afiliados',
  'affiliates/links': 'Enlaces y Códigos',
  'affiliates/commissions': 'Comisiones',
  'products': 'Productos',
  'stock': 'Stock',
  'suppliers': 'Proveedores',
  'settings': 'Ajustes',
}

export interface UserPermission {
  section_key: SectionKey
  can_write: boolean
}

export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  role: Role
  status: 'active' | 'suspended' | 'invited'
  avatar_url: string | null
  last_sign_in_at: string | null
  invited_by: string | null
  created_at: string
  updated_at: string
}

export interface UserWithPermissions extends UserProfile {
  permissions: UserPermission[]
}
