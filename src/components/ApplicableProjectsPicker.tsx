import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { ApplicableProjectType } from '../services/resultTypes';
import type { ProjectTypeOption } from '../services/projectClassification';

export function ApplicableProjectsPicker({ options, value, onChange }: {
    options: ProjectTypeOption[];
    value: ApplicableProjectType[];
    onChange: (value: ApplicableProjectType[]) => void;
}) {
    const { t } = useTranslation();
    const popupId = useId();
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const [placement, setPlacement] = useState({ upward: false, maxHeight: 340 });
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const term = query.trim().toLocaleLowerCase();
    const leaves = options.filter(option => option.leaf);
    const matches = leaves.filter(option => option.path.join(' / ').toLocaleLowerCase().includes(term));
    const retained = value.filter(selected => !leaves.some(option => option.id === selected.id));
    const retainedMatches = retained.filter(selected => selected.name.toLocaleLowerCase().includes(term));
    const summary = value.map(selected => selected.name).join('、');

    useLayoutEffect(() => {
        if (!open) return;
        const place = () => {
            const rect = trigger.current?.getBoundingClientRect();
            const bounds = root.current?.closest('.modal-body')?.getBoundingClientRect();
            if (!rect) return;
            const below = Math.min(bounds?.bottom ?? window.innerHeight, window.innerHeight) - rect.bottom - 12;
            const above = rect.top - Math.max(bounds?.top ?? 0, 0) - 12;
            const upward = below < 240 && above > below;
            setPlacement({ upward, maxHeight: Math.max(120, Math.min(340, upward ? above : below)) });
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        return () => {
            window.removeEventListener('resize', place);
            window.removeEventListener('scroll', place, true);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const outside = (event: MouseEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;
            event.stopPropagation();
            event.preventDefault();
            setOpen(false);
            trigger.current?.focus();
        };
        document.addEventListener('mousedown', outside);
        document.addEventListener('keydown', escape, true);
        return () => {
            document.removeEventListener('mousedown', outside);
            document.removeEventListener('keydown', escape, true);
        };
    }, [open]);

    return <div className="applicable-project-picker" ref={root}>
        <button ref={trigger} className="applicable-project-trigger" type="button" aria-label={t('适用项目')}
            aria-expanded={open} aria-controls={open ? popupId : undefined} onClick={() => {
                setOpen(previous => !previous);
                setQuery('');
            }}>
            <span className={summary ? '' : 'applicable-project-placeholder'} title={summary || undefined}>{summary || t('请选择项目类型')}</span>
            <ChevronDown size={16}/>
        </button>
        {open && <div id={popupId} className="applicable-project-options" role="group" aria-label={t('适用项目选项')}
            style={{ maxHeight: placement.maxHeight, ...(placement.upward ? { top: 'auto', bottom: 'calc(100% + 4px)' } : {}) }}>
            <input type="search" aria-label={t('搜索项目类型')} placeholder={t('搜索项目类型')} value={query}
                onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }}/>
            <div className="applicable-project-choices">
                {retainedMatches.length > 0 && <div className="applicable-project-option-group">
                    <strong>{t('已选项目')}</strong>
                    {retainedMatches.map((selected, index) => <label key={selected.id || `retained-${index}`}>
                        <input type="checkbox" checked onChange={() => onChange(value.filter(entry => entry !== selected))}/>
                        <span>{selected.name}</span>
                    </label>)}
                </div>}
                {matches.length > 0 && <div className="applicable-project-option-group">
                    {matches.map(option => <label key={option.id}>
                        <input type="checkbox" aria-label={option.path.map(part => t(part)).join(' / ')}
                            checked={value.some(selected => selected.id === option.id)} onChange={event => onChange(event.target.checked
                                ? [...value, { id: option.id, name: option.name }]
                                : value.filter(selected => selected.id !== option.id))}/>
                        <span>{option.path.slice(1).map(part => t(part)).join(' / ') || t(option.name)}</span>
                    </label>)}
                </div>}
                {!matches.length && !retainedMatches.length && <p>{t('无匹配项目类型')}</p>}
            </div>
            <footer>
                <span>{t('已选 {count} 项', { count: value.length })}</span>
                <button type="button" disabled={!value.length} onClick={() => onChange([])}>{t('清空选择')}</button>
            </footer>
        </div>}
    </div>;
}
