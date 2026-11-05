import { afterEach, describe, expect, it } from 'vitest';
import { createProject, PROJECTS } from './demo';
import { projectLayer } from './mapView';
import { projectBriefSummary } from './projectBriefSummary';
import { projectCardClassification, projectTypeColor, projectTypeLabel } from './projectClassification';
import { getCreationProjectTypeOptions, getProjectTypeCatalogRows, saveProjectTypeCatalogRows } from './projectTypeCatalog';

const originalCatalogue = structuredClone(getProjectTypeCatalogRows());
afterEach(() => saveProjectTypeCatalogRows(originalCatalogue));

function createWithType(name: string) {
  const option = getCreationProjectTypeOptions().find(type => type.name === name)!;
  return createProject('新类型项目', option.name, { basin: '沁水盆地', typeId: option.id, typePath: option.path });
}

describe('新类型接入既有项目读取流程', () => {
  it('新项目保留新类型路径和配色，配置选色不会连带修改旧项目或旧项目显示', () => {
    const existingProjects = structuredClone(PROJECTS);
    const legacyViews = PROJECTS.map(project => ({
      color: projectTypeColor(project), classification: projectCardClassification(project),
      label: projectTypeLabel(project), layer: projectLayer(project.type, project.typePath),
      summary: projectBriefSummary(project, text => text),
    }));
    saveProjectTypeCatalogRows(getProjectTypeCatalogRows().map(row =>
      row.id === 'catalog-land' ? { ...row, color: '#112233' } : row));
    const project = createWithType('陆上采集');
    expect(project).toMatchObject({ type: '陆上采集', typePath: ['采集', '陆上采集'] });
    expect(projectTypeColor(project)).toBe('#112233');
    expect(projectCardClassification(project)).toMatchObject({ label: '采集', secondaryColor: '#112233' });
    expect(projectBriefSummary(project, text => text).parameterTitle).toBe('采集参数');
    expect(PROJECTS).toEqual(existingProjects);
    expect(PROJECTS.map(project => ({
      color: projectTypeColor(project), classification: projectCardClassification(project),
      label: projectTypeLabel(project), layer: projectLayer(project.type, project.typePath),
      summary: projectBriefSummary(project, text => text),
    }))).toEqual(legacyViews);
  });

  it('新类型沿用现有大类读取规则，不把非地震末级错误归为井筒', () => {
    const nonseismic = createWithType('化探');
    expect(projectLayer(nonseismic.type, nonseismic.typePath)).toBe('非地震');
    expect(projectTypeLabel(nonseismic)).toBe('非地震');
    const processing = createWithType('处理');
    expect(processing.typePath).toEqual(['处理']);
    expect(projectBriefSummary(processing, text => text).parameterTitle).toBe('处理参数');
    expect(projectLayer(processing.type, processing.typePath)).toBe('处理');
  });
});
