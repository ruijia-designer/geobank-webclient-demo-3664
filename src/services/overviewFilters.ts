import type { Filters, Project } from '../types';

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
  return ['archived', 'basin', 'readable', 'year'].every(key =>
    !filters[key]?.length || filters[key].includes(String(project[key as keyof Project])));
}
