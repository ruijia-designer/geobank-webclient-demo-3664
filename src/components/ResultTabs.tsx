import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, ChevronRight, X } from 'lucide-react';
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
  const [overflow, setOverflow] = useState(false);
  const [overflowIds, setOverflowIds] = useState<string[]>([]);
  const itemSignature = JSON.stringify(items.map(item => [item.id, item.label]));
  const overflowItems = items.filter(item => overflowIds.includes(item.id));
  const overflowSignature = JSON.stringify(overflowItems.map(item => item.id));

  const measure = () => {
    const list = listRef.current;
    if (!list) return;
    // Use the whole strip to avoid controls keeping themselves visible after a resize.
    const availableWidth = rootRef.current?.clientWidth || 0;
    const overflows = availableWidth > 0 && list.scrollWidth > availableWidth + 1;
    setOverflow(previous => previous === overflows ? previous : overflows);
    const nextIds = overflows && list.clientWidth > 0
      ? [...tabRefs.current].filter(([, button]) => {
        const item = button.parentElement;
        return item && (item.offsetLeft < list.scrollLeft - 1
          || item.offsetLeft + item.offsetWidth > list.scrollLeft + list.clientWidth + 1);
      }).map(([id]) => id)
      : [];
    setOverflowIds(previous => previous.length === nextIds.length && previous.every((id, index) => id === nextIds[index]) ? previous : nextIds);
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
  useLayoutEffect(() => { reveal(activeId); }, [activeId, overflow]);
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
    const resize = () => { reveal(currentId.current); measure(); };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    if (list) observer?.observe(list);
    if (rootRef.current) observer?.observe(rootRef.current);
    window.addEventListener('resize', resize);
    return () => { observer?.disconnect(); window.removeEventListener('resize', resize); };
  }, []);
  useLayoutEffect(() => {
    if ((!overflow || !overflowItems.length) && menuOpen) {
      setMenuOpen(false);
      tabRefs.current.get(activeId)?.focus({ preventScroll: true });
    }
  }, [overflow, overflowItems.length, menuOpen, activeId]);
  useEffect(() => {
    if (!menuOpen) return;
    const outside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [menuOpen]);
  useLayoutEffect(() => {
    if (menuOpen && !menuRef.current?.contains(document.activeElement)) {
      const entries = menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]');
      entries?.[Math.max(0, overflowItems.findIndex(item => item.id === activeId))]?.focus();
    }
  }, [menuOpen, overflowSignature]);

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
    if (!entries.length) return;
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
  return <div className="result-tabstrip" ref={rootRef}>
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
    {overflow && <button type="button" className={'result-tabs-menu-trigger' + (menuOpen ? ' active' : '')} ref={triggerRef}
      aria-label={t('超出标签栏的标签')} title={t('超出标签栏的标签')}
      aria-haspopup="menu" aria-expanded={menuOpen} aria-controls={menuOpen ? menuId : undefined}
      onClick={() => setMenuOpen(open => !open)} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setMenuOpen(true); } }}><ChevronRight size={17}/></button>}
    {menuOpen && overflow && <div className="result-tabs-menu" id={menuId} ref={menuRef} role="menu" aria-label={t('超出标签栏的标签')} onKeyDown={menuKey}>
      {overflowItems.map(item => <button type="button" key={item.id} role="menuitemradio" aria-checked={item.id === activeId} tabIndex={-1}
        onClick={() => { setMenuOpen(false); select(item.id); }} title={item.label}>
        <item.Icon size={17} aria-hidden="true"/><span>{item.label}</span>{item.id === activeId && <Check size={16} aria-hidden="true"/>}
      </button>)}
    </div>}
  </div>;
}
