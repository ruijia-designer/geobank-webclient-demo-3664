import { afterEach, describe, expect, it } from 'vitest';
import { demoRows } from './baseline';
import { getProjectTypeOptions, projectTypeColor } from './projectClassification';
import { getCategoryProjectTypes } from './resultTypeProjects';
import {
  PROJECT_TYPE_CATALOG_ROWS, getCreationProjectTypeOptions,
  getProjectTypeCatalogRows, saveProjectTypeCatalogRows,
} from './projectTypeCatalog';

afterEach(() => saveProjectTypeCatalogRows(PROJECT_TYPE_CATALOG_ROWS));

describe('基准与新建项目的独立类型目录', () => {
  it('三个一级可直接选择，采集与非地震必须选择二级', () => {
    const options = getCreationProjectTypeOptions();
    expect(options).toHaveLength(14);
    expect(options.filter(option => !option.parentId).map(option => [option.name, option.leaf])).toEqual([
      ['采集', false], ['处理', true], ['解释', true], ['井筒', true], ['非地震', false],
    ]);
    expect(options.filter(option => option.leaf).map(option => option.name)).toEqual([
      '陆上采集', '过渡带采集', 'OBN采集', '拖缆采集',
      '处理', '解释', '井筒', '重力勘探', '磁力勘探', '电法勘探', '化探', '综合物化探',
    ]);
    expect(options.find(option => option.name === 'OBN采集')).toMatchObject({
      path: ['采集', 'OBN采集'], parentId: 'catalog-acquisition', level: 2,
    });
    expect(options.find(option => option.name === '处理')).toMatchObject({
      path: ['处理'], parentId: undefined, level: 1,
    });
  });

  it('基准选色只影响新建选项，旧分类与成果适用项目保持原值', () => {
    const legacy = structuredClone(demoRows.types);
    const associations = getCategoryProjectTypes('acquisition', getProjectTypeOptions());
    saveProjectTypeCatalogRows(getProjectTypeCatalogRows().map(row =>
      row.id === 'catalog-land' ? { ...row, color: '#112233' } : row));
    expect(getCreationProjectTypeOptions().find(option => option.id === 'catalog-land')?.color).toBe('#112233');
    expect(demoRows.types).toEqual(legacy);
    expect(getCategoryProjectTypes('acquisition', getProjectTypeOptions())).toEqual(associations);
    expect(projectTypeColor({ type: '三维陆上常规采集', typeId: '2' })).toBe('#4C92B5');
  });

  it('新节点ID独立于全部旧ID，显示编码保持独立可读', () => {
    const legacyIds = new Set(demoRows.types.map(row => row.id));
    const rows = getProjectTypeCatalogRows();
    expect(rows.every(row => !legacyIds.has(row.id))).toBe(true);
    expect(new Set(rows.map(row => row.id)).size).toBe(rows.length);
    expect(new Set(rows.map(row => row.code)).size).toBe(rows.length);
    expect(rows.find(row => row.id === 'catalog-acquisition')?.code).toBe('1');
    expect(rows.find(row => row.id === 'catalog-processing')?.code).toBe('5');
  });
});
