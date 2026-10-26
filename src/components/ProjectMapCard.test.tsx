import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Project } from '../types';
import { LanguageProvider, useTranslation } from '../i18n';
import { ProjectMapCard } from './ProjectMapCard';

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'map-card-test', name: '地图详情测试项目', year: '2024', basin: '沁水盆地',
    type: '三维陆上常规采集', area: '', point: [1128, 413], readable: true, archived: false,
    ...overrides,
  };
}

function fieldValue(card: HTMLElement, label: string) {
  const term = within(card).getByText(label, { selector: 'dt' });
  const value = term.nextElementSibling;
  expect(value?.tagName).toBe('DD');
  return value as HTMLElement;
}

const onClose = vi.fn(), onOpen = vi.fn();
beforeEach(() => { vi.clearAllMocks(); sessionStorage.removeItem('geobank-demo-locale'); });
afterEach(() => { sessionStorage.removeItem('geobank-demo-locale'); });

describe('地图项目详情卡片', () => {
  it('分组呈现项目概况和处理参数，格式化数值并保留完整项目名称', () => {
    const item = project({
      name: '2024年山西省左权西乡煤层气区块三维地震处理项目',
      mapDetails: { fullFoldAreaKm2: 596, processing: { shotCount: 550000, binSizeMeters: [25, 25], aspectRatio: 0.8, maxOffsetKm: 8 } },
    });
    render(<ProjectMapCard project={item} projects={[item]} role="admin" onClose={onClose} onOpen={onOpen}/>);
    const card = screen.getByRole('region', { name: '项目详情' });
    expect(within(card).getByText(item.name)).toBeVisible();
    for (const name of ['项目概况', '处理参数', '关联项目']) {
      expect(within(card).getByRole('heading', { name })).toBeVisible();
    }
    expect(fieldValue(card, '年度')).toHaveTextContent('2024');
    expect(fieldValue(card, '所属盆地')).toHaveTextContent('沁水盆地');
    expect(fieldValue(card, '项目类型')).toHaveTextContent('三维陆上常规采集');
    expect(fieldValue(card, '满覆盖面积')).toHaveTextContent('596 km²');
    expect(fieldValue(card, '总炮数')).toHaveTextContent('550,000');
    expect(fieldValue(card, '面元')).toHaveTextContent('25 m × 25 m');
    expect(fieldValue(card, '纵横比')).toHaveTextContent('0.8');
    expect(fieldValue(card, '最大炮检距')).toHaveTextContent('8 km');
    expect(within(card).getByText('暂无关联项目')).toBeVisible();
  });

  it('未提供的参数显示缺省值，不把零值当作缺失数据', () => {
    const missing = project({ year: '', basin: '' });
    const { rerender } = render(<ProjectMapCard project={missing} projects={[missing]} role="admin" onClose={onClose} onOpen={onOpen}/>);
    let card = screen.getByRole('region', { name: '项目详情' });
    for (const label of ['年度', '所属盆地', '满覆盖面积', '总炮数', '面元', '纵横比', '最大炮检距']) {
      expect(fieldValue(card, label)).toHaveTextContent(/^—$/);
    }
    const zero = project({ mapDetails: { fullFoldAreaKm2: 0, processing: { shotCount: 0, binSizeMeters: [0, 0], aspectRatio: 0, maxOffsetKm: 0 } } });
    rerender(<ProjectMapCard project={zero} projects={[zero]} role="admin" onClose={onClose} onOpen={onOpen}/>);
    card = screen.getByRole('region', { name: '项目详情' });
    expect(fieldValue(card, '满覆盖面积')).toHaveTextContent('0 km²');
    expect(fieldValue(card, '总炮数')).toHaveTextContent(/^0$/);
    expect(fieldValue(card, '面元')).toHaveTextContent('0 m × 0 m');
    expect(fieldValue(card, '纵横比')).toHaveTextContent(/^0$/);
    expect(fieldValue(card, '最大炮检距')).toHaveTextContent('0 km');
  });

  it('显示未归档、审批中、已归档状态，已归档优先于遗留申请', () => {
    const item = project();
    const { rerender } = render(<ProjectMapCard project={item} projects={[item]} role="admin" onClose={onClose} onOpen={onOpen}/>);
    expect(screen.getByText('未归档')).toBeVisible();
    rerender(<ProjectMapCard project={item} projects={[item]} role="admin" archivePending onClose={onClose} onOpen={onOpen}/>);
    expect(screen.getByText('归档审批中')).toBeVisible();
    expect(screen.queryByText('未归档')).not.toBeInTheDocument();
    const archived = { ...item, archived: true };
    rerender(<ProjectMapCard project={archived} projects={[archived]} role="admin" archivePending onClose={onClose} onOpen={onOpen}/>);
    expect(screen.getByText('已归档')).toBeVisible();
    expect(screen.queryByText('归档审批中')).not.toBeInTheDocument();
  });

  it('仅使用显式关联关系，排除自身、重复、失效及角色不可见的项目', async () => {
    const user = userEvent.setup();
    const archived = project({ id: 'related-readable', name: '已归档可查阅关联项目', archived: true });
    const restricted = project({ id: 'related-restricted', name: '已归档无查阅权限关联项目', archived: true, readable: false });
    const unpublished = project({ id: 'related-unarchived', name: '未归档关联项目' });
    const unrelated = project({ id: 'same-basin-unrelated', name: '同盆地但未关联的项目', archived: true });
    const selected = project({ archived: true, mapDetails: { relatedProjectIds: ['map-card-test', archived.id, archived.id, 'missing-id', unpublished.id, restricted.id] } });
    const projects = [selected, archived, restricted, unpublished, unrelated];
    const { rerender } = render(<ProjectMapCard project={selected} projects={projects} role="ordinary" onClose={onClose} onOpen={onOpen}/>);
    expect(screen.getAllByRole('button', { name: '查阅关联项目：' + archived.name })).toHaveLength(1);
    expect(screen.getByRole('button', { name: '查阅关联项目：' + restricted.name })).toBeVisible();
    expect(screen.queryByRole('button', { name: '查阅关联项目：' + selected.name })).not.toBeInTheDocument();
    expect(screen.queryByText(unpublished.name)).not.toBeInTheDocument();
    expect(screen.queryByText(unrelated.name)).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^查阅关联项目：/ })).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: '查阅关联项目：' + restricted.name }));
    expect(onOpen).toHaveBeenCalledWith(restricted);
    rerender(<ProjectMapCard project={selected} projects={projects} role="admin" onClose={onClose} onOpen={onOpen}/>);
    expect(screen.getByRole('button', { name: '查阅关联项目：' + unpublished.name })).toBeVisible();
    expect(screen.getAllByRole('button', { name: /^查阅关联项目：/ })).toHaveLength(3);
  });

  it('关闭、查阅成果及关联项目入口将原始项目交给外层回调', async () => {
    const user = userEvent.setup();
    const related = project({ id: 'related-action', name: '关联项目完整名称', archived: true });
    const selected = project({ mapDetails: { relatedProjectIds: [related.id] } });
    render(<ProjectMapCard project={selected} projects={[selected, related]} role="admin" onClose={onClose} onOpen={onOpen}/>);
    await user.click(screen.getByRole('button', { name: '查阅成果' }));
    expect(onOpen).toHaveBeenLastCalledWith(selected);
    await user.click(screen.getByRole('button', { name: '查阅关联项目：' + related.name }));
    expect(onOpen).toHaveBeenLastCalledWith(related);
    await user.click(screen.getByRole('button', { name: '关闭项目详情' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('切换英文只翻译界面标签，保留项目名、参数及关联关系', async () => {
    const user = userEvent.setup();
    const related = project({ id: 'related-language', name: '中文关联项目名', archived: true });
    const selected = project({ mapDetails: { fullFoldAreaKm2: 596, processing: { shotCount: 550000 }, relatedProjectIds: [related.id] } });
    function Harness() {
      const { toggleLocale } = useTranslation();
      return <><button onClick={toggleLocale}>Switch language</button><ProjectMapCard project={selected} projects={[selected, related]} role="admin" onClose={onClose} onOpen={onOpen}/></>;
    }
    render(<LanguageProvider><Harness/></LanguageProvider>);
    await user.click(screen.getByRole('button', { name: 'Switch language' }));
    const card = screen.getByRole('region', { name: 'Project details' });
    expect(within(card).getByText(selected.name)).toBeVisible();
    for (const name of ['Project overview', 'Processing parameters', 'Related projects']) {
      expect(within(card).getByRole('heading', { name })).toBeVisible();
    }
    expect(fieldValue(card, 'Full-fold area')).toHaveTextContent('596 km²');
    expect(fieldValue(card, 'Total shots')).toHaveTextContent('550,000');
    await user.click(within(card).getByRole('button', { name: 'View related project: ' + related.name }));
    expect(onOpen).toHaveBeenCalledWith(related);
    await user.click(screen.getByRole('button', { name: 'Switch language' }));
    expect(screen.getByRole('region', { name: '项目详情' })).toBeVisible();
    expect(screen.getByRole('button', { name: '查阅关联项目：' + related.name })).toBeVisible();
  });
});
