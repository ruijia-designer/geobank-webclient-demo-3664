import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileText, Map } from 'lucide-react';
import { ResultTabs } from './ResultTabs';
import type { ResultTabItem } from './ResultTabs';

const items: ResultTabItem[] = [
  { id: 'overview', label: '成果概览', Icon: FileText },
  { id: 'gis', label: '综合成图', Icon: Map },
  { id: 'file-a', label: '井A.las', Icon: FileText, closable: true },
  { id: 'file-b', label: '井B.las', Icon: FileText, closable: true },
];
const onSelect = vi.fn();
const onClose = vi.fn();

function Harness({ tabs = items, initial = 'overview' }: { tabs?: ResultTabItem[]; initial?: string }) {
  const [activeId, setActiveId] = useState(initial);
  return <ResultTabs items={tabs} activeId={activeId} panelId="preview-panel"
    onSelect={id => { onSelect(id); setActiveId(id); }} onClose={onClose}/>;
}

function mockTabOffsets(list: HTMLElement) {
  within(list).getAllByRole('tab').forEach((tab, index) => {
    Object.defineProperties(tab.parentElement!, {
      offsetLeft: { configurable: true, value: index * 131 },
      offsetWidth: { configurable: true, value: 128 },
    });
  });
}

function expectMenuItems(labels: string[]) {
  const entries = screen.getAllByRole('menuitemradio');
  expect(entries).toHaveLength(labels.length);
  labels.forEach((label, index) => expect(entries[index]).toHaveAccessibleName(label));
}

beforeEach(() => { vi.clearAllMocks(); });

describe('成果浏览器式选项卡', () => {
  it('方向键及首尾快捷键切换当前标签，焦点和选中状态同步', async () => {
    const user = userEvent.setup();
    render(<Harness/>);
    const overview = screen.getByRole('tab', { name: '成果概览' });
    const map = screen.getByRole('tab', { name: '综合成图' });
    const list = screen.getByRole('tablist', { name: '成果选项卡' });
    expect(list).toContainElement(overview);
    expect(list).toContainElement(map);
    expect(list).toContainElement(screen.getByRole('tab', { name: '井A.las' }));
    expect(overview).toHaveAttribute('aria-selected', 'true');
    expect(overview).toHaveAttribute('aria-controls', 'preview-panel');
    await user.click(overview);
    await user.keyboard('{ArrowRight}');
    expect(map).toHaveFocus();
    expect(map).toHaveAttribute('aria-selected', 'true');
    expect(overview).toHaveAttribute('aria-selected', 'false');
    await user.keyboard('{End}');
    expect(screen.getByRole('tab', { name: '井B.las' })).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: '井A.las' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(overview).toHaveFocus();
    expect(overview).toHaveAttribute('aria-current', 'page');
    expect(onSelect).toHaveBeenLastCalledWith('overview');
  });

  it('Delete和中键只关闭文件标签，固定标签保持可用', async () => {
    const user = userEvent.setup();
    render(<Harness/>);
    const overview = screen.getByRole('tab', { name: '成果概览' });
    await user.click(overview);
    await user.keyboard('{Delete}');
    fireEvent(overview, new MouseEvent('auxclick', { button: 1, bubbles: true }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: '关闭成果概览' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: '井A.las' }));
    await user.keyboard('{Delete}');
    expect(onClose).toHaveBeenLastCalledWith('file-a');
    fireEvent(screen.getByRole('tab', { name: '井B.las' }), new MouseEvent('auxclick', { button: 1, bubbles: true }));
    expect(onClose).toHaveBeenLastCalledWith('file-b');
    await user.click(screen.getByRole('tab', { name: '井B.las' }));
    onSelect.mockClear();
    await user.click(screen.getByRole('button', { name: '关闭井B.las' }));
    expect(onClose).toHaveBeenLastCalledWith('file-b');
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('菜单只列截断或隐藏标签，选择后移除新可见标签并列入左侧隐藏标签', async () => {
    const user = userEvent.setup();
    const manyTabs: ResultTabItem[] = Array.from({ length: 12 }, (_, index) => ({
      id: `file-${index}`, label: `项目成果长名称-${index}-测井数据.las`, Icon: FileText, closable: index > 0,
    }));
    render(<Harness tabs={manyTabs} initial="file-0"/>);
    const list = screen.getByRole('tablist', { name: '成果选项卡' });
    Object.defineProperty(list.parentElement!, 'clientWidth', { configurable: true, value: 430 });
    Object.defineProperties(list, {
      clientWidth: { configurable: true, value: 397 },
      scrollWidth: { configurable: true, value: 12 * 131 - 3 },
    });
    mockTabOffsets(list);
    fireEvent(window, new Event('resize'));
    const trigger = screen.getByRole('button', { name: '超出标签栏的标签' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('title', '超出标签栏的标签');
    await user.click(trigger);
    expect(screen.getByRole('menu', { name: '超出标签栏的标签' })).toBeVisible();
    expectMenuItems(manyTabs.slice(3).map(item => item.label));
    expect(screen.getByRole('menuitemradio', { name: manyTabs[3].label })).toHaveFocus();
    await user.click(screen.getByRole('menuitemradio', { name: manyTabs[11].label }));
    expect(onSelect).toHaveBeenLastCalledWith('file-11');
    const selected = within(list).getByRole('tab', { name: manyTabs[11].label });
    expect(selected).toHaveAttribute('aria-selected', 'true');
    expect(selected).toHaveAttribute('title', manyTabs[11].label);
    expect(selected).toHaveFocus();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(selected.parentElement!.offsetLeft).toBeGreaterThanOrEqual(list.scrollLeft);
    expect(selected.parentElement!.offsetLeft + selected.parentElement!.offsetWidth).toBeLessThanOrEqual(list.scrollLeft + list.clientWidth);
    await user.click(trigger);
    expectMenuItems(manyTabs.slice(0, 9).map(item => item.label));
    expect(screen.queryByRole('menuitemradio', { name: manyTabs[11].label })).not.toBeInTheDocument();
    await user.click(screen.getByRole('menuitemradio', { name: manyTabs[3].label }));
    expect(onSelect).toHaveBeenLastCalledWith('file-3');
    expect(within(list).getByRole('tab', { name: manyTabs[3].label })).toHaveAttribute('aria-selected', 'true');
    expect(within(list).getByRole('tab', { name: manyTabs[3].label })).toHaveFocus();
  });

  it('滚动和缩放刷新两端截断标签，容忍 1px 边缘误差并保持有效菜单焦点', async () => {
    const user = userEvent.setup();
    render(<Harness/>);
    const list = screen.getByRole('tablist', { name: '成果选项卡' });
    let viewportWidth = 600;
    Object.defineProperty(list.parentElement!, 'clientWidth', { configurable: true, get: () => viewportWidth });
    Object.defineProperties(list, {
      clientWidth: { configurable: true, get: () => viewportWidth - 33 },
      scrollWidth: { configurable: true, value: 4 * 131 - 3 },
    });
    mockTabOffsets(list);
    fireEvent(window, new Event('resize'));
    expect(screen.queryByRole('button', { name: '超出标签栏的标签' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '向右滚动选项卡' })).not.toBeInTheDocument();
    viewportWidth = 320;
    fireEvent(window, new Event('resize'));
    expect(screen.getByRole('tab', { name: '成果概览' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getAllByRole('button', { name: '超出标签栏的标签' })).toHaveLength(1);
    const trigger = screen.getByRole('button', { name: '超出标签栏的标签' });
    expect(trigger).toBeVisible();
    expect(screen.queryByRole('button', { name: '向左滚动选项卡' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '向右滚动选项卡' })).not.toBeInTheDocument();
    await user.click(trigger);
    expectMenuItems(['井A.las', '井B.las']);
    expect(screen.getByRole('menuitemradio', { name: '井A.las' })).toHaveFocus();

    // Both outer tabs are clipped; the middle map tab remains fully visible.
    list.scrollLeft = 65;
    fireEvent.scroll(list);
    expectMenuItems(['成果概览', '井A.las', '井B.las']);
    expect(screen.getByRole('menuitemradio', { name: '井A.las' })).toHaveFocus();
    expect(screen.getByRole('menuitemradio', { name: '成果概览' })).toHaveAttribute('aria-checked', 'true');

    viewportWidth = 290;
    fireEvent(window, new Event('resize'));
    expectMenuItems(['综合成图', '井A.las', '井B.las']);
    expect(trigger).toHaveAttribute('title', '超出标签栏的标签');
    expect(screen.getByRole('menuitemradio', { name: '井A.las' })).toHaveFocus();

    // A 1px clip on each side is tolerated; a 2px clip is included.
    list.scrollLeft = 132;
    fireEvent.scroll(list);
    expectMenuItems(['成果概览', '井B.las']);
    expect(screen.getByRole('menuitemradio', { name: '成果概览' })).toHaveFocus();
    list.scrollLeft = 133;
    fireEvent.scroll(list);
    expectMenuItems(['成果概览', '综合成图', '井B.las']);
    list.scrollLeft = 131;
    fireEvent.scroll(list);
    expectMenuItems(['成果概览', '井A.las', '井B.las']);

    viewportWidth = 540;
    fireEvent(window, new Event('resize'));
    expect(screen.queryByRole('button', { name: '超出标签栏的标签' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: '成果概览' })).toHaveFocus();
    expect(screen.queryByRole('button', { name: '向左滚动选项卡' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '向右滚动选项卡' })).not.toBeInTheDocument();
  });

  it('下拉支持键盘选择、Escape 返回入口与点击外部收起', async () => {
    const user = userEvent.setup();
    render(<Harness/>);
    const list = screen.getByRole('tablist', { name: '成果选项卡' });
    Object.defineProperty(list.parentElement!, 'clientWidth', { configurable: true, value: 300 });
    Object.defineProperties(list, {
      clientWidth: { configurable: true, value: 267 },
      scrollWidth: { configurable: true, value: 4 * 131 - 3 },
    });
    mockTabOffsets(list);
    fireEvent(window, new Event('resize'));
    const trigger = screen.getByRole('button', { name: '超出标签栏的标签' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expectMenuItems(['井A.las', '井B.las']);
    expect(screen.getByRole('menuitemradio', { name: '井A.las' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: '井B.las' })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitemradio', { name: '井A.las' })).toHaveFocus();
    await user.keyboard('{End}{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith('file-b');
    expect(screen.getByRole('tab', { name: '井B.las' })).toHaveFocus();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(trigger);
    expectMenuItems(['成果概览', '综合成图']);
    expect(screen.getByRole('menuitemradio', { name: '成果概览' })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('menuitemradio', { name: '综合成图' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(trigger);
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('同名文件按各自ID独立切换和关闭', async () => {
    const user = userEvent.setup();
    const duplicateItems = items.map(item => item.closable ? { ...item, label: '同名成果.las' } : item);
    render(<Harness tabs={duplicateItems}/>);
    const tabs = screen.getAllByRole('tab', { name: '同名成果.las' });
    await user.click(tabs[1]);
    expect(onSelect).toHaveBeenLastCalledWith('file-b');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    await user.click(tabs[0]);
    expect(onSelect).toHaveBeenLastCalledWith('file-a');
    fireEvent(tabs[1], new MouseEvent('auxclick', { button: 1, bubbles: true }));
    expect(onClose).toHaveBeenLastCalledWith('file-b');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });

  it.each([
    { activeIndex: 0, nextActiveIndex: 0, description: '非当前标签，保持当前内容' },
    { activeIndex: 8, nextActiveIndex: 7, description: '当前标签，回到相邻内容' },
  ])('向右滚动后关闭$description，焦点所在相邻标签保持可见', async ({ activeIndex, nextActiveIndex }) => {
    const user = userEvent.setup();
    const manyTabs: ResultTabItem[] = Array.from({ length: 10 }, (_, index) => ({
      id: `file-${index}`, label: `成果${index}.las`, Icon: FileText, closable: true,
    }));
    const props = { items: manyTabs, activeId: manyTabs[activeIndex].id, onSelect, onClose, panelId: 'preview-panel' };
    const { rerender } = render(<ResultTabs {...props}/>);
    const list = screen.getByRole('tablist', { name: '成果选项卡' });
    Object.defineProperties(list, {
      clientWidth: { configurable: true, value: 250 },
      scrollWidth: { configurable: true, get: () => list.children.length * 131 - 3 },
    });
    within(list).getAllByRole('tab').forEach((tab, index) => {
      Object.defineProperties(tab.parentElement!, {
        offsetLeft: { configurable: true, value: index * 131 },
        offsetWidth: { configurable: true, value: 128 },
      });
    });
    list.scrollLeft = 700;
    fireEvent.scroll(list);
    const closingTab = screen.getByRole('tab', { name: '成果8.las' });
    closingTab.focus({ preventScroll: true });
    fireEvent(closingTab, new MouseEvent('auxclick', { button: 1, bubbles: true }));
    expect(onClose).toHaveBeenLastCalledWith('file-8');
    rerender(<ResultTabs {...props} items={manyTabs.filter(tab => tab.id !== 'file-8')} activeId={`file-${nextActiveIndex}`}/>);

    const neighbor = screen.getByRole('tab', { name: '成果7.las' });
    expect(screen.getByRole('tab', { name: `成果${nextActiveIndex}.las` })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('tab', { name: '成果8.las' })).not.toBeInTheDocument();
    expect(neighbor).toHaveFocus();
    expect(list.scrollLeft).toBeGreaterThanOrEqual(700);
    expect(neighbor.parentElement!.offsetLeft).toBeGreaterThanOrEqual(list.scrollLeft);
    expect(neighbor.parentElement!.offsetLeft + neighbor.parentElement!.offsetWidth)
      .toBeLessThanOrEqual(list.scrollLeft + list.clientWidth);

    // Reactivating the current tab still reveals it without changing the active ID.
    list.scrollLeft = nextActiveIndex === 0 ? 700 : 0;
    fireEvent.scroll(list);
    const current = screen.getByRole('tab', { name: `成果${nextActiveIndex}.las` });
    current.focus({ preventScroll: true });
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith(`file-${nextActiveIndex}`);
    expect(current).toHaveFocus();
    expect(current).toHaveAttribute('aria-selected', 'true');
    expect(current.parentElement!.offsetLeft).toBeGreaterThanOrEqual(list.scrollLeft);
    expect(current.parentElement!.offsetLeft + current.parentElement!.offsetWidth)
      .toBeLessThanOrEqual(list.scrollLeft + list.clientWidth);
  });
});
