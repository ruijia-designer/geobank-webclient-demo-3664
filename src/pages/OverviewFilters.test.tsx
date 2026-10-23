import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppApi, AppState, Filters, Project } from '../types';
import { OverviewFilters } from '../components/OverviewFilters';
import { initialState, PROJECTS } from '../services/demo';
import { matchesOverviewFilters, normalizeOverviewFilters } from '../services/overviewFilters';
import OverviewPage from './OverviewPage';

const projects: Project[] = [
  { ...PROJECTS[0], id: 'centre', name: '中心2023项目', year: '2023', basin: '沁水盆地', point: [740, 575] },
  { ...PROJECTS[0], id: 'east', name: '东部2024项目', year: '2024', basin: '鄂尔多斯盆地', point: [1573, 575] },
  { ...PROJECTS[0], id: 'west', name: '西部2025项目', year: '2025', basin: '沁水盆地', point: [-93, 575] },
  { ...PROJECTS[0], id: 'undated', name: '未填年度项目', year: '', basin: '四川盆地', point: [740, 575] },
];
let api: AppApi;
function Harness() {
  const [state, setState] = useState<AppState>(() => ({ ...initialState('admin'), projects }));
  api = { state, setState, navigate: vi.fn(), openProject: vi.fn(), notify: vi.fn(), deny: vi.fn() };
  return <OverviewPage api={api}/>;
}
const projectNames = () => screen.queryAllByRole('button', { name: /^项目：/ }).map(card => card.getAttribute('aria-label')!.replace(/^项目：/, ''));
beforeEach(() => { vi.stubGlobal('innerWidth', 1920); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('概览年度范围', () => {
  it.each<[string, Filters, string[]]>([
    ['只填起始年度包含该年和后续年度', { yearFrom: ['2024'] }, ['east', 'west']],
    ['只填结束年度包含该年和之前年度', { yearTo: ['2024'] }, ['centre', 'east']],
    ['闭区间包含两端边界', { yearFrom: ['2023'], yearTo: ['2024'] }, ['centre', 'east']],
    ['相同起止年度只包含该年', { yearFrom: ['2024'], yearTo: ['2024'] }, ['east']],
    ['不限制年度时保留未填年度的项目', {}, ['centre', 'east', 'west', 'undated']],
  ])('%s', (_name, filters, expected) => {
    expect(projects.filter(project => matchesOverviewFilters(project, filters)).map(project => project.id)).toEqual(expected);
  });

  it('旧年度复选条件迁移成有序范围，并保留其它筛选值', () => {
    expect(normalizeOverviewFilters({ year: ['2025', '2023'], basin: ['沁水盆地'] })).toEqual({ yearFrom: ['2023'], yearTo: ['2025'], basin: ['沁水盆地'] });
    expect(normalizeOverviewFilters({ year: ['2023'], yearFrom: ['2024'] })).toEqual({ yearFrom: ['2024'] });
  });

  it.each([
    ['2025', '2023', '起始年度不能晚于结束年度', '结束年度'],
    ['20ab', '', '请输入四位年份', '起始年度'],
    ['', '024', '请输入四位年份', '结束年度'],
  ])('起始%s结束%s时提示错误且不应用', async (from, to, message, focusLabel) => {
    const user = userEvent.setup(), onApply = vi.fn();
    render(<OverviewFilters value={{}} basins={[]} role="admin" onApply={onApply} onReset={vi.fn()} onClose={vi.fn()}/>);
    if (from) await user.type(screen.getByRole('textbox', { name: '起始年度' }), from);
    if (to) await user.type(screen.getByRole('textbox', { name: '结束年度' }), to);
    await user.click(screen.getByRole('button', { name: '应用筛选' }));
    expect(screen.getByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('textbox', { name: focusLabel })).toHaveFocus();
    expect(onApply).not.toHaveBeenCalled();
    await user.clear(screen.getByRole('textbox', { name: '起始年度' }));
    await user.clear(screen.getByRole('textbox', { name: '结束年度' }));
    await user.type(screen.getByRole('textbox', { name: '起始年度' }), '2024');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '应用筛选' }));
    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ yearFrom: ['2024'] }));
    expect(onApply.mock.calls[0][0].yearTo || []).toEqual([]);
  });
});

describe('盆地搜索多选', () => {
  it('Tab 离开最后一个盆地选项时收起菜单，保持下方控件焦点可见', async () => {
    const user = userEvent.setup();
    render(<OverviewFilters value={{}} basins={['沁水盆地']} role="admin" onApply={vi.fn()} onReset={vi.fn()} onClose={vi.fn()}/>);
    await user.click(screen.getByRole('button', { name: '选择盆地' }));
    screen.getByRole('checkbox', { name: '沁水盆地' }).focus();
    await user.tab();
    expect(screen.queryByRole('group', { name: '盆地选项' })).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '仅显示可查阅项目' })).toHaveFocus();
  });

  it('跨搜索保留多选，清空搜索仍选中，标签可单独移除，无结果不丢失选择', async () => {
    const user = userEvent.setup(), onApply = vi.fn();
    render(<OverviewFilters value={{}} basins={['沁水盆地', '鄂尔多斯盆地', '四川盆地']} role="admin" onApply={onApply} onReset={vi.fn()} onClose={vi.fn()}/>);
    await user.click(screen.getByRole('button', { name: '选择盆地' }));
    const search = screen.getByRole('textbox', { name: '搜索盆地' });
    await user.type(search, '沁水');
    expect(screen.queryByRole('checkbox', { name: '鄂尔多斯盆地' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: '沁水盆地' }));
    await user.clear(search); await user.type(search, '鄂尔');
    await user.click(screen.getByRole('checkbox', { name: '鄂尔多斯盆地' }));
    expect(screen.getByRole('button', { name: '选择盆地' })).toHaveTextContent('已选 2 个盆地');
    await user.clear(search);
    expect(screen.getByRole('checkbox', { name: '沁水盆地' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '鄂尔多斯盆地' })).toBeChecked();
    await user.type(search, '不存在的盆地');
    expect(screen.getByText('无匹配盆地')).toBeVisible();
    expect(within(screen.getByRole('group', { name: '盆地选项' })).queryAllByRole('checkbox')).toHaveLength(0);
    await user.click(screen.getByRole('button', { name: '移除盆地：沁水盆地' }));
    expect(screen.getByRole('button', { name: '选择盆地' })).toHaveTextContent('已选 1 个盆地');
    expect(screen.queryByRole('button', { name: '移除盆地：沁水盆地' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '移除盆地：鄂尔多斯盆地' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '应用筛选' }));
    expect(onApply).toHaveBeenCalledWith({ basin: ['鄂尔多斯盆地'] });
  });

  it('键盘打开、Esc返回焦点，外部点击收起且保留选择', async () => {
    const user = userEvent.setup();
    render(<OverviewFilters value={{ basin: ['沁水盆地'] }} basins={['沁水盆地']} role="admin" onApply={vi.fn()} onReset={vi.fn()} onClose={vi.fn()}/>);
    const trigger = screen.getByRole('button', { name: '选择盆地' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    trigger.focus(); await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('textbox', { name: '搜索盆地' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('group', { name: '盆地选项' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await user.click(trigger); await user.click(screen.getByRole('textbox', { name: '起始年度' }));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(screen.getByRole('checkbox', { name: '沁水盆地' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: '清空选择' }));
    expect(screen.getByRole('checkbox', { name: '沁水盆地' })).not.toBeChecked();
    expect(screen.queryByRole('button', { name: '移除盆地：沁水盆地' })).not.toBeInTheDocument();
  });
});

describe('概览筛选与项目列表联动', () => {
  it('年度和盆地应用后共同筛选列表，重新打开保留条件，重置恢复全部项目', async () => {
    const user = userEvent.setup(); render(<Harness/>);
    expect(projectNames()).toEqual(projects.map(project => project.name));
    expect(screen.getByRole('button', { name: '项目类型' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('button', { name: '重置项目类型' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '筛选项目' }));
    await user.type(screen.getByRole('textbox', { name: '起始年度' }), '2024');
    await user.click(screen.getByRole('button', { name: '选择盆地' }));
    await user.click(screen.getByRole('checkbox', { name: '沁水盆地' }));
    await user.click(screen.getByRole('button', { name: '应用筛选' }));
    expect(projectNames()).toEqual(['西部2025项目']);
    expect(screen.getByText('1 个项目')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '筛选项目' }));
    expect(screen.getByRole('textbox', { name: '起始年度' })).toHaveValue('2024');
    expect(screen.getByRole('button', { name: '移除盆地：沁水盆地' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重置筛选条件' }));
    expect(api.state.overviewFilters).toEqual({});
    expect(screen.getByRole('textbox', { name: '起始年度' })).toHaveValue('');
    expect(screen.getByRole('button', { name: '选择盆地' })).toHaveTextContent('全部盆地');
    await user.click(screen.getByRole('button', { name: '关闭筛选' }));
    expect(projectNames()).toEqual(projects.map(project => project.name));
  });

  it('仅视野选项应用后保留，实际地图缩放改变列表，缩小和重置恢复视野外项目', async () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ x: 0, y: 0, left: 0, top: 0, right: 1200, bottom: 800, width: 1200, height: 800, toJSON: () => ({}) }));
    const user = userEvent.setup(); render(<Harness/>);
    await user.click(screen.getByRole('button', { name: '筛选项目' }));
    await user.click(screen.getByRole('checkbox', { name: '仅显示视野范围内的项目' }));
    await user.click(screen.getByRole('button', { name: '应用筛选' }));
    expect(api.state.overviewFilters.inViewport).toEqual(['true']);
    expect(projectNames()).toEqual(projects.map(project => project.name));
    await user.click(screen.getByRole('button', { name: '放大地图' }));
    expect(api.state.mapZoom).toBe(1.4);
    expect(projectNames()).toEqual(['中心2023项目', '未填年度项目']);
    // Offscreen markers stay in the actual map so zooming back out can restore them.
    expect(screen.getByRole('button', { name: '定位项目：东部2024项目' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '筛选项目' }));
    expect(screen.getByRole('checkbox', { name: '仅显示视野范围内的项目' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: '关闭筛选' }));
    await user.click(screen.getByRole('button', { name: '缩小地图' }));
    expect(projectNames()).toEqual(projects.map(project => project.name));
    await user.click(screen.getByRole('button', { name: '放大地图' }));
    await user.click(screen.getByRole('button', { name: '筛选项目' }));
    await user.click(screen.getByRole('button', { name: '重置筛选条件' }));
    expect(screen.getByRole('checkbox', { name: '仅显示视野范围内的项目' })).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: '关闭筛选' }));
    expect(api.state.mapZoom).toBe(1.4);
    expect(projectNames()).toEqual(projects.map(project => project.name));
  });
});
