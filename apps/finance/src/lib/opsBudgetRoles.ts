import type { ProjectRole } from '../types'
import { can } from './permissions'

/** Roles that see the operations-committee budget tab on the dashboard. */
export function canViewOpsBudgetTab(role: ProjectRole | null): boolean {
  return role ? can(role, 'opsBudget.access') : false
}

/** Roles that see the existing project-overview tab on the dashboard. */
export function canViewProjectOverviewTab(role: ProjectRole | null): boolean {
  return role ? can(role, 'project.viewDashboard') : false
}

/**
 * v1 product decision: every viewer can edit (categories CRUD + inclusion add/remove).
 * Kept as a distinct helper so a future view/edit split is a one-line change.
 */
export function canManageOpsBudget(role: ProjectRole | null): boolean {
  return canViewOpsBudgetTab(role)
}
