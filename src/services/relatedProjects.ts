import type { Project, Role } from '../types';
import { visibleProjects } from './demo';

export const RELATED_PROJECTS_STORAGE_KEY = 'geobank-results-related-projects-v1';
const DEMO_RELATED_IDS = ['1', '4', '2'];
type RelatedProjectRecords = Record<string, string[]>;

function uniqueOtherIds(ids: string[], projectId: string): string[] {
  return [...new Set(ids.filter(id => typeof id === 'string' && id.length > 0 && id !== projectId))];
}

function readRecords(): RelatedProjectRecords {
  const raw = sessionStorage.getItem(RELATED_PROJECTS_STORAGE_KEY);
  if (!raw) return {};
  let stored: unknown;
  try { stored = JSON.parse(raw); } catch { return {}; }
  if (!stored || typeof stored !== 'object' || !('version' in stored) || stored.version !== 1 || !('byProjectId' in stored)) return {};
  const records = stored.byProjectId;
  if (!records || typeof records !== 'object' || Array.isArray(records)) return {};
  return Object.fromEntries(Object.entries(records).filter((entry): entry is [string, string[]] =>
    Array.isArray(entry[1]) && entry[1].every(id => typeof id === 'string')));
}

function effectiveIds(project: Project, projects: Project[], role: Role, records: RelatedProjectRecords): string[] {
  // A saved empty array is an intentional empty state, not a request for samples.
  if (Object.prototype.hasOwnProperty.call(records, project.id)) return uniqueOtherIds(records[project.id], project.id);
  const explicitIds = project.mapDetails?.relatedProjectIds || [];
  if (project.id !== 'current' || explicitIds.length > 0) return uniqueOtherIds(explicitIds, project.id);
  const availableIds = new Set(visibleProjects(projects, role).filter(item => item.id !== project.id).map(item => item.id));
  return [...new Set([...DEMO_RELATED_IDS, ...availableIds])].filter(id => availableIds.has(id)).slice(0, 3);
}

export function getRelatedProjectIds(project: Project, projects: Project[], role: Role): string[] {
  let records: RelatedProjectRecords;
  try { records = readRecords(); } catch { records = {}; }
  return effectiveIds(project, projects, role, records);
}

export function saveRelatedProjectIds(
  project: Project, projects: Project[], role: Role, mode: 'add' | 'edit', selectedIds: string[],
): string[] {
  // This storage belongs only to the results association module. Never update
  // the shared Project/mapDetails objects consumed by the overview map.
  const records = readRecords();
  const currentIds = effectiveIds(project, projects, role, records);
  const availableIds = new Set(visibleProjects(projects, role).filter(item => item.id !== project.id).map(item => item.id));
  const selected = uniqueOtherIds(selectedIds, project.id).filter(id => availableIds.has(id));
  const retained = mode === 'add' ? currentIds : currentIds.filter(id => !availableIds.has(id));
  const next = uniqueOtherIds([...retained, ...selected], project.id);
  // Let storage failures reach the dialog so it keeps the draft and reports an error.
  sessionStorage.setItem(RELATED_PROJECTS_STORAGE_KEY, JSON.stringify({
    version: 1, byProjectId: { ...records, [project.id]: next },
  }));
  return next;
}
