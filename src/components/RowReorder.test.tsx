import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RowReorderHandle, useRowReorder } from './RowReorder';
import type { ReorderItem, ReorderPlacement } from './RowReorder';

class TestPointerEvent extends MouseEvent {
    pointerId: number;
    isPrimary: boolean;
    pointerType: string;
    constructor(type: string, options: PointerEventInit = {}) {
        super(type, options);
        this.pointerId = options.pointerId ?? 1;
        this.isPrimary = options.isPrimary ?? true;
        this.pointerType = options.pointerType ?? 'mouse';
    }
}
const flat: ReorderItem[] = [{ id: 'a', label: '甲' }, { id: 'b', label: '乙' }, { id: 'c', label: '丙' }];
const tree: ReorderItem[] = [
    { id: 'a', label: '甲组' }, { id: 'a1', parentId: 'a', label: '甲一' }, { id: 'a2', parentId: 'a', label: '甲二' },
    { id: 'b', label: '乙组' }, { id: 'b1', parentId: 'b', label: '乙一' }, { id: 'b11', parentId: 'b1', label: '乙孙' },
];
function Harness({ items = flat, scopeKey = 'one', visible, onReorder }: {
    items?: ReorderItem[]; scopeKey?: string; visible?: string[];
    onReorder: (source: string, target: string, placement: ReorderPlacement) => void;
}) {
    const reorder = useRowReorder({ items, scopeKey, onReorder });
    return <><div data-testid="viewport" style={{ overflow: 'auto' }}><table {...reorder.tableProps}>
        <thead><tr><th>名称</th><th>操作</th></tr></thead>
        <tbody>{items.filter(item => !visible || visible.includes(item.id)).map(item => <tr key={item.id} {...reorder.rowProps(item.id)}>
            <td>{item.label}</td><td><RowReorderHandle {...reorder.handleProps(item.id)}/></td>
        </tr>)}</tbody>
    </table></div><span role="status" aria-live="polite">{reorder.announcement}</span></>;
}
const handle = (name: string) => screen.getByRole('button', { name: `拖动排序${name}` });
const row = (id: string) => document.querySelector<HTMLTableRowElement>(`tr[data-reorder-id="${id}"]`)!;
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const pointer = { pointerId: 1, button: 0, clientX: 100, clientY: 40 };
function rect(left: number, top: number, width: number, height: number): DOMRect {
    return { x: left, y: top, left, top, width, height, right: left + width, bottom: top + height, toJSON: () => ({}) };
}
/** Geometry follows scroll offsets, as in a browser; targets are actual DOM rows. */
function geometry({ width = 400, height = 300, contentWidth = width }: { width?: number; height?: number; contentWidth?: number } = {}) {
    const viewport = screen.getByTestId('viewport'), table = screen.getByRole('table');
    const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>('tbody tr'));
    const contentHeight = 20 + rows.length * 40;
    vi.spyOn(viewport, 'getBoundingClientRect').mockImplementation(() => rect(0, 0, width, height));
    vi.spyOn(table, 'getBoundingClientRect').mockImplementation(() => rect(-viewport.scrollLeft, -viewport.scrollTop, contentWidth, contentHeight));
    rows.forEach((element, index) => vi.spyOn(element, 'getBoundingClientRect')
        .mockImplementation(() => rect(-viewport.scrollLeft, 20 + index * 40 - viewport.scrollTop, contentWidth, 40)));
    Object.defineProperties(viewport, {
        clientWidth: { configurable: true, value: width }, scrollWidth: { configurable: true, value: contentWidth },
        clientHeight: { configurable: true, value: height }, scrollHeight: { configurable: true, value: contentHeight },
    });
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: vi.fn((x: number, y: number) => {
        if (x < 0 || x > width || y < 0 || y > height) return document.body;
        return rows.find(element => { const bounds = element.getBoundingClientRect(); return y >= bounds.top && y < bounds.bottom; })?.cells[0] || table;
    }) });
    return { viewport, table };
}
function start(name = '甲', options: PointerEventInit = {}) {
    fireEvent.pointerDown(handle(name), { ...pointer, ...options }); advance(300);
}
function move(x: number, y: number, pointerId = 1) { fireEvent.pointerMove(window, { pointerId, clientX: x, clientY: y }); }
function up(x: number, y: number) { fireEvent.pointerUp(window, { pointerId: 1, clientX: x, clientY: y }); }

beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('PointerEvent', TestPointerEvent); });
afterEach(() => {
    cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
    Reflect.deleteProperty(document, 'elementFromPoint');
});

describe('长按表格排序', () => {
    it('短按、右键及非主指针不排序；必须完整按住300ms才激活', () => {
        const onReorder = vi.fn(); render(<Harness onReorder={onReorder}/>); geometry();
        fireEvent.pointerDown(handle('甲'), pointer); advance(299);
        expect(handle('甲')).toHaveAttribute('aria-pressed', 'false');
        up(100, 130); advance(1000); fireEvent.click(handle('甲'));
        expect(onReorder).not.toHaveBeenCalled();
        fireEvent.pointerDown(handle('甲'), { ...pointer, button: 2 }); advance(300);
        fireEvent.pointerDown(handle('甲'), { ...pointer, isPrimary: false }); advance(300);
        expect(handle('甲')).toHaveAttribute('aria-pressed', 'false');
        fireEvent.pointerDown(handle('甲'), pointer); advance(299);
        expect(handle('甲')).toHaveAttribute('aria-pressed', 'false'); advance(1);
        expect(handle('甲')).toHaveAttribute('aria-pressed', 'true');
        expect(row('a')).toHaveClass('row-reorder-source');
        expect(screen.getByRole('status')).toHaveTextContent('正在排序甲');
    });
    it('长按前移动超过8px取消，其他指针的移动不会影响当前长按', () => {
        const onReorder = vi.fn(); render(<Harness onReorder={onReorder}/>); geometry();
        fireEvent.pointerDown(handle('甲'), pointer); move(109, 40); advance(500);
        expect(handle('甲')).toHaveAttribute('aria-pressed', 'false'); up(100, 130);
        expect(onReorder).not.toHaveBeenCalled();
        fireEvent.pointerDown(handle('甲'), pointer); move(200, 130, 2); move(105, 43); advance(300);
        expect(handle('甲')).toHaveAttribute('aria-pressed', 'true');
    });
    it('上半行与下半行产生明确前后插入线，松开只提交一次并清理视觉状态', () => {
        const onReorder = vi.fn(); render(<Harness onReorder={onReorder}/>); geometry();
        start('乙', { clientY: 80 }); move(100, 25);
        expect(row('a')).toHaveClass('row-reorder-before');
        expect(screen.getByRole('status')).toHaveTextContent('将移到甲之前');
        up(100, 25);
        expect(onReorder).toHaveBeenLastCalledWith('b', 'a', 'before');
        expect(handle('乙')).toHaveAttribute('aria-pressed', 'false');
        expect(row('a')).not.toHaveClass('row-reorder-before');
        start('甲'); move(100, 130);
        expect(row('c')).toHaveClass('row-reorder-after'); up(100, 130); up(100, 130);
        expect(onReorder).toHaveBeenLastCalledWith('a', 'c', 'after');
        expect(onReorder).toHaveBeenCalledTimes(2);
        expect(vi.getTimerCount()).toBe(0);
    });
    it('落在原位置、表头或其他父级下不提交', () => {
        const onReorder = vi.fn(); const view = render(<Harness onReorder={onReorder}/>); geometry();
        start(); move(100, 65); up(100, 65); // Already immediately before b.
        start(); move(100, 10); up(100, 10);
        expect(onReorder).not.toHaveBeenCalled();
        view.unmount(); render(<Harness items={tree} onReorder={onReorder}/>); geometry();
        start('甲一', { clientY: 80 }); move(100, 190); up(100, 190);
        expect(onReorder).not.toHaveBeenCalled();
    });
    it('父组落在另一组子孙行归算到同级父组，after线位于最后子孙行', () => {
        const onReorder = vi.fn(); render(<Harness items={tree} onReorder={onReorder}/>); geometry();
        start('甲组'); move(100, 190);
        expect(row('a1')).toHaveClass('row-reorder-source');
        expect(row('a2')).toHaveClass('row-reorder-source');
        expect(row('b11')).toHaveClass('row-reorder-after');
        expect(row('b')).not.toHaveClass('row-reorder-after');
        up(100, 190);
        expect(onReorder).toHaveBeenCalledWith('a', 'b', 'after');
        start('乙组', { clientY: 160 }); move(100, 25);
        expect(row('a')).toHaveClass('row-reorder-before'); up(100, 25);
        expect(onReorder).toHaveBeenLastCalledWith('b', 'a', 'before');
    });
    it.each(['Escape', 'pointercancel', 'blur', 'outside'] as const)('%s取消后再松开也不会提交', reason => {
        const onReorder = vi.fn(); render(<Harness onReorder={onReorder}/>); geometry({ width: 200, contentWidth: 500 });
        start(); move(100, 130);
        if (reason === 'Escape') fireEvent.keyDown(window, { key: 'Escape' });
        else if (reason === 'pointercancel') fireEvent.pointerCancel(window, { pointerId: 1 });
        else if (reason === 'blur') fireEvent.blur(window);
        else move(250, 130); // Still within table bounds, but outside the clipped viewport.
        expect(handle('甲')).toHaveAttribute('aria-pressed', 'false');
        expect(row('c')).not.toHaveClass('row-reorder-after'); up(100, 130);
        expect(onReorder).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
    });
    it('在有效区域以外松开、作用域变化、数据结构变化及卸载均取消待提交操作', () => {
        const onReorder = vi.fn(); const view = render(<Harness onReorder={onReorder}/>); geometry();
        start(); move(100, 130); up(800, 130); expect(onReorder).not.toHaveBeenCalled();
        start(); move(100, 130); view.rerender(<Harness onReorder={onReorder} scopeKey="changed"/>); up(100, 130);
        expect(onReorder).not.toHaveBeenCalled(); expect(handle('甲')).toHaveAttribute('aria-pressed', 'false');
        start(); view.rerender(<Harness onReorder={onReorder} scopeKey="changed" items={flat.slice(0, 2)}/>);
        expect(handle('甲')).toHaveAttribute('aria-pressed', 'false');
        fireEvent.pointerDown(handle('甲'), pointer); view.unmount(); advance(500); up(100, 130);
        expect(onReorder).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
    });
    it('触屏长按支持边缘双向自动滚动，取消后立即停止', () => {
        const onReorder = vi.fn(), items = Array.from({ length: 10 }, (_, i) => ({ id: String(i), label: `行${i}` }));
        render(<Harness items={items} onReorder={onReorder}/>);
        const { viewport } = geometry({ width: 200, height: 120, contentWidth: 500 });
        start('行0', { pointerType: 'touch' }); move(195, 115); advance(64);
        expect(viewport.scrollTop).toBeGreaterThan(0); expect(viewport.scrollLeft).toBeGreaterThan(0);
        const top = viewport.scrollTop, left = viewport.scrollLeft;
        fireEvent.keyDown(window, { key: 'Escape' }); advance(200);
        expect(viewport.scrollTop).toBe(top); expect(viewport.scrollLeft).toBe(left);
        expect(onReorder).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
    });
});

describe('键盘排序与可访问性', () => {
    it('Space/Enter进入和确认、方向键调整，回到原位置不提交，Escape取消', () => {
        const onReorder = vi.fn(); render(<Harness onReorder={onReorder}/>);
        const source = handle('乙');
        fireEvent.keyDown(source, { key: ' ' }); expect(source).toHaveAttribute('aria-pressed', 'true');
        fireEvent.keyDown(source, { key: 'ArrowDown' }); fireEvent.keyDown(source, { key: 'Enter' });
        expect(onReorder).toHaveBeenCalledWith('b', 'c', 'after');
        fireEvent.keyDown(source, { key: 'Enter' }); fireEvent.keyDown(source, { key: 'ArrowUp' });
        fireEvent.keyDown(source, { key: 'ArrowDown' }); fireEvent.keyDown(source, { key: ' ' });
        expect(onReorder).toHaveBeenCalledTimes(1);
        fireEvent.keyDown(source, { key: ' ' }); fireEvent.keyDown(source, { key: 'ArrowUp' }); fireEvent.keyDown(source, { key: 'Escape' });
        expect(onReorder).toHaveBeenCalledTimes(1); expect(source).toHaveAttribute('aria-pressed', 'false');
    });
    it('仅按同父完整数据排序，隐藏的同级项仍支持键盘定位，唯一同级手柄禁用', () => {
        const onReorder = vi.fn(); render(<Harness items={tree} visible={['a', 'a2', 'b', 'b1']} onReorder={onReorder}/>);
        expect(handle('乙一')).toBeDisabled();
        fireEvent.keyDown(handle('甲二'), { key: 'Enter' }); fireEvent.keyDown(handle('甲二'), { key: 'ArrowUp' }); fireEvent.keyDown(handle('甲二'), { key: 'Enter' });
        expect(onReorder).toHaveBeenCalledWith('a2', 'a1', 'before');
    });
    it('按键重复不会直接提交；Tab离开、失焦均取消，手柄阻止触屏上下文菜单', () => {
        const onReorder = vi.fn(); render(<Harness onReorder={onReorder}/>);
        const source = handle('甲');
        fireEvent.keyDown(source, { key: ' ' }); fireEvent.keyDown(source, { key: ' ', repeat: true });
        expect(source).toHaveAttribute('aria-pressed', 'true');
        fireEvent.keyDown(source, { key: 'ArrowDown' }); fireEvent.keyDown(source, { key: 'Tab' });
        expect(source).toHaveAttribute('aria-pressed', 'false');
        fireEvent.keyDown(source, { key: ' ' }); fireEvent.blur(source);
        expect(source).toHaveAttribute('aria-pressed', 'false');
        expect(fireEvent.contextMenu(source)).toBe(false);
        expect(source).toHaveAttribute('title', '长按拖动排序');
        expect(onReorder).not.toHaveBeenCalled();
    });
});
