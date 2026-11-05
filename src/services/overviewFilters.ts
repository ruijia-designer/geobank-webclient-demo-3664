import type { Filters, Project } from '../types';
import { getProjectTypeOptions } from './projectClassification';
import { resultInfoCache } from './results';

export const PROJECT_DIMENSIONS = ['二维', '三维', '二维+三维', '四维'] as const;
type ProjectDimension = typeof PROJECT_DIMENSIONS[number];

function dimensionFromText(value: string | undefined): ProjectDimension | undefined {
  if (!value) return undefined;
  const text = value.normalize('NFKC').toUpperCase().replace(/\s/g, '');
  if (/四维|4D|4维/.test(text)) return '四维';
  const two = /二维|2D|2维/.test(text), three = /三维|3D|3维/.test(text);
  return two && three ? '二维+三维' : two ? '二维' : three ? '三维' : undefined;
}

/** Explicit project metadata takes precedence over a dimension embedded in its type. */
export function projectDimension(project: Project): ProjectDimension | undefined {
  const explicit = dimensionFromText(resultInfoCache[project.id]?.seismicDimension)
    || dimensionFromText(project.dimension);
  if (explicit) return explicit;
  const type = project.typeId ? getProjectTypeOptions().find(option => option.id === project.typeId) : undefined;
  return dimensionFromText((type?.path || project.typePath || []).join('/'))
    || dimensionFromText(project.type);
}

/** Preserve saved filters from the former year checkbox list. */
export function normalizeOverviewFilters(filters: Filters): Filters {
  const next = { ...filters };
  if (next.year?.length && !next.yearFrom?.length && !next.yearTo?.length) {
    const years = next.year.filter(value => /^\d{4}$/.test(value)).sort();
    if (years.length) { next.yearFrom = [years[0]]; next.yearTo = [years.at(-1)!]; }
  }
  delete next.year;
  return next;
}

export function yearRangeError(filters: Filters): string {
  const from = filters.yearFrom?.[0] || '', to = filters.yearTo?.[0] || '';
  if ([from, to].some(value => value && !/^[1-9]\d{3}$/.test(value))) return '请输入四位年份';
  if (from && to && Number(from) > Number(to)) return '起始年度不能晚于结束年度';
  return '';
}

export function matchesOverviewFilters(project: Project, filters: Filters): boolean {
  const from = filters.yearFrom?.[0], to = filters.yearTo?.[0];
  if ((from || to) && (!/^\d{4}$/.test(project.year) || (from && Number(project.year) < Number(from)) || (to && Number(project.year) > Number(to)))) return false;
  if (filters.dimension?.length && !filters.dimension.includes(projectDimension(project) || '')) return false;
  return ['archived', 'basin', 'readable', 'year'].every(key =>
    !filters[key]?.length || filters[key].includes(String(project[key as keyof Project])));
}
