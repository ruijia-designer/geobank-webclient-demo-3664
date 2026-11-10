import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Project } from '../types';
import { CURRENT_PROJECT, PROJECTS } from '../services/demo';
import { RelatedProjects } from './RelatedProjects';
import { RELATED_PROJECTS_STORAGE_KEY } from '../services/relatedProjects';
import { LanguageProvider } from '../i18n';

function project(overrides: Partial<Project> = {}): Project {
  return { id: 'selected', name: '当前测试项目', year: '2024', basin: '沁水盆地',
    type: '三维陆上常规采集', area: '596', point: [0, 0], readable: true, archived: true, ...overrides };
}

const onOpen = vi.fn();
const onNotify = vi.fn();
beforeEach(() => { vi.clearAllMocks(); sessionStorage.removeItem('geobank-demo-locale'); sessionStorage.removeItem(RELATED_PROJECTS_STORAGE_KEY); });
afterEach(() => { vi.restoreAllMocks(); sessionStorage.removeItem('geobank-demo-locale'); sessionStorage.removeItem(RELATED_PROJECTS_STORAGE_KEY); });

describe('成果页关联项目', () => {
  it('当前演示项目保留三条现有样例，不显示演示标签且不修改项目关系', () => {
    const before = JSON.stringify([CURRENT_PROJECT, PROJECTS]);
    render(<RelatedProjects project={CURRENT_PROJECT} projects={PROJECTS} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
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
    render(<RelatedProjects project={project()} projects={PROJECTS} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    expect(screen.getByText('暂无关联项目')).toBeVisible();
    expect(screen.queryByText('演示关联')).not.toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('显式关系优先于演示样例，排除重复、自身、失效与角色不可见的引用', () => {
    const visible = project({ id: 'published', name: '已归档关联项目' });
    const hidden = project({ id: 'hidden', name: '未归档项目', archived: false });
    const selected = project({ id: 'current', mapDetails: { relatedProjectIds: ['published', 'published', 'current', 'missing', 'hidden'] } });
    const { rerender } = render(<RelatedProjects project={selected} projects={[selected, visible, hidden, ...PROJECTS]} role="ordinary" onOpen={onOpen} onNotify={onNotify}/>);
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: visible.name })).toBeVisible();
    expect(screen.queryByText(hidden.name)).not.toBeInTheDocument();
    expect(screen.queryByText('演示关联')).not.toBeInTheDocument();
    rerender(<RelatedProjects project={{ ...selected, mapDetails: { relatedProjectIds: ['missing'] } }} projects={PROJECTS} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    expect(screen.getByText('暂无关联项目')).toBeVisible();
    expect(screen.queryByText('演示关联')).not.toBeInTheDocument();
  });

  it('基础摘要展示项目大小，分类来自项目类型而非名称', () => {
    const item = project({ id: 'related', name: '2024年山西省左权西乡煤层气区块三维地震处理项目及成果数据整理', area: '0' });
    const selected = project({ mapDetails: { relatedProjectIds: [item.id] } });
    render(<RelatedProjects project={selected} projects={[item]} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    expect(screen.getByRole('heading', { name: item.name })).toBeVisible();
    expect(screen.getByText('采集', { exact: true })).toHaveStyle({ backgroundColor: '#277DA8', color: '#ffffff' });
    expect(screen.getAllByRole('definition').slice(0, 4).map(node => node.textContent)).toEqual(['2024', '沁水盆地', '三维陆上常规采集', '0']);
    expect(screen.getByRole('heading', { name: '采集参数' })).toBeVisible();
    expect(screen.getByText('大小(km² / km)')).toBeVisible();
  });

  it('无查阅权限时保留项目详情，不显示查阅按钮或空操作栏', () => {
    const item = project({ id: 'restricted', name: '无权限关联项目', readable: false });
    const selected = project({ mapDetails: { relatedProjectIds: [item.id] } });
    const { rerender } = render(<RelatedProjects project={selected} projects={[item]} role="ordinary" onOpen={onOpen} onNotify={onNotify}/>);
    expect(screen.getByText('无权限')).toBeVisible();
    expect(screen.getByRole('heading', { name: item.name })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^查阅项目成果：/ })).not.toBeInTheDocument();
    expect(screen.getByRole('listitem').querySelector('footer')).toBeNull();
    rerender(<RelatedProjects project={selected} projects={[item]} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    expect(screen.queryByRole('button', { name: /^查阅项目成果：/ })).not.toBeInTheDocument();
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('有查阅权限时显示查阅成果入口，支持键盘打开项目', async () => {
    const user = userEvent.setup();
    const item = project({ id: 'readable', name: '可查阅关联项目' });
    const selected = project({ mapDetails: { relatedProjectIds: [item.id] } });
    render(<RelatedProjects project={selected} projects={[item]} role="ordinary" onOpen={onOpen} onNotify={onNotify}/>);
    const button = screen.getByRole('button', { name: '查阅项目成果：' + item.name });
    expect(button).toHaveTextContent('查阅成果');
    expect(button).toBeEnabled();
    for (let step = 0; step < 3 && document.activeElement !== button; step++) await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onOpen).toHaveBeenCalledWith(item);
  });

  it('已有关系中缺失的元数据保留缺省值', () => {
    const item = project({ id: 'missing-fields', year: '', basin: '', area: '' });
    render(<RelatedProjects project={project({ mapDetails: { relatedProjectIds: [item.id] } })} projects={[item]} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
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
    render(<RelatedProjects project={project({ mapDetails: { relatedProjectIds: [item.id] } })} projects={[item]} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    expect(screen.getByRole('heading', { name: title })).toBeVisible();
    expect(screen.getAllByRole('term').map(node => node.textContent)).toEqual(['年度', '地区', '类型', '大小(km² / km)', ...fields]);
    expect(screen.getAllByRole('definition').map(node => node.textContent)).toEqual(['2024', '沁水盆地', type, '596', ...values]);
  });

  it('数值为零时保持显示，非有限值和缺失参数显示缺省值', () => {
    const item = project({ id: 'zero-summary', area: '0', type: '三维陆上解释', mapDetails: {
      fullFoldAreaKm2: 0,
      interpretation: { coverageCount: 0, binSizeMeters: [0, 0], aspectRatio: Number.NaN, maxOffsetKm: Number.POSITIVE_INFINITY },
    } });
    render(<RelatedProjects project={project({ mapDetails: { relatedProjectIds: [item.id] } })} projects={[item]} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    expect(screen.getAllByRole('definition').map(node => node.textContent)).toEqual(['2024', '沁水盆地', '三维陆上解释', '0', '0 次', '0 m × 0 m', '—', '—']);
  });

  it('已有概览数据继续用于关联项目摘要，不为缺失的新字段补造数值', () => {
    const item = PROJECTS.find(item => item.id === '0')!;
    render(<RelatedProjects project={project({ mapDetails: { relatedProjectIds: [item.id] } })} projects={[item]} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    expect(screen.getAllByRole('definition').map(node => node.textContent)).toEqual([
      item.year, item.basin, item.type, '596', '550,000', '—', '25 m × 25 m', '8 km', '—',
    ]);
  });
});


describe('统一管理关联关系', () => {
  it('只有一个管理入口，空态和已有关系均可打开，撤回勾选变化后禁用保存', async () => {
    const user = userEvent.setup();
    const selected = project();
    const item = project({ id: 'candidate', name: '可关联项目' });
    const view = render(<RelatedProjects project={selected} projects={[selected, item]} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: '管理关联' })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: '建立关联关系' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '编辑关联' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '管理关联' }));
    const emptyDialog = within(screen.getByRole('dialog', { name: '管理关联' }));
    const checkbox = emptyDialog.getByRole('checkbox', { name: '选择项目：' + item.name });
    expect(checkbox).not.toBeChecked();
    expect(emptyDialog.getByRole('button', { name: '保存' })).toBeDisabled();
    await user.click(checkbox);
    expect(emptyDialog.getByRole('button', { name: '保存' })).toBeEnabled();
    await user.click(checkbox);
    expect(emptyDialog.getByRole('button', { name: '保存' })).toBeDisabled();
    await user.click(emptyDialog.getByRole('button', { name: '取消' }));
    view.rerender(<RelatedProjects project={{ ...selected, mapDetails: { relatedProjectIds: [item.id] } }} projects={[selected, item]} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    expect(screen.getAllByRole('button', { name: '管理关联' })).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: '管理关联' }));
    const linkedDialog = within(screen.getByRole('dialog', { name: '管理关联' }));
    expect(linkedDialog.getByRole('checkbox', { name: '选择项目：' + item.name })).toBeChecked();
    expect(linkedDialog.getByRole('checkbox', { name: '选择项目：' + item.name })).toBeEnabled();
    expect(linkedDialog.getByRole('button', { name: '保存' })).toBeDisabled();
    expect(onNotify).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(RELATED_PROJECTS_STORAGE_KEY)).toBeNull();
  });

  it('预选三条样例且允许调整，批量追加不修改共享项目对象', async () => {
    const user = userEvent.setup();
    const before = JSON.stringify([CURRENT_PROJECT, PROJECTS]);
    render(<RelatedProjects project={CURRENT_PROJECT} projects={[CURRENT_PROJECT, ...PROJECTS]} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    await user.click(screen.getByRole('button', { name: '管理关联' }));
    const dialog = within(screen.getByRole('dialog', { name: '管理关联' }));
    expect(dialog.getByRole('button', { name: '保存' })).toBeDisabled();
    for (const id of ['1', '4', '2']) {
      const item = PROJECTS.find(entry => entry.id === id)!;
      const checkbox = dialog.getByRole('checkbox', { name: '选择项目：' + item.name });
      expect(checkbox).toBeChecked();
      expect(checkbox).toBeEnabled();
    }
    const first = PROJECTS.find(item => item.id === '0')!;
    const second = PROJECTS.find(item => item.id === '3')!;
    const search = dialog.getByRole('searchbox', { name: '搜索项目名称' });
    await user.type(search, first.name);
    await user.click(dialog.getByRole('checkbox', { name: '选择项目：' + first.name }));
    await user.clear(search);
    await user.type(search, second.name);
    await user.click(dialog.getByRole('checkbox', { name: '选择项目：' + second.name }));
    expect(dialog.getByText('已选 5 个项目')).toBeVisible();
    await user.click(dialog.getByRole('button', { name: '保存' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('5 个项目')).toBeVisible();
    expect(onNotify).toHaveBeenCalledExactlyOnceWith('关联关系已保存');
    expect(screen.queryByText('关联关系已保存')).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByRole('heading', { name: first.name })).toBeVisible();
    expect(screen.getByRole('heading', { name: second.name })).toBeVisible();
    expect(JSON.stringify([CURRENT_PROJECT, PROJECTS])).toBe(before);
    await user.click(screen.getByRole('button', { name: '管理关联' }));
    const reopened = within(screen.getByRole('dialog'));
    expect(reopened.getByRole('checkbox', { name: '选择项目：' + first.name })).toBeChecked();
    expect(reopened.getByRole('checkbox', { name: '选择项目：' + first.name })).toBeEnabled();
    expect(reopened.getByRole('button', { name: '保存' })).toBeDisabled();
  });

  it('项目类型与名称搜索取交集，各状态均排除本项目，清空筛选可恢复候选', async () => {
    const user = userEvent.setup();
    const selected = project({ type: '三维陆上处理', name: '山西当前项目' });
    const acquisition = project({ id: 'acquisition', name: '山西采集测试', type: '三维陆上常规采集' });
    const processing = project({ id: 'processing', name: '山西处理测试', type: '三维陆上处理' });
    const other = project({ id: 'other', name: '新疆处理测试', type: '三维陆上处理' });
    render(<RelatedProjects project={selected} projects={[selected, acquisition, processing, other]} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    await user.click(screen.getByRole('button', { name: '管理关联' }));
    const dialog = within(screen.getByRole('dialog'));
    const selfName = '选择项目：' + selected.name;
    expect(dialog.queryByRole('checkbox', { name: selfName })).not.toBeInTheDocument();
    expect(dialog.getAllByRole('checkbox')).toHaveLength(3);
    await user.click(dialog.getByRole('combobox', { name: '项目类型' }));
    await user.click(within(screen.getByRole('listbox', { name: '项目类型' })).getByRole('option', { name: '处理' }));
    expect(dialog.getAllByRole('checkbox')).toHaveLength(2);
    expect(dialog.queryByRole('checkbox', { name: selfName })).not.toBeInTheDocument();
    const search = dialog.getByRole('searchbox', { name: '搜索项目名称' });
    await user.type(search, '山西');
    expect(dialog.getAllByRole('checkbox')).toHaveLength(1);
    expect(dialog.getByRole('checkbox', { name: '选择项目：' + processing.name })).toBeVisible();
    await user.clear(search);
    await user.type(search, selected.name);
    expect(dialog.queryByRole('checkbox', { name: selfName })).not.toBeInTheDocument();
    expect(dialog.queryAllByRole('checkbox')).toHaveLength(0);
    expect(dialog.getByText('未找到匹配项目')).toBeVisible();
    await user.click(dialog.getByRole('button', { name: '清空筛选' }));
    expect(dialog.getAllByRole('checkbox')).toHaveLength(3);
    expect(dialog.queryByRole('checkbox', { name: selfName })).not.toBeInTheDocument();
  });

  it('保留默认一级类型顺序，并允许筛选候选项目的自定义一级分类', async () => {
    const user = userEvent.setup();
    const custom = project({ id: 'custom-type', name: '综合研究项目', type: '具体类', typePath: ['综合研究', '具体类'] });
    const acquisition = project({ id: 'standard-type', name: '常规采集项目' });
    render(<RelatedProjects project={project()} projects={[custom, acquisition]} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    await user.click(screen.getByRole('button', { name: '管理关联' }));
    const dialog = within(screen.getByRole('dialog'));
    const typeFilter = dialog.getByRole('combobox', { name: '项目类型' });
    await user.click(typeFilter);
    const options = within(screen.getByRole('listbox', { name: '项目类型' }));
    expect(options.getAllByRole('option').map(option => option.textContent)).toEqual([
      '全部', '采集', '处理', '解释', '井筒', '非地震', '综合研究',
    ]);
    await user.click(options.getByRole('option', { name: '综合研究' }));
    expect(dialog.getAllByRole('checkbox')).toHaveLength(1);
    expect(dialog.getByRole('checkbox', { name: '选择项目：' + custom.name })).toBeVisible();
    expect(dialog.queryByRole('checkbox', { name: '选择项目：' + acquisition.name })).not.toBeInTheDocument();
    expect(dialog.getByText('具体类', { exact: true })).toBeVisible();
  });

  it('项目类型下拉支持键盘选项导航，Esc 先收起下拉再关闭弹窗并恢复焦点', async () => {
    const user = userEvent.setup();
    const processing = project({ id: 'keyboard-processing', name: '处理候选', type: '三维陆上处理' });
    const well = project({ id: 'keyboard-well', name: '井筒候选', type: '井筒项目' });
    render(<RelatedProjects project={project()} projects={[processing, well]} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    const manage = screen.getByRole('button', { name: '管理关联' });
    await user.click(manage);
    const dialog = screen.getByRole('dialog', { name: '管理关联' });
    const typeFilter = within(dialog).getByRole('combobox', { name: '项目类型' });
    expect(typeFilter).toHaveAttribute('aria-haspopup', 'listbox');
    expect(typeFilter).toHaveAttribute('aria-expanded', 'false');
    await user.click(typeFilter);
    expect(typeFilter).toHaveAttribute('aria-expanded', 'true');
    expect(within(screen.getByRole('listbox', { name: '项目类型' })).getByRole('option', { name: '全部' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Home}{ArrowDown}{ArrowDown}{Enter}');
    expect(typeFilter).toHaveTextContent('处理');
    expect(typeFilter).toHaveFocus();
    expect(screen.queryByRole('listbox', { name: '项目类型' })).not.toBeInTheDocument();
    expect(within(dialog).getByRole('checkbox', { name: '选择项目：' + processing.name })).toBeVisible();
    expect(within(dialog).queryByRole('checkbox', { name: '选择项目：' + well.name })).not.toBeInTheDocument();

    await user.keyboard(' ');
    expect(within(screen.getByRole('listbox', { name: '项目类型' })).getByRole('option', { name: '处理' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{End}{ArrowUp} ');
    expect(typeFilter).toHaveTextContent('井筒');
    expect(typeFilter).toHaveFocus();
    expect(within(dialog).getByRole('checkbox', { name: '选择项目：' + well.name })).toBeVisible();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('listbox', { name: '项目类型' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox', { name: '项目类型' })).not.toBeInTheDocument();
    expect(dialog).toBeVisible();
    expect(typeFilter).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(manage).toHaveFocus();
    expect(onNotify).not.toHaveBeenCalled();
  });

  it('点击下拉外部或 Tab 收起选项，跨类型与名称筛选保留勾选', async () => {
    const user = userEvent.setup();
    const acquisition = project({ id: 'dropdown-acquisition', name: '待关联采集项目' });
    const processing = project({ id: 'dropdown-processing', name: '待关联处理项目', type: '三维陆上处理' });
    render(<RelatedProjects project={project()} projects={[acquisition, processing]} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    await user.click(screen.getByRole('button', { name: '管理关联' }));
    const dialog = within(screen.getByRole('dialog', { name: '管理关联' }));
    const typeFilter = dialog.getByRole('combobox', { name: '项目类型' });
    const search = dialog.getByRole('searchbox', { name: '搜索项目名称' });
    await user.click(dialog.getByRole('checkbox', { name: '选择项目：' + acquisition.name }));
    await user.click(typeFilter);
    await user.click(within(screen.getByRole('listbox', { name: '项目类型' })).getByRole('option', { name: '处理' }));
    await user.click(dialog.getByRole('checkbox', { name: '选择项目：' + processing.name }));
    expect(dialog.getByText('已选 2 个项目')).toBeVisible();
    await user.click(typeFilter);
    await user.click(search);
    expect(screen.queryByRole('listbox', { name: '项目类型' })).not.toBeInTheDocument();
    expect(search).toHaveFocus();
    expect(screen.getByRole('dialog', { name: '管理关联' })).toBeVisible();
    await user.click(typeFilter);
    await user.tab();
    expect(screen.queryByRole('listbox', { name: '项目类型' })).not.toBeInTheDocument();
    expect(search).toHaveFocus();
    expect(dialog.getByText('已选 2 个项目')).toBeVisible();
    await user.click(typeFilter);
    await user.click(within(screen.getByRole('listbox', { name: '项目类型' })).getByRole('option', { name: '全部' }));
    expect(dialog.getByRole('checkbox', { name: '选择项目：' + acquisition.name })).toBeChecked();
    expect(dialog.getByRole('checkbox', { name: '选择项目：' + processing.name })).toBeChecked();
    await user.type(search, processing.name);
    expect(dialog.queryByRole('checkbox', { name: '选择项目：' + acquisition.name })).not.toBeInTheDocument();
    expect(dialog.getByRole('checkbox', { name: '选择项目：' + processing.name })).toBeChecked();
    expect(dialog.getByText('已选 2 个项目')).toBeVisible();
    await user.click(dialog.getByRole('button', { name: '保存' }));
    expect(screen.getByRole('heading', { name: acquisition.name })).toBeVisible();
    expect(screen.getByRole('heading', { name: processing.name })).toBeVisible();
  });

  it('同一管理弹窗跨筛选解除及补选，保留筛选外的关系并统一保存', async () => {
    const user = userEvent.setup();
    const remove = project({ id: 'remove', name: '待解除采集项目' });
    const retain = project({ id: 'retain', name: '保留解释项目', type: '三维陆上解释' });
    const added = project({ id: 'added', name: '新增处理项目', type: '三维陆上处理' });
    const selected = project({ mapDetails: { relatedProjectIds: [remove.id, retain.id] } });
    render(<RelatedProjects project={selected} projects={[selected, remove, retain, added]} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    await user.click(screen.getByRole('button', { name: '管理关联' }));
    const dialog = within(screen.getByRole('dialog', { name: '管理关联' }));
    expect(dialog.getByRole('button', { name: '保存' })).toBeDisabled();
    expect(dialog.getByRole('checkbox', { name: '选择项目：' + remove.name })).toBeChecked();
    expect(dialog.getByRole('checkbox', { name: '选择项目：' + retain.name })).toBeChecked();
    await user.click(dialog.getByRole('checkbox', { name: '选择项目：' + remove.name }));
    await user.click(dialog.getByRole('combobox', { name: '项目类型' }));
    await user.click(within(screen.getByRole('listbox', { name: '项目类型' })).getByRole('option', { name: '处理' }));
    expect(dialog.queryByRole('checkbox', { name: '选择项目：' + retain.name })).not.toBeInTheDocument();
    await user.click(dialog.getByRole('checkbox', { name: '选择项目：' + added.name }));
    expect(dialog.getByText('已选 2 个项目')).toBeVisible();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('heading', { name: remove.name })).toBeVisible();
    expect(screen.queryByRole('heading', { name: added.name })).not.toBeInTheDocument();
    expect(onNotify).not.toHaveBeenCalled();
    await user.click(dialog.getByRole('button', { name: '保存' }));
    expect(screen.queryByRole('heading', { name: remove.name })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: retain.name })).toBeVisible();
    expect(screen.getByRole('heading', { name: added.name })).toBeVisible();
    expect(screen.getByText('2 个项目')).toBeVisible();
    expect(selected.mapDetails?.relatedProjectIds).toEqual([remove.id, retain.id]);
    expect(onNotify).toHaveBeenCalledExactlyOnceWith('关联关系已保存');
    expect(screen.queryByText('关联关系已保存')).not.toBeInTheDocument();
  });

  it('全部解除样例后保存明确空态，重新挂载仍为空且能重新添加', async () => {
    const user = userEvent.setup();
    const props = { project: CURRENT_PROJECT, projects: PROJECTS, role: 'admin' as const, onOpen, onNotify };
    const view = render(<RelatedProjects {...props}/>);
    await user.click(screen.getByRole('button', { name: '管理关联' }));
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: '清空选择' }));
    expect(dialog.getByText('已选 0 个项目')).toBeVisible();
    expect(dialog.getByRole('button', { name: '保存' })).toBeEnabled();
    await user.click(dialog.getByRole('button', { name: '保存' }));
    expect(screen.getByText('暂无关联项目')).toBeVisible();
    expect(screen.getByRole('button', { name: '管理关联' })).toBeVisible();
    expect(onNotify).toHaveBeenCalledExactlyOnceWith('关联关系已保存');
    expect(screen.queryByText('关联关系已保存')).not.toBeInTheDocument();
    view.unmount();
    render(<RelatedProjects {...props}/>);
    expect(screen.getByText('暂无关联项目')).toBeVisible();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '管理关联' }));
    const reopened = within(screen.getByRole('dialog'));
    const previous = PROJECTS.find(item => item.id === '1')!;
    expect(reopened.getByRole('checkbox', { name: '选择项目：' + previous.name })).not.toBeChecked();
    expect(reopened.getByRole('checkbox', { name: '选择项目：' + previous.name })).toBeEnabled();
  });

  it.each(['取消', '关闭', 'Escape'])('%s 编辑时放弃草稿，不写存储并恢复入口焦点', async action => {
    const user = userEvent.setup();
    const item = project({ id: 'linked', name: '原有关联项目' });
    const selected = project({ mapDetails: { relatedProjectIds: [item.id] } });
    render(<RelatedProjects project={selected} projects={[selected, item]} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    const trigger = screen.getByRole('button', { name: '管理关联' });
    await user.click(trigger);
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: '清空选择' }));
    if (action === 'Escape') await user.keyboard('{Escape}');
    else await user.click(dialog.getByRole('button', { name: action }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: item.name })).toBeVisible();
    expect(sessionStorage.getItem(RELATED_PROJECTS_STORAGE_KEY)).toBeNull();
    expect(trigger).toHaveFocus();
    expect(onNotify).not.toHaveBeenCalled();
    await user.click(trigger);
    expect(within(screen.getByRole('dialog')).getByRole('checkbox', { name: '选择项目：' + item.name })).toBeChecked();
  });

  it('普通用户可关联可见但无查阅权限的项目，清空编辑保留不可见旧关系', async () => {
    const user = userEvent.setup();
    const accessible = project({ id: 'visible', name: '已归档无权限项目', readable: false });
    const hidden = project({ id: 'hidden', name: '未归档隐藏项目', archived: false });
    const selected = project({ mapDetails: { relatedProjectIds: [hidden.id] } });
    const projects = [selected, accessible, hidden];
    const view = render(<RelatedProjects project={selected} projects={projects} role="ordinary" onOpen={onOpen} onNotify={onNotify}/>);
    await user.click(screen.getByRole('button', { name: '管理关联' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.queryByText(hidden.name)).not.toBeInTheDocument();
    await user.click(dialog.getByRole('checkbox', { name: '选择项目：' + accessible.name }));
    await user.click(dialog.getByRole('button', { name: '保存' }));
    expect(screen.getByRole('heading', { name: accessible.name })).toBeVisible();
    expect(screen.queryByRole('button', { name: /^查阅项目成果：/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '管理关联' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '清空选择' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '保存' }));
    expect(screen.getByText('暂无关联项目')).toBeVisible();
    view.rerender(<RelatedProjects project={selected} projects={projects} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    expect(screen.getByRole('heading', { name: hidden.name })).toBeVisible();
    expect(screen.queryByRole('heading', { name: accessible.name })).not.toBeInTheDocument();
  });

  it('保存失败保留弹窗和勾选，可重试且不显示未保存卡片', async () => {
    const user = userEvent.setup();
    const selected = project();
    const item = project({ id: 'new', name: '待关联项目' });
    render(<RelatedProjects project={selected} projects={[selected, item]} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    await user.click(screen.getByRole('button', { name: '管理关联' }));
    const dialog = within(screen.getByRole('dialog'));
    await user.click(dialog.getByRole('checkbox', { name: '选择项目：' + item.name }));
    const failure = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Storage full', 'QuotaExceededError'); });
    await user.click(dialog.getByRole('button', { name: '保存' }));
    expect(dialog.getByRole('alert')).toHaveTextContent('关联保存失败，请重试');
    expect(dialog.getByRole('checkbox', { name: '选择项目：' + item.name })).toBeChecked();
    expect(screen.queryByRole('heading', { name: item.name })).not.toBeInTheDocument();
    expect(sessionStorage.getItem(RELATED_PROJECTS_STORAGE_KEY)).toBeNull();
    expect(onNotify).not.toHaveBeenCalled();
    failure.mockRestore();
    await user.click(dialog.getByRole('button', { name: '保存' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: item.name })).toBeVisible();
  });

  it('切换项目丢弃未保存草稿，各项目保存的关联互相隔离', async () => {
    const user = userEvent.setup();
    const first = project({ id: 'first', name: '项目甲' });
    const second = project({ id: 'second', name: '项目乙' });
    const target = project({ id: 'target', name: '关联目标' });
    const projects = [first, second, target];
    const view = render(<RelatedProjects project={first} projects={projects} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    await user.click(screen.getByRole('button', { name: '管理关联' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('checkbox', { name: '选择项目：' + target.name }));
    view.rerender(<RelatedProjects project={second} projects={projects} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('暂无关联项目')).toBeVisible();
    expect(sessionStorage.getItem(RELATED_PROJECTS_STORAGE_KEY)).toBeNull();
    await user.click(screen.getByRole('button', { name: '管理关联' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByRole('checkbox', { name: '选择项目：' + target.name })).not.toBeChecked();
    await user.click(dialog.getByRole('checkbox', { name: '选择项目：' + target.name }));
    await user.click(dialog.getByRole('button', { name: '保存' }));
    view.rerender(<RelatedProjects project={first} projects={projects} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    expect(screen.getByText('暂无关联项目')).toBeVisible();
    view.rerender(<RelatedProjects project={second} projects={projects} role="admin" onOpen={onOpen} onNotify={onNotify}/>);
    expect(screen.getByRole('heading', { name: target.name })).toBeVisible();
  });

  it('英文界面翻译新增操作文案，项目业务名称保持原文', async () => {
    sessionStorage.setItem('geobank-demo-locale', 'en');
    const user = userEvent.setup();
    const item = project({ id: 'english-item', name: '中文项目名称' });
    render(<LanguageProvider><RelatedProjects project={project()} projects={[item]} role="admin" onOpen={onOpen} onNotify={onNotify}/></LanguageProvider>);
    await user.click(screen.getByRole('button', { name: 'Manage links' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Manage links' }));
    expect(dialog.getByRole('searchbox', { name: 'Search project names' })).toBeVisible();
    expect(dialog.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(dialog.getByText(item.name)).toBeVisible();
    expect(dialog.queryByText('管理关联')).not.toBeInTheDocument();
    await user.click(dialog.getByRole('checkbox', { name: 'Select project: ' + item.name }));
    await user.click(dialog.getByRole('button', { name: 'Save' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onNotify).toHaveBeenCalledExactlyOnceWith('Project links saved');
    expect(screen.queryByText('Project links saved')).not.toBeInTheDocument();
  });
});
