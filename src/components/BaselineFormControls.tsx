import { useEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes, KeyboardEvent } from 'react';
import { ChevronDown, Upload } from 'lucide-react';
import { useTranslation } from '../i18n';
import './BaselineFormControls.css';

export function parseBaselineMultiValues(value: string): string[] {
    return [...new Set(value.split(/[,，、]/).map(item => item.trim()).filter(Boolean))];
}

interface MultiSelectProps {
    id: string;
    label: string;
    value: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
    'data-field-key'?: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
}

export function BaselineMultiSelect({ id, label, value, options, onChange, ...attributes }: MultiSelectProps) {
    const { t, locale } = useTranslation();
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const pendingFocus = useRef<'first' | 'last' | null>(null);
    const selected = parseBaselineMultiValues(value);
    const unknown = selected.filter(item => !options.some(option => option.value === item));
    const available = [...options, ...unknown.map(item => ({ value: item, label: item }))];
    const summary = selected.map(item => available.find(option => option.value === item)?.label || item).join(locale === 'en' ? ', ' : '、');
    const close = () => { setOpen(false); trigger.current?.focus(); };

    useEffect(() => {
        if (!open) return;
        const outside = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener('pointerdown', outside);
        if (pendingFocus.current) {
            const checkboxes = root.current?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]');
            const index = pendingFocus.current === 'last' ? (checkboxes?.length || 1) - 1 : 0;
            checkboxes?.[index]?.focus();
            pendingFocus.current = null;
        }
        return () => document.removeEventListener('pointerdown', outside);
    }, [open]);

    const keyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape' && open) {
            event.preventDefault();
            event.stopPropagation();
            close();
            return;
        }
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        if (!open) {
            pendingFocus.current = event.key === 'ArrowUp' || event.key === 'End' ? 'last' : 'first';
            setOpen(true);
            return;
        }
        const checkboxes = Array.from(root.current?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]') || []);
        const current = checkboxes.indexOf(document.activeElement as HTMLInputElement);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? checkboxes.length - 1
            : event.key === 'ArrowDown' ? (current + 1) % checkboxes.length
                : current <= 0 ? checkboxes.length - 1 : current - 1;
        checkboxes[next]?.focus();
    };
    const toggle = (optionValue: string) => {
        const next = new Set(selected);
        if (next.has(optionValue)) next.delete(optionValue);
        else next.add(optionValue);
        onChange(available.filter(option => next.has(option.value)).map(option => option.value).join(', '));
    };

    return <div ref={root} className="baseline-multiselect" onKeyDown={keyDown} onBlur={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
    }}>
        <button {...attributes} ref={trigger} id={id} type="button" role="combobox" aria-label={label}
            aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? `${id}-options` : undefined}
            className="baseline-multiselect-trigger" onClick={() => setOpen(previous => !previous)}>
            <span className={summary ? '' : 'muted'} title={summary}>{summary || t('请选择')}</span>
            <ChevronDown size={16} aria-hidden="true" className={open ? 'is-open' : ''}/>
        </button>
        {open && <div id={`${id}-options`} role="dialog" aria-label={label} className="baseline-multiselect-popover">
            <div className="baseline-multiselect-options">
                {available.map(option => <label className="baseline-multiselect-option" key={option.value}>
                    <input type="checkbox" checked={selected.includes(option.value)} onChange={() => toggle(option.value)}/>
                    <span>{option.label}</span>
                </label>)}
            </div>
            <div className="baseline-multiselect-actions">
                <button type="button" className="button" disabled={!selected.length} onClick={() => onChange('')}>{t('清空')}</button>
                <button type="button" className="button" onClick={close}>{t('关闭')}</button>
            </div>
        </div>}
    </div>;
}

type FileInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'children'> & {
    fileName: string;
};

export function BaselineFileInput({ fileName, disabled, className, onChange, ...attributes }: FileInputProps) {
    const { t } = useTranslation();
    const input = useRef<HTMLInputElement>(null);
    return <div className={'baseline-file-control' + (disabled ? ' is-disabled' : '')}>
        <input {...attributes} ref={input} type="file" disabled={disabled} tabIndex={-1}
            onChange={event => { if (event.target.files?.length) onChange?.(event); }}
            className={['baseline-file-native', className].filter(Boolean).join(' ')}/>
        <button type="button" className="button baseline-file-button" disabled={disabled} onClick={() => input.current?.click()}>
            <Upload size={16} aria-hidden="true"/>{t('选择文件')}
        </button>
        <span className={'baseline-file-name' + (fileName ? '' : ' muted')} title={fileName || t('未选择文件')}>
            {fileName || t('未选择文件')}
        </span>
    </div>;
}
