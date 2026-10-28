import type { AppState, Route } from '../types';
import { canRead, projectOptions, resolveProject } from './demo';

export function resolveResultsEntry(state: AppState, route: Route): Route | null {
  if (route.page !== 'results') return route;
  // A requested project must never silently become a different project.
  if (route.projectId !== undefined) {
    const project = resolveProject(state, route.projectId);
    return project && canRead(project, state.role) ? route : null;
  }
  const current = resolveProject(state);
  const project = current && canRead(current, state.role)
    ? current
    : projectOptions(state).find(item => canRead(item, state.role));
  return project ? { ...route, projectId: project.id } : { page: 'results' };
}
