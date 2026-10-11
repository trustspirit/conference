import type { Project } from '../types'

/** 닫힌 프로젝트인지 (closedAt 이 설정됨). */
export function isProjectClosed(project: Pick<Project, 'closedAt'> | null | undefined): boolean {
  return project?.closedAt != null
}
