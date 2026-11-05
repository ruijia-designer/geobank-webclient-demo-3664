import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import type { Filters, Role } from '../types';
import { useTranslation } from '../i18n';
import { normalizeOverviewFilters, PROJECT_DIMENSIONS, yearRangeError } from '../services/overviewFilters';
import './overview-filters.css';

const dimensionChoices = ['', ...PROJECT_DIMENSIONS];

function ProjectDimensionPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState({ upward: false, maxHeight: 220 });
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const optionButtons = useRef<(HTMLButtonElement | null)[]>([]);
  const optionsId = useId();
  const close = (restoreFocus = false) => { setOpen(false); if (restoreFocus) trigger.current?.focus(); };
  const show = (index = Math.max(0, dimensionChoices.indexOf(value as typeof dimensionChoices[number]))) => {
    setActiveIndex(index);
    setOpen(true);
  };
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      const bounds = root.current?.closest('.overview-filters')?.getBoundingClientRect();
      if (!rect) return;
      const below = Math.min(bounds?.bottom ?? window.innerHeight, window.innerHeight) - rect.bottom - 12;
      const above = rect.top - Math.max(bounds?.top ?? 0, 0) - 12;
      const upward = below < 200 && above > below;
      setPlacement({ upward, maxHeight: Math.max(80, Math.min(220, upward ? above : below)) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open]);
  useLayoutEffect(() => {
    const option = open ? optionButtons.current[activeIndex] : null;
    const list = option?.parentElement;
    if (!option || !list) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }, [open, activeIndex]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); close(true); return; }
    if (event.key === 'Tab' && open) { close(); return; }
    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault(); onChange(dimensionChoices[activeIndex]); close(true); return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (!open) { show(event.key === 'Home' ? 0 : event.key === 'End' ? dimensionChoices.length - 1 : undefined); return; }
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? dimensionChoices.length - 1
      : (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + dimensionChoices.length) % dimensionChoices.length;
    setActiveIndex(next);
  };
  return <div className="basin-picker dimension-picker" ref={root} onKeyDown={navigate} onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <button ref={trigger} type="button" role="combobox" className="basin-trigger" aria-label={t('项目维数')}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? optionsId : undefined}
      aria-activedescendant={open ? `${optionsId}-${activeIndex}` : undefined} onClick={() => open ? close() : show()}>
      <span className={value ? '' : 'muted'}>{t(value || '全部维数')}</span><ChevronDown size={16} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : undefined }}/>
    </button>
    {open && <div id={optionsId} className="basin-dropdown dimension-options" role="listbox" aria-label={t('项目维数')}
      style={{ maxHeight: placement.maxHeight, ...(placement.upward ? { top: 'auto', bottom: 'calc(100% + 6px)' } : {}) }}>
      {dimensionChoices.map((dimension, index) => <button key={dimension} id={`${optionsId}-${index}`} type="button" role="option" tabIndex={-1}
        className={index === activeIndex ? 'is-highlighted' : undefined} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)}
        ref={element => { optionButtons.current[index] = element; }} aria-selected={value === dimension}
        onClick={() => { onChange(dimension); close(true); }}>
        <span>{t(dimension || '全部维数')}</span>{value === dimension && <Check size={16} aria-hidden="true"/>}
      </button>)}
    </div>}
  </div>;
}

export function OverviewFilters({ value, basins, role, onApply, onReset, onClose }: {
  value: Filters; basins: string[]; role: Role;
  onApply: (filters: Filters) => void; onReset: () => void; onClose: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() => normalizeOverviewFilters(value));
  const [open, setOpen] = useState(false), [query, setQuery] = useState(''), [error, setError] = useState('');
  const picker = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null);
  const fromInput = useRef<HTMLInputElement>(null), toInput = useRef<HTMLInputElement>(null);
  const menuId = useId(), errorId = useId(), hintId = useId();
  const selected = draft.basin || [];
  const options = [...new Set([...basins, ...selected])].filter(basin => basin.toLowerCase().includes(query.trim().toLowerCase()));
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => { if (!picker.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener('mousedown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape); };
  }, [open]);
  const set = (key: string, values: string[]) => { setDraft(current => ({ ...current, [key]: values })); setError(''); };
  const toggleBasin = (basin: string) => set('basin', selected.includes(basin) ? selected.filter(value => value !== basin) : [...selected, basin]);
  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    const message = yearRangeError(draft);
    if (message) { setError(message); ((draft.yearFrom?.[0] && !/^[1-9]\d{3}$/.test(draft.yearFrom[0])) ? fromInput : toInput).current?.focus(); return; }
    onApply(draft);
  };
  return <form className="overview-filters" onSubmit={apply} noValidate aria-label={t('项目筛选条件')}>
    <header className="overview-filter-header">
      <h2>{t('项目筛选条件')}</h2>
      <button type="button" className="button filter-close" onClick={onClose}>{t('关闭筛选')}<X size={16} aria-hidden="true"/></button>
    </header>
    <label className="field">{t('归档类型')}<select value={draft.archived?.[0] || ''} onChange={event => set('archived', event.target.value ? [event.target.value] : [])}>
      <option value="">{t('全部')}</option><option value="true">{t('已归档')}</option>{role === 'admin' && <option value="false">{t('未归档')}</option>}
    </select></label>
    <fieldset><legend>{t('年度范围')}<span id={hintId} className="year-range-hint">（{t('支持只输入一个年份进行筛选')}）</span></legend><div className="overview-year-range">
      <input ref={fromInput} aria-label={t('起始年度')} aria-describedby={error ? errorId : hintId} aria-invalid={!!error} inputMode="numeric" maxLength={4} placeholder={t('起始年度')} value={draft.yearFrom?.[0] || ''} onChange={event => set('yearFrom', event.target.value ? [event.target.value] : [])}/>
      <span>{t('至')}</span>
      <input ref={toInput} aria-label={t('结束年度')} aria-describedby={error ? errorId : hintId} aria-invalid={!!error} inputMode="numeric" maxLength={4} placeholder={t('结束年度')} value={draft.yearTo?.[0] || ''} onChange={event => set('yearTo', event.target.value ? [event.target.value] : [])}/>
    </div>{error && <p id={errorId} className="filter-error" role="alert">{t(error)}</p>}</fieldset>
    <fieldset><legend>{t('地区')}</legend><div className="basin-picker" ref={picker} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <button ref={trigger} type="button" className="basin-trigger" aria-label={t('选择地区')} aria-expanded={open} aria-controls={menuId} onClick={() => { setOpen(!open); setQuery(''); }} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); } }}>
        <span className={selected.length ? '' : 'muted'}>{selected.length ? t('已选 {count} 个地区', { count: selected.length }) : t('全部地区')}</span><ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : undefined }}/>
      </button>
      {open && <div id={menuId} className="basin-dropdown" role="group" aria-label={t('地区选项')}>
        <label className="basin-search"><Search size={16}/><input autoFocus aria-label={t('搜索地区')} placeholder={t('搜索地区')} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }}/></label>
        <div className="basin-dropdown-summary"><span>{t('已选 {count} 项', { count: selected.length })}</span><button type="button" onClick={() => set('basin', [])} disabled={!selected.length}>{t('清空选择')}</button></div>
        <div className="basin-options">{options.map(basin => <label key={basin}><input type="checkbox" checked={selected.includes(basin)} onChange={() => toggleBasin(basin)}/><span>{basin}</span></label>)}{!options.length && <p className="basin-empty">{t('无匹配地区')}</p>}</div>
      </div>}
    </div>{selected.length > 0 && <div className="selected-basins">{selected.map(basin => <span key={basin}>{basin}<button type="button" aria-label={t('移除地区：{name}', { name: basin })} onClick={() => toggleBasin(basin)}><X size={12}/></button></span>)}</div>}</fieldset>
    <fieldset><legend>{t('项目维数')}</legend><ProjectDimensionPicker value={draft.dimension?.[0] || ''} onChange={dimension => set('dimension', dimension ? [dimension] : [])}/></fieldset>
    <div className="overview-filter-toggles">
      <label><input type="checkbox" checked={draft.readable?.includes('true') || false} onChange={event => set('readable', event.target.checked ? ['true'] : [])}/>{t('仅显示可查阅项目')}</label>
      <label><input type="checkbox" checked={draft.inViewport?.includes('true') || false} onChange={event => set('inViewport', event.target.checked ? ['true'] : [])}/>{t('仅显示视野范围内的项目')}</label>
    </div>
    <div className="filter-actions"><button type="button" className="button" onClick={() => { setDraft({}); setQuery(''); setOpen(false); setError(''); onReset(); }}>{t('重置筛选条件')}</button><button type="submit" className="button primary">{t('应用筛选')}</button></div>
  </form>;
}
