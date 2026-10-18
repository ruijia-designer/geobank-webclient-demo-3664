import { useTranslation } from '../i18n';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { MIN_RESULT_LAYOUT_WIDTH, resolveResultColumns, resizeResultColumns } from '../services/resultLayout';
import type { ResultColumnPreference, ResultColumnSizes, ResultLayoutMode } from '../services/resultLayout';

type Divider = 'directory' | 'information';
interface DragSession {
    pointerId: number;
    target: HTMLDivElement;
    startX: number;
    width: number;
    sizes: ResultColumnSizes;
    preference: ResultColumnPreference;
    divider: Divider;
    mode: ResultLayoutMode;
}

/** Layout preferences live only for this mounted results page, never in storage. */
export function useResultColumns(mode: ResultLayoutMode, enabled: boolean) {
  const {t}=useTranslation();
    const containerRef = useRef<HTMLDivElement>(null);
    const [width, setWidth] = useState(() => window.innerWidth);
    const [preference, setPreference] = useState<ResultColumnPreference>({ directoryWidth: null, informationRatio: null });
    const [resizing, setResizing] = useState<Divider | null>(null);
    const dragRef = useRef<DragSession | null>(null);
    const sizes = resolveResultColumns(width, preference);

    const stopResize = useCallback(() => {
        const drag = dragRef.current;
        dragRef.current = null;
        setResizing(null);
        if (drag?.target.hasPointerCapture?.(drag.pointerId)) drag.target.releasePointerCapture(drag.pointerId);
    }, []);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const measure = () => {
            stopResize();
            setWidth(container.getBoundingClientRect().width || window.innerWidth);
        };
        measure();
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
        observer?.observe(container);
        window.addEventListener('resize', measure);
        return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
    }, [stopResize]);

    useEffect(() => {
        stopResize();
        window.addEventListener('blur', stopResize);
        return () => window.removeEventListener('blur', stopResize);
    }, [mode, enabled, stopResize]);

    const startResize = (divider: Divider, event: PointerEvent<HTMLDivElement>) => {
        if (!enabled || event.button !== 0 || (divider === 'information' && mode !== 'split')) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        dragRef.current = { pointerId: event.pointerId, target: event.currentTarget, startX: event.clientX,
            width, sizes, preference, divider, mode };
        event.currentTarget.setPointerCapture?.(event.pointerId);
        setResizing(divider);
    };

    const moveResize = (event: PointerEvent<HTMLDivElement>) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        setPreference(resizeResultColumns(drag.width, drag.sizes, drag.preference, drag.divider, event.clientX - drag.startX, drag.mode));
    };

    const keyboardResize = (divider: Divider, event: KeyboardEvent<HTMLDivElement>) => {
        if (!enabled || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        setPreference(resizeResultColumns(width, sizes, preference, divider, event.key === 'ArrowRight' ? 10 : -10, mode));
    };

    const separatorProps = (divider: Divider) => ({
        role: 'separator' as const,
        tabIndex: 0,
        'aria-orientation': 'vertical' as const,
        'aria-label': t(divider === 'directory' ? '调整成果目录宽度' : '调整项目信息与成果区宽度'),
        'aria-valuemin': divider === 'directory' ? 200 : 420,
        'aria-valuemax': divider === 'directory' ? Math.min(360, mode === 'split' ? sizes.directory + sizes.information - 420 : Math.max(MIN_RESULT_LAYOUT_WIDTH, width) - 840) : sizes.information + sizes.right - 420,
        'aria-valuenow': Math.round(divider === 'directory' ? sizes.directory : sizes.information),
        title: t('拖动调整宽度，或用左右方向键微调'),
        className: `results-resizer results-resizer-${divider}${resizing === divider ? ' active' : ''}`,
        onPointerDown: (event: PointerEvent<HTMLDivElement>) => startResize(divider, event),
        onPointerMove: moveResize,
        onPointerUp: (event: PointerEvent<HTMLDivElement>) => { moveResize(event); stopResize(); },
        onPointerCancel: stopResize,
        onLostPointerCapture: stopResize,
        onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => keyboardResize(divider, event),
    });

    const style = {
        '--results-directory-width': `${sizes.directory}px`,
        '--results-information-width': `${sizes.information}px`,
        '--results-content-start': `${mode === 'right' ? sizes.directory : sizes.directory + sizes.information}px`,
    } as CSSProperties;

    return { containerRef, style, resizing, separatorProps };
}
