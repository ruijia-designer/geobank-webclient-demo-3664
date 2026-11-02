import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from '../i18n';
import './ResultTabs.css';

export interface ResultTabItem {
  id: string;
  label: string;
  Icon: LucideIcon;
  closable?: boolean;
}

interface Props {
  items: ResultTabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  panelId: string;
}

export function ResultTabs({ items, activeId, onSelect, onClose, panelId }: Props) {
  const { t } = useTranslation();
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<string | null>(null);
  const currentId = useRef(activeId);
  currentId.current = activeId;
  const [scroll, setScroll] = useState({ back: false, forward: false });
  const itemSignature = JSON.stringify(items.map(item => [item.id, item.label]));

  const measure = () => {
    const list = listRef.current;
    if (!list) return;
    const next = { back: list.scrollLeft > 1, forward: list.scrollLeft + list.clientWidth < list.scrollWidth - 1 };
    setScroll(previous => previous.back === next.back && previous.forward === next.forward ? previous : next);
  };
  const reveal = (id: string) => {
    const list = listRef.current;
    const item = tabRefs.current.get(id)?.parentElement;
    if (!list || !item || item.parentElement !== list) return;
    if (item.offsetLeft < list.scrollLeft) list.scrollLeft = item.offsetLeft;
    else if (item.offsetLeft + item.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = item.offsetLeft + item.offsetWidth - list.clientWidth;
    }
    measure();
  };
  useLayoutEffect(() => { reveal(activeId); }, [activeId]);
  useLayoutEffect(() => {
    measure();
    if (pendingFocus.current) {
      tabRefs.current.get(pendingFocus.current)?.focus({ preventScroll: true });
      reveal(pendingFocus.current);
      pendingFocus.current = null;
    }
  }, [itemSignature]);
  useEffect(() => {
    const list = listRef.current;
    let previousWidth = list?.clientWidth;
    const resize = () => {
      if (list && list.clientWidth !== previousWidth) {
        previousWidth = list.clientWidth;
        reveal(currentId.current);
        measure();
      }
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    if (list) observer?.observe(list);
    window.addEventListener('resize', resize);
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize); };
  }, []);
  const select = (id: string) => {
    onSelect(id);
    tabRefs.current.get(id)?.focus({ preventScroll: true });
    reveal(id);
  };
  const close = (item: ResultTabItem) => {
    if (!item.closable) return;
    const button = tabRefs.current.get(item.id);
    const index = items.findIndex(entry => entry.id === item.id);
    if (button?.parentElement?.contains(document.activeElement)) {
      pendingFocus.current = (items[index - 1] || items[index + 1])?.id || null;
    }
    onClose(item.id);
  };
  const tabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | undefined;
    if (event.key === 'ArrowRight') next = (index + 1) % items.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + items.length) % items.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = items.length - 1;
    else if (event.key === 'Delete' && items[index].closable) {
      event.preventDefault();
      close(items[index]);
    }
    if (next !== undefined) { event.preventDefault(); select(items[next].id); }
  };
  const scrollBy = (direction: number) => {
    const list = listRef.current;
    if (list) { list.scrollLeft += direction * Math.max(120, list.clientWidth * .7); measure(); }
  };

  const renderTab = (item: ResultTabItem) => <div className={'result-tab' + (item.id === activeId ? ' active' : '') + (item.closable ? ' is-closable' : '')} role="presentation" key={item.id}
        onMouseDown={event => { if (event.button === 1) event.preventDefault(); }}
        onAuxClick={event => { if (event.button === 1) { event.preventDefault(); close(item); } }}>
        <button type="button" role="tab" aria-selected={item.id === activeId} aria-current={item.id === activeId ? 'page' : undefined}
          aria-controls={panelId} aria-label={item.label} title={item.label} tabIndex={item.id === activeId ? 0 : -1}
          ref={node => { if (node) tabRefs.current.set(item.id, node); else tabRefs.current.delete(item.id); }}
          onClick={() => select(item.id)} onKeyDown={event => tabKey(event, items.findIndex(entry => entry.id === item.id))}>
          <item.Icon size={17} aria-hidden="true"/><span>{item.label}</span>
        </button>
        {item.closable && <button type="button" className="tab-close" title={t('关闭{file}', { file: item.label })}
          aria-label={t('关闭{file}', { file: item.label })} tabIndex={item.id === activeId ? 0 : -1} onClick={() => close(item)}><X size={14}/></button>}
      </div>;

  return <div className="result-tabstrip">
    <div className="result-tabs" role="tablist" aria-label={t('成果选项卡')}>
      {items.filter(item => !item.closable).map(renderTab)}
      {(scroll.back || scroll.forward) && <button type="button" className="result-tab-scroll" disabled={!scroll.back} aria-label={t('向左滚动选项卡')} onClick={() => scrollBy(-1)}><ChevronLeft size={15}/></button>}
      <div className="result-file-tabs" ref={listRef} onScroll={measure}>
        {items.filter(item => item.closable).map(renderTab)}
      </div>
      {(scroll.back || scroll.forward) && <button type="button" className="result-tab-scroll" disabled={!scroll.forward} aria-label={t('向右滚动选项卡')} onClick={() => scrollBy(1)}><ChevronRight size={15}/></button>}
    </div>
  </div>;
}
