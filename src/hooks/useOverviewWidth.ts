import { useTranslation } from '../i18n';
import { useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';

export function overviewWidth(width: number, preferred: number | null) {
  const max = Math.max(260, Math.min(640, width - 600));
  const normal = width > 1600 ? 390 : width > 1350 ? 330 : 300;
  return Math.max(260, Math.min(max, preferred ?? normal));
}

/** A local width preference; leaving the page or refreshing restores the design defaults. */
export function useOverviewWidth(collapsed: boolean) {
  const {t}=useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(window.innerWidth);
  const [preferred, setPreferred] = useState<number|null>(null);
  const [resizing, setResizing] = useState(false);
  const drag = useRef<{pointerId:number; x:number; width:number; target:HTMLDivElement}|null>(null);
  const resolved = overviewWidth(width, preferred);
  const stop = () => {
    const session = drag.current;
    drag.current = null;
    setResizing(false);
    if (session?.target.hasPointerCapture?.(session.pointerId)) session.target.releasePointerCapture(session.pointerId);
  };
  useLayoutEffect(() => {
    const root = containerRef.current;
    const measure = () => { setWidth(root?.getBoundingClientRect().width || window.innerWidth); };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (root) observer?.observe(root);
    window.addEventListener('resize', measure);
    window.addEventListener('blur', stop);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('blur', stop); };
  }, []);
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const session = drag.current;
    if (!session || session.pointerId !== event.pointerId) return;
    setPreferred(overviewWidth(width, session.width + event.clientX - session.x));
  };
  return {
    containerRef, resizing,
    style: { '--overview-sidebar-width': `${collapsed ? 0 : resolved}px` } as CSSProperties,
    separatorProps: {
      role: 'separator' as const, tabIndex: 0, 'aria-orientation': 'vertical' as const,
      'aria-label': t('调整项目列表宽度'), 'aria-valuemin': 260,
      'aria-valuemax': Math.max(260, Math.min(640, width - 600)), 'aria-valuenow': Math.round(resolved),
      title: t('拖动调整项目列表宽度，或用左右方向键微调'),
      className: 'overview-resizer' + (resizing ? ' active' : ''),
      onPointerDown: (event: PointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) return;
        event.preventDefault(); event.currentTarget.focus({preventScroll:true});
        drag.current = {pointerId:event.pointerId, x:event.clientX, width:resolved, target:event.currentTarget};
        event.currentTarget.setPointerCapture?.(event.pointerId); setResizing(true);
      },
      onPointerMove: move,
      onPointerUp: (event: PointerEvent<HTMLDivElement>) => { if (drag.current?.pointerId !== event.pointerId) return; move(event); stop(); },
      onPointerCancel: stop, onLostPointerCapture: stop,
      onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
        if (!['ArrowLeft','ArrowRight'].includes(event.key)) return;
        event.preventDefault(); setPreferred(overviewWidth(width, resolved + (event.key === 'ArrowRight' ? 10 : -10)));
      },
    },
  };
}
