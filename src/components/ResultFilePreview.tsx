import { useEffect, useId, useState } from 'react';
import { FileText } from 'lucide-react';
import type { ResultFile } from '../services/results';
import { getResultFileSource } from '../services/resultPreview';
import { useTranslation } from '../i18n';
import './ResultFilePreview.css';

interface Props { file:ResultFile;projectName:string;projectId:string }
type PreviewKind='text'|'image'|'pdf'|'unsupported';
interface Content { key:string;source:Blob;kind:PreviewKind;text?:string;url?:string;error?:boolean }
const TEXT_LIMIT=1024*1024;
const textFormats=new Set(['las','txt','csv','tsv','json','geojson','md','log','xml','yaml','yml','ini','conf']);
const imageTypes:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp'};

export function ResultFilePreview({file,projectName,projectId}:Props) {
  const {t}=useTranslation();
  const headingId=useId();
  const source=getResultFileSource(projectId,file.id);
  const format=(file.format||file.name.split('.').at(-1)||'').replace(/^\./,'').toLowerCase();
  const kind:PreviewKind=textFormats.has(format)?'text':imageTypes[format]?'image':format==='pdf'?'pdf':'unsupported';
  const key=JSON.stringify([projectId,file.id,format]);
  const [content,setContent]=useState<Content|null>(null);

  useEffect(()=>{
    if(!source){setContent(null);return;}
    let active=true,url:string|undefined,reader:FileReader|undefined;
    setContent({key,source,kind});
    if(kind==='text'){
      reader=new FileReader();
      reader.onload=()=>{
        if(!active)return;
        const text=typeof reader?.result==='string'?reader.result:'';
        setContent({key,source,kind,text,error:text.includes('\0')});
      };
      reader.onerror=()=>{if(active)setContent({key,source,kind,error:true});};
      try{reader.readAsText(source.slice(0,TEXT_LIMIT),'UTF-8');}
      catch{setContent({key,source,kind,error:true});}
    }else if(kind==='image'||kind==='pdf'){
      try{
        const typedSource=new Blob([source],{type:kind==='pdf'?'application/pdf':imageTypes[format]});
        url=URL.createObjectURL(typedSource);
        setContent({key,source,kind,url});
      }catch{setContent({key,source,kind,error:true});}
    }
    return()=>{
      active=false;
      if(reader?.readyState===FileReader.LOADING)reader.abort();
      if(url)URL.revokeObjectURL(url);
    };
  },[key,source,kind,format]);

  const current=content?.key===key&&content.source===source?content:null;
  const failed=()=>setContent(previous=>previous?.key===key&&previous.source===source?{...previous,error:true}:previous);
  const message=!source?'暂无可预览内容':kind==='unsupported'?'暂不支持此格式的内容预览':current?.error?'无法预览此文件内容':null;
  const facts=[['格式',format?format.toUpperCase():'—'],['所属目录',t(file.directory)||'—'],['项目',projectName||'—'],['大小',file.size||'—'],['上传时间',file.uploaded||'—'],['上传人',file.user||'—']];

  return <section className="result-file-preview" aria-labelledby={headingId}>
    <header className="result-file-preview-heading"><FileText size={24} aria-hidden="true"/><h2 id={headingId}>{file.name}</h2></header>
    <dl className="result-file-preview-facts">{facts.map(([label,value])=><div key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>)}</dl>
    <div className="result-file-preview-content">
      {message?<div className="result-file-preview-empty"><FileText size={40} aria-hidden="true"/><p>{t(message)}</p></div>
      :!current||kind==='text'&&current.text===undefined?<p className="result-file-preview-loading" role="status">{t('正在读取文件内容…')}</p>
      :kind==='text'?<>{source&&source.size>TEXT_LIMIT&&<p className="result-file-preview-notice">{t('文件较大，仅预览前 1 MiB 内容。')}</p>}{current.text?<pre className="result-file-preview-text" tabIndex={0} aria-label={t('文件文本内容')}>{current.text}</pre>:<p className="result-file-preview-loading">{t('文件内容为空')}</p>}</>
      :kind==='image'&&current.url?<img className="result-file-preview-image" src={current.url} alt={file.name} onError={failed}/>
      :kind==='pdf'&&current.url?<iframe className="result-file-preview-pdf" src={current.url} title={t('PDF文件预览')} referrerPolicy="no-referrer" onError={failed}/>:null}
    </div>
  </section>;
}
