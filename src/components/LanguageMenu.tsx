import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Check, Globe } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { Locale } from '../i18n';
import type { Route } from '../types';

const languages = [
  {code:'zh', label:'中文', lang:'zh-CN'},
  {code:'en', label:'English', lang:'en'},
  {code:'ar', label:'العربية', lang:'ar'},
  {code:'es', label:'Español', lang:'es'},
] as const;

export function LanguageMenu({route, onOpen}: {route:Route; onOpen:()=>void}) {
  const {locale,setLocale,t}=useTranslation();
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const focusIntent=useRef<'first'|'last'|'current'|null>(null);
  const menuId=useId();

  const close=(restoreFocus=false)=>{setOpen(false);if(restoreFocus)trigger.current?.focus();};
  const show=(intent:'first'|'last'|'current')=>{focusIntent.current=intent;onOpen();setOpen(true);};
  useEffect(()=>{setOpen(false);},[route]);
  useEffect(()=>{
    if(!open)return;
    const items=Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]:not(:disabled)')||[]);
    const target=focusIntent.current==='last'?items.at(-1):focusIntent.current==='current'?items.find(item=>item.getAttribute('aria-checked')==='true'):items[0];
    target?.focus();focusIntent.current=null;
    const outside=(event:MouseEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
    const escape=(event:globalThis.KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();setOpen(false);trigger.current?.focus();}};
    document.addEventListener('mousedown',outside);
    document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('mousedown',outside);document.removeEventListener('keydown',escape);};
  },[open]);

  const moveFocus=(event:KeyboardEvent<HTMLDivElement>)=>{
    if(event.key==='Tab'){close(true);return;}
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    event.preventDefault();
    const items=Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]:not(:disabled)'));
    const index=items.indexOf(document.activeElement as HTMLButtonElement);
    const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
    items[next]?.focus();
  };
  const choose=(next:Locale)=>{setLocale(next);close(true);};

  return <div className="language-picker" ref={root}>
    <button ref={trigger} className="language-button" aria-label={t('选择语言')} title={t('选择语言')}
      aria-haspopup="menu" aria-expanded={open} aria-controls={open?menuId:undefined}
      onClick={()=>open?close():show('current')}
      onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();show(event.key==='ArrowDown'?'first':'last');}}}>
      <Globe size={18}/><span>{locale==='zh'?'中':'EN'}</span>
    </button>
    {open&&<div id={menuId} className="language-menu" role="menu" aria-label={t('语言')} onKeyDown={moveFocus}>
      {languages.map(language=>{
        const supported=language.code==='zh'||language.code==='en';
        return <button key={language.code} role="menuitemradio" tabIndex={-1} disabled={!supported}
          aria-checked={locale===language.code} title={supported?undefined:t('仅展示')}
          onClick={()=>{if(language.code==='zh'||language.code==='en')choose(language.code);}}>
          <span lang={language.lang} dir={language.code==='ar'?'rtl':undefined}>{language.label}</span>
          {locale===language.code&&<Check size={16}/>}
        </button>;
      })}
    </div>}
  </div>;
}
