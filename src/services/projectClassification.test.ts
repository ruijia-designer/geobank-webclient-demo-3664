import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { demoRows } from './baseline';
import { getProjectTypeOptions, projectCardClassification, projectTypeColor, projectTypeLabel } from './projectClassification';

const originalTypes = structuredClone(demoRows.types);
beforeEach(() => { demoRows.types = structuredClone(originalTypes); });
afterEach(() => { demoRows.types = structuredClone(originalTypes); });

describe('地图详情分类层级与配色', () => {
  it('级联选项保留真实父级ID，重名分支的三级类型归属不混淆', () => {
    demoRows.types.push(
      { id: 'duplicate', name: '三维陆上常规采集', parent: '1', level: 2, color: '#abcdef' },
      { id: 'third', name: '三级采集', parent: 'duplicate', level: 3, color: '#123456' },
    );
    const options = getProjectTypeOptions();
    expect(options.find(option => option.id === '1')).toMatchObject({ parentId: undefined, leaf: false });
    expect(options.find(option => option.id === 'duplicate')).toMatchObject({ parentId: '1', leaf: false });
    expect(options.find(option => option.id === 'third')).toMatchObject({
      parentId: 'duplicate', path: ['采集', '三维陆上常规采集', '三级采集'], leaf: true, level: 3,
    });
  });

  it('二级项目采用一级名称和底色、二级色条，保留已有末级颜色语义', () => {
    const project = { type: '三维陆上常规采集', typeId: '2', typePath: ['采集', '三维陆上常规采集'] };
    expect(projectCardClassification(project)).toMatchObject({
      label: '采集', primaryColor: '#277DA8', secondaryColor: '#4C92B5',
    });
    expect(projectTypeColor(project)).toBe('#4C92B5');
    expect(projectTypeLabel(project)).toBe('采集');
  });

  it('优先真实类型 ID，并按 parent ID 识别重名二级节点，三级颜色不替代二级色条', () => {
    demoRows.types.push(
      { id: 'duplicate', name: '三维陆上常规采集', parent: '1', level: 2, color: '#abcdef' },
      { id: 'third', name: '三级采集', parent: 'duplicate', level: 3, color: '#123456' },
    );
    const project = { type: '处理', typeId: 'third', typePath: ['解释'] };
    expect(projectCardClassification(project)).toMatchObject({
      label: '采集', primaryColor: '#277DA8', secondaryColor: '#abcdef',
    });
    expect(projectTypeColor(project)).toBe('#123456');
  });

  it('ID 失效时先匹配完整路径，再匹配旧项目类型名称', () => {
    demoRows.types.push({ id: 'processing-child', name: '常规', parent: '5', color: '#112233' });
    demoRows.types.push({ id: 'acquisition-child', name: '常规', parent: '1', color: '#445566' });
    expect(projectCardClassification({ type: '常规', typeId: 'removed', typePath: ['采集', '常规'] }))
      .toMatchObject({ label: '采集', secondaryColor: '#445566' });
    expect(projectCardClassification({ type: '三维陆上常规采集' }))
      .toMatchObject({ label: '采集', secondaryColor: '#4C92B5' });
  });

  it('叶节点删除后根据保存的完整祖先路径回退二级，二级也删除则回退一级', () => {
    expect(projectCardClassification({ type: '已删除三级', typeId: 'removed', typePath: ['采集', '三维陆上常规采集', '已删除三级'] }))
      .toMatchObject({ label: '采集', primaryColor: '#277DA8', secondaryColor: '#4C92B5' });
    expect(projectCardClassification({ type: '已删除三级', typePath: ['采集', '已删除二级', '已删除三级'] }))
      .toMatchObject({ label: '采集', primaryColor: '#277DA8', secondaryColor: '#277DA8' });
  });

  it('只有一级或旧数据仅含大类关键词时，两处采用对应一级颜色', () => {
    expect(projectCardClassification({ type: '处理', typeId: '5' }))
      .toMatchObject({ label: '处理', primaryColor: '#2B8C82', secondaryColor: '#2B8C82' });
    expect(projectCardClassification({ type: '三维陆上解释' }))
      .toMatchObject({ label: '解释', primaryColor: '#7B6FA6', secondaryColor: '#7B6FA6' });
    expect(projectCardClassification({ type: '非地震井筒参考' })).toMatchObject({ label: '非地震' });
  });

  it('未知分类保留保存路径的根名称或原类型，缺省显示破折号', () => {
    expect(projectCardClassification({ type: '未知末级', typePath: ['自定义根', '未知末级'] }))
      .toMatchObject({ label: '自定义根', primaryColor: '#647C97', secondaryColor: '#647C97' });
    expect(projectCardClassification({ type: '未知类型' })).toMatchObject({ label: '未知类型' });
    expect(projectCardClassification({ type: '' })).toMatchObject({ label: '—' });
  });

  it('每次读取当前基准名称和颜色，分类标签文字统一为白色', () => {
    const project = { type: '三维陆上常规采集', typeId: '2' };
    const root = demoRows.types.find(type => type.id === '1')!;
    const secondary = demoRows.types.find(type => type.id === '2')!;
    root.name = '采集更新'; root.color = '#fff'; secondary.color = '#fedcba';
    expect(projectCardClassification(project)).toEqual({
      label: '采集更新', primaryColor: '#fff', secondaryColor: '#fedcba', textColor: '#ffffff',
    });
    root.color = '#000000';
    expect(projectCardClassification(project).textColor).toBe('#ffffff');
    root.color = '#777777';
    expect(projectCardClassification(project).textColor).toBe('#ffffff');
  });

  it('无效配置颜色采用现有中性色，避免生成不可用背景或文字颜色', () => {
    demoRows.types.find(type => type.id === '1')!.color = 'invalid';
    demoRows.types.find(type => type.id === '2')!.color = '';
    expect(projectCardClassification({ type: '三维陆上常规采集', typeId: '2' }))
      .toMatchObject({ primaryColor: '#647C97', secondaryColor: '#647C97', textColor: '#ffffff' });
  });
});
