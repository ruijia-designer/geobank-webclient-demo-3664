import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<string | null>(null);
  const currentId = useRef(activeId);
  currentId.current = activeId;
  const [menuOpen, setMenuOpen] = useState(false);
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
    if (!list || !item) return;
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
      }
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    if (list) observer?.observe(list);
    window.addEventListener('resize', resize);
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize); };
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [menuOpen]);
  useLayoutEffect(() => {
    if (menuOpen) {
      const entries = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
      entries?.[Math.max(0, items.findIndex(item => item.id === activeId))]?.focus();
    }
  }, [menuOpen]);

  const select = (id: string) => {
    setMenuOpen(false);
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
  const menuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const entries = [...(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]') || [])];
    const current = entries.indexOf(document.activeElement as HTMLButtonElement);
    let next: number | undefined;
    if (event.key === 'ArrowDown') next = (current + 1) % entries.length;
    else if (event.key === 'ArrowUp') next = (current - 1 + entries.length) % entries.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = entries.length - 1;
    else if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); setMenuOpen(false); triggerRef.current?.focus();
    } else if (event.key === 'Tab') { setMenuOpen(false); triggerRef.current?.focus(); }
    if (next !== undefined) { event.preventDefault(); entries[next]?.focus(); }
  };
  const scrollBy = (direction: number) => {
    const list = listRef.current;
    if (list) { list.scrollLeft += direction * Math.max(120, list.clientWidth * .7); measure(); }
  };

  return <div className="result-tabstrip" ref={rootRef}>
    {(scroll.back || scroll.forward) && <button type="button" className="result-tab-scroll" disabled={!scroll.back} aria-label={t('向左滚动选项卡')} onClick={() => scrollBy(-1)}><ChevronLeft size={15}/></button>}
    <div className="result-tabs" ref={listRef} role="tablist" aria-label={t('成果选项卡')} onScroll={measure}>
      {items.map((item, index) => <div className={'result-tab' + (item.id === activeId ? ' active' : '') + (item.closable ? ' is-closable' : '')} role="presentation" key={item.id}
        onMouseDown={event => { if (event.button === 1) event.preventDefault(); }}
        onAuxClick={event => { if (event.button === 1) { event.preventDefault(); close(item); } }}>
        <button type="button" role="tab" aria-selected={item.id === activeId} aria-current={item.id === activeId ? 'page' : undefined}
          aria-controls={panelId} aria-label={item.label} title={item.label} tabIndex={item.id === activeId ? 0 : -1}
          ref={node => { if (node) tabRefs.current.set(item.id, node); else tabRefs.current.delete(item.id); }}
          onClick={() => select(item.id)} onKeyDown={event => tabKey(event, index)}>
          <item.Icon size={17} aria-hidden="true"/><span>{item.label}</span>
        </button>
        {item.closable && <button type="button" className="tab-close" title={t('关闭{file}', { file: item.label })}
          aria-label={t('关闭{file}', { file: item.label })} tabIndex={item.id === activeId ? 0 : -1} onClick={() => close(item)}><X size={14}/></button>}
      </div>)}
    </div>
    {(scroll.back || scroll.forward) && <button type="button" className="result-tab-scroll" disabled={!scroll.forward} aria-label={t('向右滚动选项卡')} onClick={() => scrollBy(1)}><ChevronRight size={15}/></button>}
    <button type="button" className={'result-tabs-menu-trigger' + (menuOpen ? ' active' : '')} ref={triggerRef}
      aria-label={t('已打开的选项卡')} title={t('已打开{count}个页签', { count: items.length })}
      aria-haspopup="menu" aria-expanded={menuOpen} aria-controls={menuOpen ? menuId : undefined}
      onClick={() => setMenuOpen(open => !open)} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setMenuOpen(true); } }}><ChevronDown size={17}/></button>
    {menuOpen && <div className="result-tabs-menu" id={menuId} ref={menuRef} role="menu" aria-label={t('已打开的选项卡')} onKeyDown={menuKey}>
      <div className="result-tabs-menu-heading">{t('已打开{count}个页签', { count: items.length })}</div>
      {items.map(item => <button type="button" key={item.id} role="menuitemradio" aria-checked={item.id === activeId}
        onClick={() => { setMenuOpen(false); select(item.id); }} title={item.label}>
        <item.Icon size={17} aria-hidden="true"/><span>{item.label}</span>{item.id === activeId && <Check size={16} aria-hidden="true"/>}
      </button>)}
    </div>}
  </div>;
}
