import { Role, SectionKey, UserPermission, SECTION_KEYS } from './types'

export function hasAccess(
  role: Role,
  permissions: UserPermission[],
  sectionKey: SectionKey
): boolean {
  if (role === 'superadmin') return true
  // If no permissions configured yet, admin gets full access
  if (permissions.length === 0 && role === 'admin') return true
  return permissions.some(p => p.section_key === sectionKey)
}

export function canWrite(
  role: Role,
  permissions: UserPermission[],
  sectionKey: SectionKey
): boolean {
  if (role === 'superadmin') return true
  if (role === 'viewer') return false
  const perm = permissions.find(p => p.section_key === sectionKey)
  return perm?.can_write ?? false
}

export function getDefaultPermissions(role: Role): UserPermission[] {
  if (role === 'superadmin') {
    return SECTION_KEYS.map(k => ({ section_key: k, can_write: true }))
  }
  if (role === 'viewer') {
    return [{ section_key: 'dashboard', can_write: false }]
  }
  // admin default: all sections, writable
  return SECTION_KEYS.map(k => ({ section_key: k, can_write: true }))
}
