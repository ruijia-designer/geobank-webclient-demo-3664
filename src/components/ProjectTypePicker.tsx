import { useTranslation } from '../i18n';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ProjectTypeOption } from '../services/projectClassification';

interface Props {
  options: ProjectTypeOption[];
  value: string;
  onChange: (id: string) => void;
}

export function ProjectTypePicker({options,value,onChange}: Props) {
 const {t}=useTranslation();
  const [open,setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null), list = useRef<HTMLDivElement>(null);
  const [position,setPosition] = useState({left:0,top:0,width:0,maxHeight:290});
  const selected = options.find(option=>option.id===value);

  useLayoutEffect(()=>{
    if (!open) return;
    const place=()=>{
      const rect=trigger.current?.getBoundingClientRect();
      if (!rect) return;
      const gap=4, margin=12;
      const below=window.innerHeight-rect.bottom-gap-margin, above=rect.top-gap-margin;
      const desired=Math.min(290,options.length*44+2);
      const upward=below<desired && above>below;
      const maxHeight=Math.max(44,Math.min(desired,upward?above:below));
      setPosition({left:rect.left,top:upward?rect.top-gap-maxHeight:rect.bottom+gap,
        width:rect.width,maxHeight});
    };
    place();
    window.addEventListener('resize',place);
    window.addEventListener('scroll',place,true);
    return ()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);};
  },[open,options.length]);

  useEffect(()=>{
    if (!open) return;
    const outside=(event:MouseEvent)=>{
      const target=event.target as Node;
      if (!trigger.current?.contains(target)&&!list.current?.contains(target)) setOpen(false);
    };
    const escape=(event:KeyboardEvent)=>{
      if (event.key==='Escape') {event.stopPropagation();event.preventDefault();setOpen(false);trigger.current?.focus();}
    };
    document.addEventListener('mousedown',outside);
    document.addEventListener('keydown',escape,true);
    return ()=>{document.removeEventListener('mousedown',outside);document.removeEventListener('keydown',escape,true);};
  },[open]);

  return <div className="field type-picker"><span>{t("项目类型")}<em>*</em></span>
    <button ref={trigger} className="select-trigger" aria-label={t("项目类型")} aria-haspopup="listbox" aria-expanded={open}
      onClick={()=>setOpen(current=>!current)}>{selected?.path.map(part=>t(part)).join(' / ')||t('请选择最末级项目类型')}<ChevronDown size={17}/></button>
    {open&&<div ref={list} className="type-options type-options-floating" role="listbox" aria-label={t("项目类型选项")} style={position}>
      {options.map(option=><button key={option.id} role="option" disabled={!option.leaf} aria-selected={option.id===value}
        aria-label={option.path.map(part=>t(part)).join(' / ')} onClick={()=>{onChange(option.id);setOpen(false);trigger.current?.focus();}}>
        <i style={{background:option.color}}/>{option.path.map(part=>t(part)).join(' / ')}{!option.leaf&&<small>{t("请选择下级")}</small>}
      </button>)}
    </div>}
  </div>;
}
