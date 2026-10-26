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

/** Map-card identity uses the top-level label and the second-level accent. */
export function projectCardClassification(project: Pick<Project, 'type'|'typeId'|'typePath'>): {
  label: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: '#ffffff';
} {
  const types = getProjectTypeOptions(), rows = demoRows.types;
  const path = project.typePath || [];
  const matchesPath = (type: ProjectTypeOption, candidate: string[]) =>
    type.path.length === candidate.length && type.path.every((name, index) => name === candidate[index]);
  let selected = types.find(type => type.id === project.typeId)
    || types.find(type => matchesPath(type, path))
    || types.find(type => type.name === project.type);

  // A saved project can outlive a deleted leaf; retain its nearest known ancestor.
  for (let length = path.length - 1; !selected && length > 0; length--) {
    selected = types.find(type => matchesPath(type, path.slice(0, length)));
  }
  if (!selected) {
    const roots = ['非地震', '采集', '处理', '解释', '井筒'];
    const root = roots.find(name => path[0]?.includes(name))
      || roots.find(name => project.type.includes(name));
    selected = types.find(type => type.level === 1 && type.name === root);
  }

  // Follow IDs instead of looking up names, which can repeat in different branches.
  const ancestors: typeof rows = [], visited = new Set<string>();
  let current = rows.find(row => row.id === selected?.id);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    ancestors.unshift(current);
    current = rows.find(row => row.id === current!.parent);
  }
  const root = ancestors[0], secondary = ancestors[1] || root;
  const color = (value: unknown) => typeof value === 'string' && /^#[\da-f]{3}(?:[\da-f]{3})?$/i.test(value)
    ? value : '#647C97';
  const primaryColor = color(root?.color), secondaryColor = color(secondary?.color);
  return {
    label: root?.name || path[0] || project.type || '—',
    primaryColor,
    secondaryColor,
    textColor: '#ffffff',
  };
}
