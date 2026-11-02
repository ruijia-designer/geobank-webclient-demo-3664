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

beforeEach(() => { vi.clearAllMocks(); });

describe('成果浏览器式选项卡', () => {
  it('方向键及首尾快捷键切换当前标签，焦点和选中状态同步', async () => {
    const user = userEvent.setup();
    render(<Harness/>);
    const overview = screen.getByRole('tab', { name: '成果概览' });
    const map = screen.getByRole('tab', { name: '综合成图' });
    const fileScroller = screen.getByRole('tablist', { name: '成果选项卡' }).querySelector('.result-file-tabs');
    expect(fileScroller).not.toContainElement(overview);
    expect(fileScroller).not.toContainElement(map);
    expect(fileScroller).toContainElement(screen.getByRole('tab', { name: '井A.las' }));
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

  it('多个标签直接显示在横向标签条中并可切换，不提供下拉列表入口', async () => {
    const user = userEvent.setup();
    const manyTabs: ResultTabItem[] = Array.from({ length: 12 }, (_, index) => ({
      id: `file-${index}`, label: `成果${index}.las`, Icon: FileText, closable: index > 0,
    }));
    render(<Harness tabs={manyTabs} initial="file-0"/>);
    const strip = within(screen.getByRole('tablist', { name: '成果选项卡' }));
    expect(strip.getAllByRole('tab')).toHaveLength(12);
    expect(screen.queryByRole('button', { name: '已打开的选项卡' })).not.toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(strip.getByRole('tab', { name: '成果11.las' }));
    expect(onSelect).toHaveBeenLastCalledWith('file-11');
    expect(strip.getByRole('tab', { name: '成果11.las' })).toHaveAttribute('aria-selected', 'true');
    await user.click(strip.getByRole('tab', { name: '成果3.las' }));
    expect(onSelect).toHaveBeenLastCalledWith('file-3');
    expect(strip.getByRole('tab', { name: '成果3.las' })).toHaveAttribute('aria-selected', 'true');
    expect(strip.getAllByRole('tab')).toHaveLength(12);
  });

  it('固定概览激活时仍随文件区宽度变化显示或收起滚动箭头', () => {
    render(<Harness/>);
    const fileScroller = screen.getByRole('tablist', { name: '成果选项卡' }).querySelector('.result-file-tabs') as HTMLElement;
    let viewportWidth = 600;
    Object.defineProperties(fileScroller, {
      clientWidth: { configurable: true, get: () => viewportWidth },
      scrollWidth: { configurable: true, value: 400 },
    });
    fireEvent(window, new Event('resize'));
    expect(screen.queryByRole('button', { name: '向右滚动选项卡' })).not.toBeInTheDocument();

    viewportWidth = 220;
    fireEvent(window, new Event('resize'));
    expect(screen.getByRole('tab', { name: '成果概览' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('button', { name: '向左滚动选项卡' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '向右滚动选项卡' })).toBeEnabled();

    viewportWidth = 600;
    fireEvent(window, new Event('resize'));
    expect(screen.queryByRole('button', { name: '向左滚动选项卡' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '向右滚动选项卡' })).not.toBeInTheDocument();
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
    const list = screen.getByRole('tablist', { name: '成果选项卡' }).querySelector('.result-file-tabs') as HTMLElement;
    Object.defineProperties(list, {
      clientWidth: { configurable: true, value: 250 },
      scrollWidth: { configurable: true, get: () => list.children.length * 136 },
    });
    within(list).getAllByRole('tab').forEach((tab, index) => {
      Object.defineProperties(tab.parentElement!, {
        offsetLeft: { configurable: true, value: index * 136 },
        offsetWidth: { configurable: true, value: 136 },
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
