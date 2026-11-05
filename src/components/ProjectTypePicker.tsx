import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, ChevronDown, ChevronRight, ArrowLeftRight } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { ProjectTypeOption } from '../services/projectClassification';
import './ProjectTypePicker.css';

interface Props {
  label?: string;
  options: ProjectTypeOption[];
  value: string;
  onChange: (id: string) => void;
}

export function ProjectTypePicker({ label = '项目类型', options, value, onChange }: Props) {
  const { t } = useTranslation();
  const [style, setStyle] = useState<'cascade' | 'radio'>('cascade');
  const [open, setOpen] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const optionsId = useId();
  const trigger = useRef<HTMLButtonElement>(null), list = useRef<HTMLDivElement>(null);
  const optionButtons = useRef(new Map<string, HTMLButtonElement | HTMLInputElement>());
  const pendingFocus = useRef<string | null>(null);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 0, maxHeight: 290 });
  const selected = options.find(option => option.id === value);
  const optionById = new Map(options.map(option => [option.id, option]));
  // Older callers without parent IDs can still supply a full classification path.
  const parentById = new Map(options.map(option => [option.id, option.parentId ?? options.find(parent =>
    parent.path.length === option.path.length - 1 && parent.path.every((part, index) => part === option.path[index]))?.id]));
  const ancestors = (id: string) => {
    const path: string[] = [], visited = new Set<string>([id]);
    let parent = parentById.get(id);
    while (parent && optionById.has(parent) && !visited.has(parent)) {
      visited.add(parent);
      path.unshift(parent);
      parent = parentById.get(parent);
    }
    return path;
  };
  const children = (parentId?: string) => options.filter(option => parentById.get(option.id) === parentId);
  const columns: { items: ProjectTypeOption[]; activeId?: string }[] = [];
  let items = children();
  const visitedBranches = new Set<string>();
  while (items.length) {
    const depth = columns.length;
    const active = items.find(option => option.id === branches[depth] && !option.leaf);
    columns.push({ items, activeId: active?.id });
    if (!active || visitedBranches.has(active.id)) break;
    visitedBranches.add(active.id);
    items = children(active.id);
  }

  const selectionPath = selected ? [...ancestors(selected.id), selected.id] : branches;
  const radioLevels: { items: ProjectTypeOption[]; selectedId?: string }[] = [];
  let radioItems = options.filter(option => !parentById.get(option.id));
  const visitedRadio = new Set<string>();
  while (radioItems.length) {
    const selectedId = selectionPath[radioLevels.length];
    radioLevels.push({ items: radioItems, selectedId });
    const parent = radioItems.find(option => option.id === selectedId && !option.leaf);
    if (!parent || visitedRadio.has(parent.id)) break;
    visitedRadio.add(parent.id);
    radioItems = options.filter(option => parentById.get(option.id) === parent.id);
  }

  const radioLayoutKey = radioLevels.map(level => level.items.map(option => option.id).join(',')).join(';');
  const siblingCounts = new Map<string | undefined, number>();
  for (const parent of parentById.values()) siblingCounts.set(parent, (siblingCounts.get(parent) ?? 0) + 1);
  const popupHeight = Math.min(290, Math.max(1, ...siblingCounts.values()) * 40 + 10);

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 4, margin = 12;
      const below = window.innerHeight - rect.bottom - gap - margin, above = rect.top - gap - margin;
      const desired = style === 'radio' ? Math.min(290, (list.current?.scrollHeight ?? 70) + 2) : popupHeight;
      const upward = below < desired && above > below;
      const maxHeight = Math.max(style === 'radio' ? 40 : 100, Math.min(desired, upward ? above : below));
      setPosition({ left: rect.left, top: upward ? rect.top - gap - maxHeight : rect.bottom + gap,
        width: rect.width, maxHeight });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, popupHeight, style, radioLayoutKey, position.width]);

  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    optionButtons.current.get(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  }, [branches, open]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!trigger.current?.contains(target) && !list.current?.contains(target)) setOpen(false);
    };
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation(); event.preventDefault(); setOpen(false); trigger.current?.focus();
      }
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', escape, true);
    return () => { document.removeEventListener('mousedown', outside); document.removeEventListener('keydown', escape, true); };
  }, [open]);

  const choose = (option: ProjectTypeOption) => {
    const path = ancestors(option.id);
    setBranches(option.leaf ? path : [...path, option.id]);
    if (option.leaf) {
      onChange(option.id);
      return;
    }
    // A branch is only navigation, never a valid value for the project form.
    if (selected && !ancestors(selected.id).includes(option.id)) onChange('');
  };
  const activate = (option: ProjectTypeOption, focusChild = false) => {
    choose(option);
    if (option.leaf) {
      setOpen(false); trigger.current?.focus();
      return;
    }
    if (focusChild) pendingFocus.current = children(option.id)[0]?.id ?? null;
  };
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, option: ProjectTypeOption, depth: number, index: number) => {
    const current = columns[depth].items;
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? current.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + current.length) % current.length;
      optionButtons.current.get(current[next].id)?.focus();
    } else if (event.key === 'ArrowRight' && !option.leaf) {
      event.preventDefault(); activate(option, true);
    } else if (event.key === 'ArrowLeft' && depth > 0) {
      event.preventDefault();
      const parent = columns[depth - 1].activeId;
      if (parent) optionButtons.current.get(parent)?.focus();
    }
  };


  return <div className="field type-picker" data-selection-style={style}>
    <div className="type-picker-heading"><span>{t(label)}<em>*</em></span>
      <button type="button" className="type-picker-style-toggle" onClick={() => {
        setOpen(false);
        if (selected) setBranches(ancestors(selected.id));
        setStyle(current => current === 'cascade' ? 'radio' : 'cascade');
      }}><ArrowLeftRight size={15} aria-hidden="true"/>{t(style === 'cascade' ? '切换为分级单选' : '切换为级联选择')}</button>
    </div>
    <button ref={trigger} type="button" className="select-trigger" aria-label={t(label)}
      aria-haspopup={style === 'cascade' ? 'listbox' : undefined} aria-expanded={open}
      aria-controls={open ? optionsId : undefined} onClick={() => {
        setOpen(current => !current);
        if (selected) setBranches(ancestors(selected.id));
      }} onKeyDown={event => {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        const roots = children();
        const option = event.key === 'ArrowUp' ? roots.at(-1) : roots[0];
        if (open) {
          if (option) optionButtons.current.get(option.id)?.focus();
        } else {
          pendingFocus.current = option?.id ?? null;
          if (selected) setBranches(ancestors(selected.id));
          setOpen(true);
        }
      }}>{selected?.path.map(part => t(part)).join(' / ') || t('请选择项目类型')}<ChevronDown size={17}/></button>
    {style === 'radio' && open && <div ref={list} id={optionsId}
      className="type-picker-radio-levels type-picker-radio-popup" style={position} role="group" aria-label={t('项目类型选项')}>
      {radioLevels.map((level, depth) => <fieldset key={depth}
        className={'type-picker-radio-group' + (depth > 0 ? ' is-child' : ' is-root')}
        aria-label={t(depth === 0 ? '一级分类' : depth === 1 ? '二级分类' : '下级分类')}>
        <div className="type-picker-radio-options">{level.items.map(option => <label key={option.id}
          className={'type-picker-radio-option' + (level.selectedId === option.id ? ' is-selected' : '')}>
          <input type="radio" name={`${optionsId}-level-${depth}`} value={option.id}
            ref={element => { if (element) optionButtons.current.set(option.id, element); else optionButtons.current.delete(option.id); }}
            checked={level.selectedId === option.id} onChange={() => activate(option)}/>
          <span>{t(option.name)}</span>
        </label>)}</div>
      </fieldset>)}
      {!radioLevels.length && <p className="type-options-empty" role="status">{t('无匹配项目类型')}</p>}
    </div>}
    {/* Keep the popup anchored while navigating between classification levels. */}
    {style === 'cascade' && open && <div ref={list} className="type-options type-options-floating" style={{ ...position, height: position.maxHeight }}>
      <div id={optionsId} className="type-options-list type-options-columns" role="listbox" aria-label={t('项目类型选项')}>
        {columns.map((column, depth) => <div key={depth} className="type-options-column" role="group">
          {column.items.map((option, index) => <button key={option.id} type="button" role="option"
            ref={element => { if (element) optionButtons.current.set(option.id, element); else optionButtons.current.delete(option.id); }}
            className={column.activeId === option.id ? 'active-branch' : undefined}
            aria-selected={option.id === value} aria-expanded={option.leaf ? undefined : column.activeId === option.id}
            aria-label={option.path.map(part => t(part)).join(' / ')} title={t(option.name)}
            onClick={() => activate(option)} onKeyDown={event => navigate(event, option, depth, index)}>
            <i style={{ background: option.color }} aria-hidden="true"/><span>{t(option.name)}</span>
            {!option.leaf ? <ChevronRight size={15} aria-hidden="true"/> : option.id === value && <Check size={15} aria-hidden="true"/>}
          </button>)}
        </div>)}
        {!columns.length && <p className="type-options-empty" role="status">{t('无匹配项目类型')}</p>}
      </div>
    </div>}
  </div>;
}
