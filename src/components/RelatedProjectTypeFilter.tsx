import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useTranslation } from '../i18n';

// Keep this filter local to associations, following the overview dimension picker.
export function RelatedProjectTypeFilter({ categories, value, onChange }: {
  categories: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  const choices = ['', ...categories];
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const options = useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [placement, setPlacement] = useState({ upward: false, maxHeight: 240 });
  const close = (restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) trigger.current?.focus();
  };
  const show = (index = Math.max(0, choices.indexOf(value))) => {
    setActiveIndex(index);
    setOpen(true);
  };
  const choose = (index: number) => {
    onChange(choices[index]);
    close(true);
  };

  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const rect = trigger.current?.getBoundingClientRect();
      const bounds = root.current?.closest('.modal-body')?.getBoundingClientRect();
      if (!rect) return;
      const below = Math.min(bounds?.bottom ?? window.innerHeight, window.innerHeight) - rect.bottom - 8;
      const above = rect.top - Math.max(bounds?.top ?? 0, 0) - 8;
      const desired = Math.min(240, choices.length * 36 + 10);
      const upward = below < desired && above > below;
      setPlacement({ upward, maxHeight: Math.max(40, Math.min(desired, upward ? above : below)) });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, choices.length]);

  useLayoutEffect(() => {
    const option = open ? options.current[activeIndex] : null;
    const list = option?.parentElement;
    if (!option || !list) return;
    if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
    else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
    }
  }, [open, activeIndex, placement.maxHeight]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation(); // Leave the association draft open on the first Escape.
      close(true);
      return;
    }
    if (event.key === 'Tab' && open) { close(); return; }
    if ((event.key === 'Enter' || event.key === ' ') && open) {
      event.preventDefault();
      choose(activeIndex);
      return;
    }
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    if (!open) {
      show(event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1 : undefined);
      return;
    }
    setActiveIndex(event.key === 'Home' ? 0 : event.key === 'End' ? choices.length - 1
      : (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + choices.length) % choices.length);
  };

  return <div className="related-projects-filter">
    <label htmlFor={id}>{t('项目类型')}</label>
    <div ref={root} className="related-projects-type-picker" onKeyDown={navigate} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
    }}>
      <button ref={trigger} id={id} type="button" role="combobox" className="select-trigger related-projects-type-trigger"
        aria-label={t('项目类型')} aria-haspopup="listbox" aria-expanded={open}
        aria-controls={open ? id + '-options' : undefined}
        aria-activedescendant={open ? id + '-option-' + activeIndex : undefined}
        onClick={() => open ? close() : show()}>
        <span>{t(value || '全部')}</span><ChevronDown size={16} aria-hidden="true"/>
      </button>
      {open && <div id={id + '-options'} className="related-projects-type-options" role="listbox" aria-label={t('项目类型')}
        style={{ maxHeight: placement.maxHeight, ...(placement.upward ? { top: 'auto', bottom: 'calc(100% + 6px)' } : {}) }}>
        {choices.map((category, index) => <button key={category} ref={element => { options.current[index] = element; }}
          id={id + '-option-' + index} type="button" role="option" tabIndex={-1} aria-selected={value === category}
          className={activeIndex === index ? 'is-highlighted' : undefined}
          onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(index)}>
          <span>{t(category || '全部')}</span>{value === category && <Check size={16} aria-hidden="true"/>}
        </button>)}
      </div>}
    </div>
  </div>;
}
