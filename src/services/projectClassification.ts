import type { Project } from '../types';
import { demoRows } from './baseline';

export interface ProjectTypeOption {
  id: string;
  name: string;
  path: string[];
  color: string;
  level: number;
  leaf: boolean;
}

/** Read the editable baseline cache, so changes are available when creating the next project. */
export function getProjectTypeOptions(): ProjectTypeOption[] {
  const rows = demoRows.types;
  return rows.map(row => {
    const path: string[] = [], visited = new Set<string>();
    let current: typeof row | undefined = row;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      path.unshift(current.name);
      current = rows.find(parent => parent.id === current!.parent);
    }
    return { id: row.id, name: row.name, path, color: String(row.color || '#647C97'),
      level: path.length, leaf: !rows.some(child => child.parent === row.id) };
  });
}

export function getBasinOptions(): string[] {
  return demoRows.structure.filter(row => row.type === '盆地' || (!row.parent && row.level === 1))
    .map(row => row.name);
}

export function projectTypeColor(project: Pick<Project, 'type'|'typeId'|'typePath'>): string {
  const types = getProjectTypeOptions();
  const selected = types.find(type => type.id === project.typeId)
    || types.find(type => type.path.join('/') === project.typePath?.join('/'))
    || types.find(type => type.name === project.type);
  if (selected) return selected.color;
  const roots = ['采集', '处理', '解释', '井筒', '非地震'];
  const root = roots.find(name => project.typePath?.[0]?.includes(name))
    || roots.find(name => project.type.includes(name));
  return types.find(type => type.level === 1 && type.name === root)?.color || '#647C97';
}

/** Short display label only; retain the project's stored leaf type and color. */
export function projectTypeLabel(project: Pick<Project, 'type'|'typeId'|'typePath'>): string {
  const types = getProjectTypeOptions();
  const path = types.find(type => type.id === project.typeId)?.path || project.typePath || [];
  const roots = ['非地震', '采集', '处理', '解释', '井筒'];
  return roots.find(name => path[0]?.includes(name))
    || roots.find(name => project.type.includes(name))
    || path[0] || project.type;
}
