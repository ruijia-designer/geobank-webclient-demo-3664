import { Fragment, useEffect, useId, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import type { ComponentPropsWithRef, KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';
import './SingleSelect.css';

type Choice = { index: number; label: string; disabled: boolean };
type ChoiceGroup = { parent: Element | null; label?: string; options: Choice[] };

function readGroups(select: HTMLSelectElement) {
  const groups: ChoiceGroup[] = [];
  for (const option of select.options) {
    const group = option.closest('optgroup');
    if (option.hidden || group?.hidden) continue;
    let last = groups.at(-1);
    if (!last || last.parent !== group) {
      last = { parent: group, label: group?.label, options: [] };
      groups.push(last);
    }
    last.options.push({ index: option.index, label: option.label, disabled: option.disabled || !!group?.disabled });
  }
  return groups;
}

function menuLabel(select: HTMLSelectElement) {
  const explicit = select.getAttribute('aria-label');
  if (explicit) return explicit;
  return Array.from(select.labels ?? [], label => {
    const copy = label.cloneNode(true) as HTMLLabelElement;
    copy.querySelectorAll('select, input, button, textarea').forEach(control => control.remove());
    return copy.textContent?.trim();
  }).filter(Boolean).join(' ');
}

export function SingleSelect({ children, ref, ...props }: ComponentPropsWithRef<'select'>) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<ChoiceGroup[]>([]);
  const [active, setActive] = useState(-1);
  const [keyboard, setKeyboard] = useState(false);
  const typed = useRef({ prefix: '', time: 0 });
  const changedThisTurn = useRef(false);
  const single = !props.multiple && (!props.size || props.size <= 1);
  const enabled = groups.flatMap(group => group.options).filter(option => !option.disabled);
  useImperativeHandle(ref, () => selectRef.current!, []);

  const show = (fromKeyboard: boolean, edge?: 'first' | 'last') => {
    const select = selectRef.current;
    if (!select || !single || select.matches(':disabled')) return;
    const groups = readGroups(select);
    const enabled = groups.flatMap(group => group.options).filter(option => !option.disabled);
    const current = enabled.find(option => option.index === select.selectedIndex);
    const option = edge === 'last' ? enabled.at(-1) : edge === 'first' ? enabled[0] : current ?? enabled[0];
    setGroups(groups);
    setActive(option?.index ?? -1);
    setKeyboard(fromKeyboard);
    typed.current = { prefix: '', time: 0 };
    setOpen(true);
  };

  const choose = (index: number) => {
    const select = selectRef.current;
    const option = select?.options[index];
    if (!select || select.matches(':disabled') || !option || option.matches(':disabled')) return;
    setOpen(false);
    if (select.selectedIndex === index) return;
    select.selectedIndex = index;
    select.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    select.dispatchEvent(new Event('change', { bubbles: true }));
  };

  useLayoutEffect(() => {
    const select = selectRef.current;
    const list = listRef.current;
    if (!open || !select || !list) return;
    if (!single || select.matches(':disabled')) { setOpen(false); return; }
    const place = () => {
      const rect = select.getBoundingClientRect();
      const viewport = window.visualViewport;
      const left = viewport?.offsetLeft ?? 0, top = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
      const menuWidth = Math.min(Math.max(0, width - 8), rect.width);
      list.style.width = menuWidth + 'px';
      const desired = Math.min(260, list.scrollHeight + 2);
      const below = top + height - rect.bottom - 10, above = rect.top - top - 10;
      const upward = below < desired && above > below;
      const menuHeight = Math.max(0, Math.min(desired, upward ? above : below));
      list.style.maxHeight = menuHeight + 'px';
      list.style.left = Math.max(left + 4, Math.min(rect.left, left + width - menuWidth - 4)) + 'px';
      list.style.top = (upward ? rect.top - 6 - menuHeight : rect.bottom + 6) + 'px';
    };
    place();
    const resized = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(place);
    resized?.observe(select);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    window.visualViewport?.addEventListener('resize', place);
    window.visualViewport?.addEventListener('scroll', place);
    return () => {
      resized?.disconnect();
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      window.visualViewport?.removeEventListener('resize', place);
      window.visualViewport?.removeEventListener('scroll', place);
    };
  }, [open, groups, single, props.disabled]);

  useEffect(() => {
    const select = selectRef.current;
    if (!open || !select) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!select.contains(target) && !listRef.current?.contains(target)) setOpen(false);
    };
    const updated = new MutationObserver(() => {
      const groups = readGroups(select);
      setGroups(groups);
      const choices = groups.flatMap(group => group.options).filter(option => !option.disabled);
      setActive(previous => choices.some(option => option.index === previous) ? previous : choices[0]?.index ?? -1);
    });
    updated.observe(select, { childList: true, subtree: true, characterData: true, attributes: true,
      attributeFilter: ['disabled', 'hidden', 'label', 'value'] });
    document.addEventListener('pointerdown', outside);
    return () => { updated.disconnect(); document.removeEventListener('pointerdown', outside); };
  }, [open]);

  useLayoutEffect(() => {
    const list = listRef.current;
    const option = document.getElementById(listId + '-' + active);
    if (!keyboard || !list || !option) return;
    const row = option.getBoundingClientRect(), menu = list.getBoundingClientRect();
    if (row.top < menu.top) list.scrollTop += row.top - menu.top;
    else if (row.bottom > menu.bottom) list.scrollTop += row.bottom - menu.bottom;
  }, [active, open, keyboard, listId]);

  const onKeyDown = (event: KeyboardEvent<HTMLSelectElement>) => {
    props.onKeyDown?.(event);
    if (event.defaultPrevented || !single || event.currentTarget.matches(':disabled')) return;
    const key = event.key;
    if (key === 'Tab') { setOpen(false); return; }
    if (key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      return;
    }
    if (['Enter', ' ', 'F4'].includes(key) || (event.altKey && ['ArrowUp', 'ArrowDown'].includes(key))) {
      event.preventDefault();
      if (!open) show(true);
      else if (key === 'F4' || event.altKey || active < 0) setOpen(false);
      else choose(active);
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End', 'PageDown', 'PageUp'].includes(key)) {
      event.preventDefault();
      const edge = key === 'Home' ? 'first' : key === 'End' ? 'last' : undefined;
      if (!open) { show(true, edge); return; }
      const current = enabled.findIndex(option => option.index === active);
      const step = key === 'PageDown' ? 6 : key === 'PageUp' ? -6 : key === 'ArrowDown' ? 1 : -1;
      const next = edge === 'first' ? 0 : edge === 'last' ? enabled.length - 1 : Math.min(enabled.length - 1, Math.max(0, current + step));
      setActive(enabled[next]?.index ?? -1);
      setKeyboard(true);
      return;
    }
    // A closed select keeps the browser's native type-ahead and form semantics.
    if (open && key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
      event.preventDefault();
      const now = Date.now(), char = key.toLocaleLowerCase();
      const prefix = now - typed.current.time < 700 && typed.current.prefix !== char ? typed.current.prefix + char : char;
      typed.current = { prefix, time: now };
      const at = enabled.findIndex(option => option.index === active);
      const ordered = prefix.length > 1 ? enabled : [...enabled.slice(at + 1), ...enabled.slice(0, at + 1)];
      const match = ordered.find(option => option.label.toLocaleLowerCase().startsWith(prefix));
      if (match) { setActive(match.index); setKeyboard(true); }
    }
  };

  const select = selectRef.current;
  const renderOption = (option: Choice) => <div key={option.index} id={listId + '-' + option.index}
    role="option" aria-selected={option.index === select?.selectedIndex} aria-disabled={option.disabled || undefined}
    className={keyboard && option.index === active ? 'single-select-keyboard-option' : undefined}
    onClick={() => { if (!option.disabled) choose(option.index); }}>
    <span>{option.label}</span>{option.index === select?.selectedIndex && <Check size={16} aria-hidden="true"/>}
  </div>;
  return <>
    <select {...props} ref={selectRef} aria-expanded={single ? open : props['aria-expanded']}
      aria-controls={open ? listId : props['aria-controls']} aria-activedescendant={open && active >= 0 ? listId + '-' + active : props['aria-activedescendant']}
      onPointerDown={event => {
        props.onPointerDown?.(event);
        if (!event.defaultPrevented && single && event.button === 0) { event.preventDefault(); event.currentTarget.focus(); }
      }} onMouseDown={event => {
        props.onMouseDown?.(event);
        if (!event.defaultPrevented && single && event.button === 0) { event.preventDefault(); event.currentTarget.focus(); }
      }} onClick={event => {
        props.onClick?.(event);
        if (event.defaultPrevented || !single || event.currentTarget.matches(':disabled')) return;
        event.preventDefault();
        event.currentTarget.focus();
        if (!changedThisTurn.current) { if (open) setOpen(false); else show(false); }
      }} onChange={event => {
        setOpen(false);
        // Ignore the trailing click some native selection paths send after change.
        changedThisTurn.current = true;
        queueMicrotask(() => { changedThisTurn.current = false; });
        props.onChange?.(event);
      }} onBlur={event => { props.onBlur?.(event); setOpen(false); }} onKeyDown={onKeyDown}
      onKeyUp={event => {
        props.onKeyUp?.(event);
        if (single && (event.key === ' ' || event.key === 'Enter')) event.preventDefault();
      }}>{children}</select>
    {open && select && createPortal(<div id={listId} role="listbox" aria-label={menuLabel(select) || undefined}
      aria-labelledby={select.getAttribute('aria-labelledby') ?? undefined} ref={listRef} className="single-select-options"
      onMouseDown={event => event.preventDefault()}>
      {groups.map(group => group.label ? <div key={group.options[0].index} role="group" aria-label={group.label}>
        <div className="single-select-group-title" aria-hidden="true">{group.label}</div>{group.options.map(renderOption)}
      </div> : <Fragment key={group.options[0].index}>{group.options.map(renderOption)}</Fragment>)}
    </div>, select.closest('[role="dialog"]') ?? document.body)}
  </>;
}
