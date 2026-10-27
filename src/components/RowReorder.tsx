import { useCallback, useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Menu } from 'lucide-react';
import { useTranslation } from '../i18n';
import './RowReorder.css';

export interface ReorderItem { id: string; parentId?: string; label: string }
export type ReorderPlacement = 'before' | 'after';
interface RowReorderOptions {
    items: ReorderItem[];
    scopeKey: string;
    onReorder: (sourceId: string, targetId: string, placement: ReorderPlacement) => void;
}
interface Destination { targetId: string; placement: ReorderPlacement; lineId: string }
interface Visual { sourceId: string; destination: Destination | null }
interface Session {
    sourceId: string;
    mode: 'pointer' | 'keyboard';
    active: boolean;
    pointerId?: number;
    startX: number;
    startY: number;
    x: number;
    y: number;
    position: number;
    destination: Destination | null;
    handle: HTMLButtonElement;
}
interface Bounds { left: number; right: number; top: number; bottom: number }
const parentOf = (item: ReorderItem) => item.parentId || '';
const contains = (bounds: Bounds, x: number, y: number) => x >= bounds.left && x <= bounds.right && y >= bounds.top && y <= bounds.bottom;
const scrollOverflow = /(auto|scroll|overlay)/;
const clippedOverflow = /(auto|scroll|overlay|hidden|clip)/;

/** Include scroll clipping, not just the much larger off-screen table rectangle. */
function visibleBounds(element: HTMLElement): Bounds {
    const rect = element.getBoundingClientRect();
    const result = { left: Math.max(0, rect.left), right: Math.min(window.innerWidth, rect.right), top: Math.max(0, rect.top), bottom: Math.min(window.innerHeight, rect.bottom) };
    for (let ancestor = element.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const style = getComputedStyle(ancestor), bounds = ancestor.getBoundingClientRect();
        if (clippedOverflow.test(style.overflowX || style.overflow)) {
            result.left = Math.max(result.left, bounds.left); result.right = Math.min(result.right, bounds.right);
        }
        if (clippedOverflow.test(style.overflowY || style.overflow)) {
            result.top = Math.max(result.top, bounds.top); result.bottom = Math.min(result.bottom, bounds.bottom);
        }
    }
    return result;
}
function isDescendant(id: string, ancestorId: string, items: ReorderItem[]): boolean {
    const byId = new Map(items.map(item => [item.id, item]));
    const seen = new Set<string>();
    let current = byId.get(id);
    while (current && !seen.has(current.id)) {
        if (current.id === ancestorId) return true;
        seen.add(current.id); current = current.parentId ? byId.get(current.parentId) : undefined;
    }
    return false;
}

/** The caller renders announcement in its own polite aria-live region. */
export function useRowReorder({ items, scopeKey, onReorder }: RowReorderOptions) {
    const { t } = useTranslation();
    const table = useRef<HTMLTableElement | null>(null);
    const session = useRef<Session | null>(null);
    const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
    const latest = useRef({ items, onReorder, t });
    latest.current = { items, onReorder, t };
    const [visual, setVisual] = useState<Visual | null>(null);
    const [announcement, setAnnouncement] = useState('');
    const structureKey = JSON.stringify(items.map(item => [item.id, parentOf(item)]));
    const tableRef = useCallback((node: HTMLTableElement | null) => { table.current = node; }, []);
    const rows = () => Array.from(table.current?.querySelectorAll<HTMLTableRowElement>('tbody tr[data-reorder-id]') ?? []);
    const siblings = (id: string) => {
        const source = latest.current.items.find(item => item.id === id);
        return source ? latest.current.items.filter(item => parentOf(item) === parentOf(source)) : [];
    };
    const clearTimers = () => {
        if (holdTimer.current !== null) clearTimeout(holdTimer.current);
        if (scrollTimer.current !== null) clearInterval(scrollTimer.current);
        holdTimer.current = null; scrollTimer.current = null;
    };
    const lineFor = (targetId: string, placement: ReorderPlacement) => {
        if (placement === 'before') return targetId;
        const descendants = rows().filter(row => isDescendant(row.dataset.reorderId!, targetId, latest.current.items));
        return descendants.at(-1)?.dataset.reorderId || targetId;
    };
    const changedPosition = (current: Session, destination: Destination) => {
        const peers = siblings(current.sourceId), sourceIndex = peers.findIndex(item => item.id === current.sourceId);
        const remaining = peers.filter(item => item.id !== current.sourceId);
        const targetIndex = remaining.findIndex(item => item.id === destination.targetId);
        return targetIndex >= 0 && targetIndex + (destination.placement === 'after' ? 1 : 0) !== sourceIndex;
    };
    const finish = (commit: boolean, announce = true) => {
        const current = session.current;
        clearTimers(); session.current = null; setVisual(null);
        if (!current) return;
        const destination = current.destination;
        if (commit && current.active && destination && changedPosition(current, destination)) {
            latest.current.onReorder(current.sourceId, destination.targetId, destination.placement);
            setAnnouncement(latest.current.t('已调整{name}的顺序', { name: latest.current.items.find(item => item.id === current.sourceId)?.label || '' }));
        } else if (announce && current.active) setAnnouncement(latest.current.t('已取消排序'));
        if (current.active && current.handle.isConnected) current.handle.focus({ preventScroll: true });
    };
    const setDestination = (current: Session, destination: Destination | null) => {
        const previous = current.destination;
        current.destination = destination;
        if (previous?.targetId === destination?.targetId && previous?.placement === destination?.placement && previous?.lineId === destination?.lineId) return;
        setVisual({ sourceId: current.sourceId, destination });
        if (destination) {
            const target = latest.current.items.find(item => item.id === destination.targetId);
            setAnnouncement(latest.current.t(destination.placement === 'before' ? '将移到{name}之前' : '将移到{name}之后', { name: target?.label || '' }));
        }
    };
    const destinationAt = (current: Session): Destination | null => {
        const element = table.current;
        if (!element) return null;
        const hit = document.elementFromPoint?.(current.x, current.y);
        const hitRow = hit?.closest<HTMLTableRowElement>('tr[data-reorder-id]');
        const row = hitRow && element.contains(hitRow) ? hitRow : !document.elementFromPoint
            ? rows().find(candidate => contains(candidate.getBoundingClientRect(), current.x, current.y)) : undefined;
        if (!row) return null;
        const source = latest.current.items.find(item => item.id === current.sourceId);
        let target = latest.current.items.find(item => item.id === row.dataset.reorderId);
        const seen = new Set<string>();
        // Hovering any child of a sibling group targets that whole group.
        while (source && target && parentOf(target) !== parentOf(source) && !seen.has(target.id)) {
            seen.add(target.id);
            target = target.parentId ? latest.current.items.find(item => item.id === target!.parentId) : undefined;
        }
        if (!source || !target || parentOf(target) !== parentOf(source) || target.id === source.id) return null;
        const rect = row.getBoundingClientRect();
        const placement = target.id !== row.dataset.reorderId || current.y >= (rect.top + rect.bottom) / 2 ? 'after' : 'before';
        return { targetId: target.id, placement, lineId: lineFor(target.id, placement) };
    };
    const inside = (current: Session) => !!table.current && contains(visibleBounds(table.current), current.x, current.y);
    const updatePointer = (current: Session) => {
        if (!inside(current)) { finish(false); return; }
        setDestination(current, destinationAt(current));
    };
    const autoScroll = () => {
        const current = session.current, element = table.current;
        if (!current?.active || current.mode !== 'pointer' || !element) return;
        if (!inside(current)) { finish(false); return; }
        let movedX = false, movedY = false;
        for (let ancestor = element.parentElement; ancestor && (!movedX || !movedY); ancestor = ancestor.parentElement) {
            const style = getComputedStyle(ancestor), bounds = visibleBounds(ancestor);
            const isDocument = ancestor === document.scrollingElement;
            if (!contains(bounds, current.x, current.y)) continue;
            const velocity = (point: number, start: number, end: number) => point < start + 36 ? -Math.ceil((start + 36 - point) / 3)
                : point > end - 36 ? Math.ceil((point - end + 36) / 3) : 0;
            if (!movedY && (isDocument || scrollOverflow.test(style.overflowY || style.overflow)) && ancestor.scrollHeight > ancestor.clientHeight) {
                const before = ancestor.scrollTop;
                ancestor.scrollTop = Math.max(0, Math.min(ancestor.scrollHeight - ancestor.clientHeight, before + velocity(current.y, bounds.top, bounds.bottom)));
                movedY = ancestor.scrollTop !== before;
            }
            if (!movedX && (isDocument || scrollOverflow.test(style.overflowX || style.overflow)) && ancestor.scrollWidth > ancestor.clientWidth) {
                const before = ancestor.scrollLeft;
                ancestor.scrollLeft = Math.max(0, Math.min(ancestor.scrollWidth - ancestor.clientWidth, before + velocity(current.x, bounds.left, bounds.right)));
                movedX = ancestor.scrollLeft !== before;
            }
        }
        if (movedX || movedY) updatePointer(current);
    };
    const activate = (current: Session) => {
        if (session.current !== current || !table.current || !current.handle.isConnected) return;
        if (current.mode === 'pointer' && !inside(current)) { finish(false, false); return; }
        current.active = true;
        setVisual({ sourceId: current.sourceId, destination: null });
        setAnnouncement(latest.current.t('正在排序{name}，使用上下方向键选择位置，按空格或回车确认，按Escape取消', { name: latest.current.items.find(item => item.id === current.sourceId)?.label || '' }));
        if (current.mode === 'pointer') scrollTimer.current = setInterval(autoScroll, 16);
    };
    const startPointer = (id: string, event: ReactPointerEvent<HTMLButtonElement>) => {
        if (event.button !== 0 || event.isPrimary === false || siblings(id).length < 2 || session.current) return;
        event.preventDefault(); event.stopPropagation();
        event.currentTarget.focus({ preventScroll: true });
        const current: Session = { sourceId: id, mode: 'pointer', active: false, pointerId: event.pointerId,
            startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, position: 0, destination: null, handle: event.currentTarget };
        session.current = current;
        holdTimer.current = setTimeout(() => { holdTimer.current = null; activate(current); }, 300);
    };
    const keyDown = (id: string, event: ReactKeyboardEvent<HTMLButtonElement>) => {
        const confirmation = event.key === ' ' || event.key === 'Enter' || event.key === 'Spacebar';
        let current = session.current;
        if (!current) {
            if (!confirmation || event.repeat || siblings(id).length < 2) return;
            event.preventDefault(); event.stopPropagation();
            current = { sourceId: id, mode: 'keyboard', active: false, startX: 0, startY: 0, x: 0, y: 0,
                position: siblings(id).findIndex(item => item.id === id), destination: null, handle: event.currentTarget };
            session.current = current; activate(current); return;
        }
        if (current.mode !== 'keyboard' || current.sourceId !== id) return;
        if (event.key === 'Tab') { finish(false); return; }
        if (confirmation) {
            event.preventDefault(); event.stopPropagation();
            if (!event.repeat) finish(true);
        } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'Home' || event.key === 'End') {
            event.preventDefault(); event.stopPropagation();
            const remaining = siblings(id).filter(item => item.id !== id);
            current.position = Math.max(0, Math.min(remaining.length, event.key === 'Home' ? 0 : event.key === 'End' ? remaining.length
                : current.position + (event.key === 'ArrowDown' ? 1 : -1)));
            const target = remaining[current.position] || remaining.at(-1);
            if (!target) return;
            const placement = current.position < remaining.length ? 'before' : 'after';
            const lineId = lineFor(target.id, placement);
            setDestination(current, { targetId: target.id, placement, lineId });
            rows().find(row => row.dataset.reorderId === lineId)?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        }
    };
    // Stable native listeners read the newest callbacks without interrupting a drag on render.
    const events = useRef({ move: (_event: PointerEvent) => {}, up: (_event: PointerEvent) => {}, cancel: () => {}, escape: (_event: KeyboardEvent) => {} });
    events.current = {
        move(event) {
            const current = session.current;
            if (!current || current.mode !== 'pointer' || event.pointerId !== current.pointerId) return;
            current.x = event.clientX; current.y = event.clientY;
            if (!current.active) {
                if (Math.hypot(current.x - current.startX, current.y - current.startY) > 8) finish(false, false);
                return;
            }
            event.preventDefault(); updatePointer(current);
        },
        up(event) {
            const current = session.current;
            if (!current || current.mode !== 'pointer' || event.pointerId !== current.pointerId) return;
            current.x = event.clientX; current.y = event.clientY;
            if (current.active && inside(current)) current.destination = destinationAt(current);
            else current.destination = null;
            finish(current.active && !!current.destination);
        },
        cancel() { if (session.current) finish(false); },
        escape(event) {
            if (event.key !== 'Escape' || !session.current) return;
            event.preventDefault(); event.stopPropagation(); finish(false);
        },
    };
    useEffect(() => {
        const move = (event: PointerEvent) => events.current.move(event);
        const up = (event: PointerEvent) => events.current.up(event);
        const cancel = () => events.current.cancel();
        const escape = (event: KeyboardEvent) => events.current.escape(event);
        const visibility = () => { if (document.hidden) cancel(); };
        window.addEventListener('pointermove', move, { passive: false });
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', cancel);
        window.addEventListener('blur', cancel);
        window.addEventListener('keydown', escape, true);
        document.addEventListener('visibilitychange', visibility);
        return () => {
            clearTimers(); session.current = null;
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            window.removeEventListener('pointercancel', cancel);
            window.removeEventListener('blur', cancel);
            window.removeEventListener('keydown', escape, true);
            document.removeEventListener('visibilitychange', visibility);
        };
    }, []);
    useEffect(() => { if (session.current) finish(false); }, [scopeKey, structureKey]);

    return {
        tableProps: { ref: tableRef, 'data-reorder-active': visual ? 'true' : undefined },
        rowProps: (id: string) => ({
            'data-reorder-id': id,
            className: [visual && isDescendant(id, visual.sourceId, items) ? 'row-reorder-source' : '',
                visual?.destination?.lineId === id ? `row-reorder-${visual.destination.placement}` : ''].filter(Boolean).join(' '),
        }),
        handleProps: (id: string): ButtonHTMLAttributes<HTMLButtonElement> => ({
            title: t('长按拖动排序'),
            'aria-label': t('拖动排序{name}', { name: items.find(item => item.id === id)?.label || '' }),
            'aria-pressed': visual?.sourceId === id,
            disabled: siblings(id).length < 2,
            onPointerDown: event => startPointer(id, event),
            onKeyDown: event => keyDown(id, event),
            onBlur: () => { if (session.current?.mode === 'keyboard' && session.current.sourceId === id) finish(false); },
            onClick: event => { event.preventDefault(); event.stopPropagation(); },
            onContextMenu: event => event.preventDefault(),
        }),
        announcement,
    };
}

export function RowReorderHandle({ className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
    return <button {...props} type="button" className={`icon-button action-drag row-reorder-handle ${className}`.trim()}><Menu size={18} aria-hidden="true"/></button>;
}
