import { useTranslation } from '../i18n';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
export function Modal({title,onClose,children,footer,wide=false,icon,className=''}:{title:string;onClose:()=>void;children:ReactNode;footer?:ReactNode;wide?:boolean;icon?:ReactNode;className?:string}){
 const {t}=useTranslation();
 const ref=useRef<HTMLDivElement>(null),closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{const old=document.activeElement as HTMLElement|null;const dialog=ref.current;dialog?.querySelector<HTMLElement>('input,select,button')?.focus();const handler=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.stopPropagation();closeRef.current()}if(e.key==='Tab'&&dialog){const els=Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]'));const a=els[0],b=els.at(-1);if(e.shiftKey&&document.activeElement===a){e.preventDefault();b?.focus()}else if(!e.shiftKey&&document.activeElement===b){e.preventDefault();a?.focus()}}};document.addEventListener('keydown',handler);return()=>{document.removeEventListener('keydown',handler);old?.focus()}},[]);
 return <div className="modal-cover" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div ref={ref} role="dialog" aria-modal="true" aria-label={t(title)} className={'modal'+(wide?' modal-wide':'')+(className?' '+className:'')}><header><h2>{icon}{t(title)}</h2><button className="icon-button" aria-label={t("关闭")} onClick={onClose}><X size={22}/></button></header><div className="modal-body">{children}</div>{footer&&<footer>{footer}</footer>}</div></div>
}
