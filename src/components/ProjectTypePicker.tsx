import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, ChevronDown, ChevronRight, Search } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { ProjectTypeOption } from '../services/projectClassification';

interface Props {
  options: ProjectTypeOption[];
  value: string;
  onChange: (id: string) => void;
}

export function ProjectTypePicker({ options, value, onChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const optionsId = useId();
  const trigger = useRef<HTMLButtonElement>(null), list = useRef<HTMLDivElement>(null);
  const optionButtons = useRef(new Map<string, HTMLButtonElement>());
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
  const term = query.trim().toLocaleLowerCase();
  const matchedIds = new Set<string>();
  for (const option of options) {
    if (term && ![option.path.join(' / '), option.path.map(part => t(part)).join(' / ')]
      .some(path => path.toLocaleLowerCase().includes(term))) continue;
    matchedIds.add(option.id);
    for (const parent of ancestors(option.id)) matchedIds.add(parent);
  }
  const children = (parentId?: string) => options.filter(option => parentById.get(option.id) === parentId && matchedIds.has(option.id));
  const columns: { items: ProjectTypeOption[]; activeId?: string }[] = [];
  let items = children();
  const visitedBranches = new Set<string>();
  while (items.length) {
    const depth = columns.length;
    const active = items.find(option => option.id === branches[depth] && !option.leaf)
      || ((depth === 0 || term) ? items.find(option => !option.leaf) : undefined);
    columns.push({ items, activeId: active?.id });
    if (!active || visitedBranches.has(active.id)) break;
    visitedBranches.add(active.id);
    items = children(active.id);
  }

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const gap = 4, margin = 12;
      const below = window.innerHeight - rect.bottom - gap - margin, above = rect.top - gap - margin;
      const desired = Math.min(290, Math.max(44, options.length * 44) + 56);
      const upward = below < desired && above > below;
      const maxHeight = Math.max(100, Math.min(desired, upward ? above : below));
      setPosition({ left: rect.left, top: upward ? rect.top - gap - maxHeight : rect.bottom + gap,
        width: rect.width, maxHeight });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [open, options.length]);

  useLayoutEffect(() => {
    if (!pendingFocus.current) return;
    optionButtons.current.get(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  }, [branches, query, open]);

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

  const activate = (option: ProjectTypeOption, depth: number, focusChild = false) => {
    if (option.leaf) {
      onChange(option.id); setOpen(false); trigger.current?.focus();
      return;
    }
    if (focusChild) pendingFocus.current = children(option.id)[0]?.id ?? null;
    setBranches([...columns.slice(0, depth).map(column => column.activeId!), option.id]);
  };
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, option: ProjectTypeOption, depth: number, index: number) => {
    const current = columns[depth].items;
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? current.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + current.length) % current.length;
      optionButtons.current.get(current[next].id)?.focus();
    } else if (event.key === 'ArrowRight' && !option.leaf) {
      event.preventDefault(); activate(option, depth, true);
    } else if (event.key === 'ArrowLeft' && depth > 0) {
      event.preventDefault();
      const parent = columns[depth - 1].activeId;
      if (parent) optionButtons.current.get(parent)?.focus();
    }
  };

  return <div className="field type-picker"><span>{t('项目类型')}<em>*</em></span>
    <button ref={trigger} className="select-trigger" aria-label={t('项目类型')} aria-haspopup="listbox" aria-expanded={open}
      aria-controls={open ? optionsId : undefined} onClick={() => {
        setOpen(current => !current); setQuery(''); setBranches(selected ? ancestors(selected.id) : []);
      }}>{selected?.path.map(part => t(part)).join(' / ') || t('请选择最末级项目类型')}<ChevronDown size={17}/></button>
    {/* A fixed height keeps both the search field and an upward popup anchored while filtering. */}
    {open && <div ref={list} className="type-options type-options-floating" style={{ ...position, height: position.maxHeight }}>
      <div className="type-options-search"><Search size={16} aria-hidden="true"/><input autoFocus type="search"
        aria-label={t('搜索项目类型')} placeholder={t('搜索项目类型')} value={query} onChange={event => setQuery(event.target.value)}
        onKeyDown={event => {
          if (event.key === 'Enter') event.preventDefault();
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            const first = columns[0]?.items[0];
            if (first) optionButtons.current.get(first.id)?.focus();
          }
        }}/></div>
      <div id={optionsId} className="type-options-list type-options-columns" role="listbox" aria-label={t('项目类型选项')}>
        {columns.map((column, depth) => <div key={depth} className="type-options-column" role="group">
          {column.items.map((option, index) => <button key={option.id} type="button" role="option"
            ref={element => { if (element) optionButtons.current.set(option.id, element); else optionButtons.current.delete(option.id); }}
            className={column.activeId === option.id ? 'active-branch' : undefined}
            aria-selected={option.id === value} aria-expanded={option.leaf ? undefined : column.activeId === option.id}
            aria-label={option.path.map(part => t(part)).join(' / ')} title={t(option.name)}
            onClick={() => activate(option, depth)} onKeyDown={event => navigate(event, option, depth, index)}>
            <i style={{ background: option.color }} aria-hidden="true"/><span>{t(option.name)}</span>
            {!option.leaf ? <ChevronRight size={15} aria-hidden="true"/> : option.id === value && <Check size={15} aria-hidden="true"/>}
          </button>)}
        </div>)}
        {!columns.length && <p className="type-options-empty" role="status">{t('无匹配项目类型')}</p>}
      </div>
    </div>}
  </div>;
}
