import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Project } from '../types';
import { CURRENT_PROJECT, PROJECTS } from '../services/demo';
import { RelatedProjects } from './RelatedProjects';

function project(overrides: Partial<Project> = {}): Project {
  return { id: 'selected', name: '当前测试项目', year: '2024', basin: '沁水盆地',
    type: '三维陆上常规采集', area: '596', point: [0, 0], readable: true, archived: true, ...overrides };
}

const onOpen = vi.fn();
beforeEach(() => { vi.clearAllMocks(); sessionStorage.removeItem('geobank-demo-locale'); });
afterEach(() => { sessionStorage.removeItem('geobank-demo-locale'); });

describe('成果页关联项目', () => {
  it('当前演示项目保留三条现有样例，不显示演示标签且不修改项目关系', () => {
    const before = JSON.stringify([CURRENT_PROJECT, PROJECTS]);
    render(<RelatedProjects project={CURRENT_PROJECT} projects={PROJECTS} role="admin" onOpen={onOpen}/>);
    expect(screen.getByRole('heading', { name: '关联项目' })).toBeVisible();
    expect(screen.queryByText('演示关联')).not.toBeInTheDocument();
    expect(screen.getByText('3 个项目')).toBeVisible();
    const items = screen.getAllByRole('listitem');
    expect(items.map(item => within(item).getByRole('heading', { level: 2 }).textContent)).toEqual(
      ['1', '4', '2'].map(id => PROJECTS.find(item => item.id === id)!.name));
    expect(screen.getAllByText('可查阅')).toHaveLength(1);
    expect(screen.getAllByText('无权限')).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: /^查阅项目成果：/ })).toHaveLength(1);
    expect(JSON.stringify([CURRENT_PROJECT, PROJECTS])).toBe(before);
  });

  it('普通项目没有显式关联时保留空态，不借同盆地推断关系', () => {
    render(<RelatedProjects project={project()} projects={PROJECTS} role="admin" onOpen={onOpen}/>);
    expect(screen.getByText('暂无关联项目')).toBeVisible();
    expect(screen.queryByText('演示关联')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('显式关系优先于演示样例，排除重复、自身、失效与角色不可见的引用', () => {
    const visible = project({ id: 'published', name: '已归档关联项目' });
    const hidden = project({ id: 'hidden', name: '未归档项目', archived: false });
    const selected = project({ id: 'current', mapDetails: { relatedProjectIds: ['published', 'published', 'current', 'missing', 'hidden'] } });
    const { rerender } = render(<RelatedProjects project={selected} projects={[selected, visible, hidden, ...PROJECTS]} role="ordinary" onOpen={onOpen}/>);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: visible.name })).toBeVisible();
    expect(screen.queryByText(hidden.name)).not.toBeInTheDocument();
    expect(screen.queryByText('演示关联')).not.toBeInTheDocument();
    rerender(<RelatedProjects project={{ ...selected, mapDetails: { relatedProjectIds: ['missing'] } }} projects={PROJECTS} role="admin" onOpen={onOpen}/>);
    expect(screen.getByText('暂无关联项目')).toBeVisible();
    expect(screen.queryByText('演示关联')).not.toBeInTheDocument();
  });

  it('基础摘要展示项目大小，分类来自项目类型而非名称', () => {
    const item = project({ id: 'related', name: '2024年山西省左权西乡煤层气区块三维地震处理项目及成果数据整理', area: '0' });
    const selected = project({ mapDetails: { relatedProjectIds: [item.id] } });
    render(<RelatedProjects project={selected} projects={[item]} role="admin" onOpen={onOpen}/>);
    expect(screen.getByRole('heading', { name: item.name })).toBeVisible();
    expect(screen.getByText('采集', { exact: true })).toHaveStyle({ backgroundColor: '#277DA8', color: '#ffffff' });
    expect(screen.getAllByRole('definition').slice(0, 4).map(node => node.textContent)).toEqual(['2024', '沁水盆地', '三维陆上常规采集', '0']);
    expect(screen.getByRole('heading', { name: '采集参数' })).toBeVisible();
    expect(screen.getByText('大小（km² / km）')).toBeVisible();
  });

  it('无查阅权限时保留项目详情，不显示查阅按钮或空操作栏', () => {
    const item = project({ id: 'restricted', name: '无权限关联项目', readable: false });
    const selected = project({ mapDetails: { relatedProjectIds: [item.id] } });
    const { rerender } = render(<RelatedProjects project={selected} projects={[item]} role="ordinary" onOpen={onOpen}/>);
    expect(screen.getByText('无权限')).toBeVisible();
    expect(screen.getByRole('heading', { name: item.name })).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByRole('listitem').querySelector('footer')).toBeNull();
    rerender(<RelatedProjects project={selected} projects={[item]} role="admin" onOpen={onOpen}/>);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('有查阅权限时显示查阅成果入口，支持键盘打开项目', async () => {
    const user = userEvent.setup();
    const item = project({ id: 'readable', name: '可查阅关联项目' });
    const selected = project({ mapDetails: { relatedProjectIds: [item.id] } });
    render(<RelatedProjects project={selected} projects={[item]} role="ordinary" onOpen={onOpen}/>);
    const button = screen.getByRole('button', { name: '查阅项目成果：' + item.name });
    expect(button).toHaveTextContent('查阅成果');
    expect(button).toBeEnabled();
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalledWith(item);
  });

  it('已有关系中缺失的元数据保留缺省值', () => {
    const item = project({ id: 'missing-fields', year: '', basin: '', area: '' });
    render(<RelatedProjects project={project({ mapDetails: { relatedProjectIds: [item.id] } })} projects={[item]} role="admin" onOpen={onOpen}/>);
    expect(screen.getAllByRole('definition').map(node => node.textContent)).toEqual(['—', '—', '三维陆上常规采集', '—', '—', '—', '—', '—', '—']);
  });

  it.each([
    {
      type: '三维陆上常规采集', title: '采集参数',
      fields: ['总炮数', '覆盖次数', '面元', '最大炮检距', '炮道密度'],
      values: ['550,000', '100 次', '25 m × 25 m', '8 km', '1,000,000'],
    },
    {
      type: '三维陆上处理', title: '处理参数',
      fields: ['总炮数', '原始数据量', '记录长度', '采样率'],
      values: ['550,000', '30.25 TB', '6,000 ms', '2 ms'],
    },
    {
      type: '三维陆上解释', title: '解释参数',
      fields: ['覆盖次数', '面元', '横纵比', '最大炮检距'],
      values: ['100 次', '25 m × 25 m', '0.8', '8 km'],
    },
  ])('$title 只呈现对应项目类型的字段并格式化实际参数', ({ type, title, fields, values }) => {
    const item = project({ id: 'typed-summary', type, mapDetails: {
      fullFoldAreaKm2: 596,
      acquisition: { shotCount: 550000, coverageCount: 100, binSizeMeters: [25, 25], maxOffsetKm: 8, shotTraceDensity: 1000000 },
      processing: { shotCount: 550000, rawDataTb: 30.25, recordLengthMs: 6000, sampleRateMs: 2 },
      interpretation: { coverageCount: 100, binSizeMeters: [25, 25], aspectRatio: 0.8, maxOffsetKm: 8 },
    } });
    render(<RelatedProjects project={project({ mapDetails: { relatedProjectIds: [item.id] } })} projects={[item]} role="admin" onOpen={onOpen}/>);
    expect(screen.getByRole('heading', { name: title })).toBeVisible();
    expect(screen.getAllByRole('term').map(node => node.textContent)).toEqual(['年度', '地区', '类型', '大小（km² / km）', ...fields]);
    expect(screen.getAllByRole('definition').map(node => node.textContent)).toEqual(['2024', '沁水盆地', type, '596', ...values]);
  });

  it('数值为零时保持显示，非有限值和缺失参数显示缺省值', () => {
    const item = project({ id: 'zero-summary', area: '0', type: '三维陆上解释', mapDetails: {
      fullFoldAreaKm2: 0,
      interpretation: { coverageCount: 0, binSizeMeters: [0, 0], aspectRatio: Number.NaN, maxOffsetKm: Number.POSITIVE_INFINITY },
    } });
    render(<RelatedProjects project={project({ mapDetails: { relatedProjectIds: [item.id] } })} projects={[item]} role="admin" onOpen={onOpen}/>);
    expect(screen.getAllByRole('definition').map(node => node.textContent)).toEqual(['2024', '沁水盆地', '三维陆上解释', '0', '0 次', '0 m × 0 m', '—', '—']);
  });

  it('已有概览数据继续用于关联项目摘要，不为缺失的新字段补造数值', () => {
    const item = PROJECTS.find(item => item.id === '0')!;
    render(<RelatedProjects project={project({ mapDetails: { relatedProjectIds: [item.id] } })} projects={[item]} role="admin" onOpen={onOpen}/>);
    expect(screen.getAllByRole('definition').map(node => node.textContent)).toEqual([
      item.year, item.basin, item.type, '596', '550,000', '—', '25 m × 25 m', '8 km', '—',
    ]);
  });
});
