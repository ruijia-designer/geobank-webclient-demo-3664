import { normalizeBaselineOrder } from './baseline';
import type { BaselineRow } from './baseline';
import type { ProjectTypeOption } from './projectClassification';

/** The revised catalogue is scoped to baseline maintenance and new-project creation.
 * Legacy project classifications and result-type associations keep their own IDs. */
export const PROJECT_TYPE_CATALOG_ROWS: BaselineRow[] = [
  { id: 'catalog-acquisition', code: '1', name: '采集', color: '#277DA8', level: 1 },
  { id: 'catalog-land', code: '2', name: '陆上采集', color: '#4C92B5', parent: 'catalog-acquisition', level: 2 },
  { id: 'catalog-transition', code: '17', name: '过渡带采集', color: '#277DA8', parent: 'catalog-acquisition', level: 2 },
  { id: 'catalog-seabed', code: '18', name: 'OBN采集', color: '#277DA8', parent: 'catalog-acquisition', level: 2 },
  { id: 'catalog-streamer', code: '19', name: '拖缆采集', color: '#277DA8', parent: 'catalog-acquisition', level: 2 },
  { id: 'catalog-processing', code: '5', name: '处理', color: '#2B8C82', level: 1 },
  { id: 'catalog-interpretation', code: '6', name: '解释', color: '#7B6FA6', level: 1 },
  { id: 'catalog-wellbore', code: '7', name: '井筒', color: '#B38439', level: 1 },
  { id: 'catalog-nonseismic', code: '8', name: '非地震', color: '#647C97', level: 1 },
  { id: 'catalog-gravity', code: '13', name: '重力勘探', color: '#71869E', parent: 'catalog-nonseismic', level: 2 },
  { id: 'catalog-magnetic', code: '14', name: '磁力勘探', color: '#7E8FA5', parent: 'catalog-nonseismic', level: 2 },
  { id: 'catalog-electrical', code: '20', name: '电法勘探', color: '#647C97', parent: 'catalog-nonseismic', level: 2 },
  { id: 'catalog-geochemical', code: '21', name: '化探', color: '#647C97', parent: 'catalog-nonseismic', level: 2 },
  { id: 'catalog-integrated', code: '22', name: '综合物化探', color: '#647C97', parent: 'catalog-nonseismic', level: 2 },
];

let catalogueRows = normalizeBaselineOrder('types', PROJECT_TYPE_CATALOG_ROWS);

export function getProjectTypeCatalogRows(): BaselineRow[] {
  return catalogueRows;
}

export function saveProjectTypeCatalogRows(rows: BaselineRow[]): BaselineRow[] {
  catalogueRows = normalizeBaselineOrder('types', rows);
  return catalogueRows;
}

export function getCreationProjectTypeOptions(): ProjectTypeOption[] {
  const rows = getProjectTypeCatalogRows();
  return rows.map(row => {
    const path: string[] = [], visited = new Set<string>();
    let current: BaselineRow | undefined = row;
    while (current && !visited.has(current.id)) {
      visited.add(current.id);
      path.unshift(current.name);
      current = rows.find(parent => parent.id === current!.parent);
    }
    return {
      id: row.id, name: row.name, path,
      parentId: rows.some(parent => parent.id === row.parent) ? row.parent : undefined,
      color: String(row.color || '#647C97'), level: path.length,
      leaf: !rows.some(child => child.parent === row.id),
    };
  });
}
