import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import type { Filters, Role } from '../types';
import { useTranslation } from '../i18n';
import { normalizeOverviewFilters, yearRangeError } from '../services/overviewFilters';
import './overview-filters.css';

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
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus(); } };
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
    <button type="button" className="button primary filter-close" onClick={onClose}>{t('关闭筛选')}<X size={16}/></button>
    <label className="field">{t('归档类型')}<select value={draft.archived?.[0] || ''} onChange={event => set('archived', event.target.value ? [event.target.value] : [])}>
      <option value="">{t('全部')}</option><option value="true">{t('已归档')}</option>{role === 'admin' && <option value="false">{t('未归档')}</option>}
    </select></label>
    <fieldset><legend>{t('年度范围')}<span id={hintId} className="year-range-hint">（{t('支持只输入一个年份进行筛选')}）</span></legend><div className="overview-year-range">
      <input ref={fromInput} aria-label={t('起始年度')} aria-describedby={error ? errorId : hintId} aria-invalid={!!error} inputMode="numeric" maxLength={4} placeholder={t('起始年度')} value={draft.yearFrom?.[0] || ''} onChange={event => set('yearFrom', event.target.value ? [event.target.value] : [])}/>
      <span>{t('至')}</span>
      <input ref={toInput} aria-label={t('结束年度')} aria-describedby={error ? errorId : hintId} aria-invalid={!!error} inputMode="numeric" maxLength={4} placeholder={t('结束年度')} value={draft.yearTo?.[0] || ''} onChange={event => set('yearTo', event.target.value ? [event.target.value] : [])}/>
    </div>{error && <p id={errorId} className="filter-error" role="alert">{t(error)}</p>}</fieldset>
    <fieldset><legend>{t('所属盆地')}</legend><div className="basin-picker" ref={picker} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false); }}>
      <button ref={trigger} type="button" className="basin-trigger" aria-label={t('选择盆地')} aria-expanded={open} aria-controls={menuId} onClick={() => { setOpen(!open); setQuery(''); }} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); } }}>
        <span className={selected.length ? '' : 'muted'}>{selected.length ? t('已选 {count} 个盆地', { count: selected.length }) : t('全部盆地')}</span><ChevronDown size={16} style={{ transform: open ? 'rotate(180deg)' : undefined }}/>
      </button>
      {open && <div id={menuId} className="basin-dropdown" role="group" aria-label={t('盆地选项')}>
        <label className="basin-search"><Search size={16}/><input autoFocus aria-label={t('搜索盆地')} placeholder={t('搜索盆地')} value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }}/></label>
        <div className="basin-dropdown-summary"><span>{t('已选 {count} 项', { count: selected.length })}</span><button type="button" onClick={() => set('basin', [])} disabled={!selected.length}>{t('清空选择')}</button></div>
        <div className="basin-options">{options.map(basin => <label key={basin}><input type="checkbox" checked={selected.includes(basin)} onChange={() => toggleBasin(basin)}/><span>{basin}</span></label>)}{!options.length && <p className="basin-empty">{t('无匹配盆地')}</p>}</div>
      </div>}
    </div>{selected.length > 0 && <div className="selected-basins">{selected.map(basin => <span key={basin}>{basin}<button type="button" aria-label={t('移除盆地：{name}', { name: basin })} onClick={() => toggleBasin(basin)}><X size={12}/></button></span>)}</div>}</fieldset>
    <div className="overview-filter-toggles">
      <label><input type="checkbox" checked={draft.readable?.includes('true') || false} onChange={event => set('readable', event.target.checked ? ['true'] : [])}/>{t('仅显示可查阅项目')}</label>
      <label><input type="checkbox" checked={draft.inViewport?.includes('true') || false} onChange={event => set('inViewport', event.target.checked ? ['true'] : [])}/>{t('仅显示视野范围内的项目')}</label>
    </div>
    <div className="filter-actions"><button type="button" className="button" onClick={() => { setDraft({}); setQuery(''); setOpen(false); setError(''); onReset(); }}>{t('重置筛选条件')}</button><button type="submit" className="button primary">{t('应用筛选')}</button></div>
  </form>;
}
