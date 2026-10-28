import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { ChevronDown, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { Route } from '../types';

const toolLinks = [
  {label:'资产监控',href:'https://example.com/#asset-monitoring'},
  {label:'AI 开放平台',href:'https://example.com/#ai-open-platform'},
];

export interface ResultsPreviewControl { active:boolean;onToggle:()=>void }

export function ToolsMenu({route,onOpen,resultsPreview}:{route:Route;onOpen:()=>void;resultsPreview?:ResultsPreviewControl}) {
  const {t}=useTranslation();
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const initialFocus=useRef<'first'|'last'>('first');
  const menuId=useId();
  const close=(restoreFocus=false)=>{setOpen(false);if(restoreFocus)trigger.current?.focus();};
  const show=(focus:'first'|'last'='first')=>{initialFocus.current=focus;onOpen();setOpen(true);};
  useEffect(()=>{setOpen(false);},[route]);
  useEffect(()=>{
    if(!open)return;
    const items=root.current?.querySelectorAll<HTMLElement>('[role="menuitem"]');
    (initialFocus.current==='last'?items?.[items.length-1]:items?.[0])?.focus();
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
    const items=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const index=items.indexOf(document.activeElement as HTMLElement);
    const next=event.key==='Home'?0:event.key==='End'?items.length-1:(index+(event.key==='ArrowDown'?1:-1)+items.length)%items.length;
    items[next]?.focus();
  };
  return <div className="tools-picker" ref={root}>
    <button ref={trigger} className="tools" aria-haspopup="menu" aria-expanded={open} aria-controls={open?menuId:undefined}
      onClick={()=>open?close():show()}
      onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();show(event.key==='ArrowUp'?'last':'first');}}}>
      {t('工具')}<ChevronDown size={16}/>
    </button>
    {open&&<div id={menuId} className="tools-menu" role="menu" aria-label={t('工具')} onKeyDown={moveFocus}>
      {toolLinks.map(link=><a key={link.label} role="menuitem" tabIndex={-1} href={link.href} target="_blank" rel="noopener noreferrer"
        title={t('示例链接')} onClick={()=>close(true)}><span>{t(link.label)}</span><ExternalLink size={15}/></a>)}
      {import.meta.env.DEV&&route.page==='results'&&resultsPreview&&<button type="button" role="menuitem" tabIndex={-1}
        onClick={()=>{resultsPreview.onToggle();close(true);}}>
        <span>{t(resultsPreview.active?'退出无权限预览':'预览无权限页面')}</span>
        {resultsPreview.active?<EyeOff size={15}/>:<Eye size={15}/>}</button>}
    </div>}
  </div>;
}
