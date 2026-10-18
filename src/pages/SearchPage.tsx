import { useTranslation } from '../i18n';
import { useState } from 'react';
import { Search, Sparkles, RefreshCw, Copy, ChevronUp, ChevronDown, X, List, FileSearch } from 'lucide-react';
import { Modal } from '../components/Modal';
import { facets, querySearch, toggleValue } from '../services/demo';
import type { AppApi, SearchRecord, SearchState } from '../types';
import './SearchPage.css';

const fields = [['all','全部字段'],['name','项目名称'],['basin','盆地/工区'],['type','项目类型'],['year','年度']];
const groups: [keyof SearchRecord,string][] = [['basin','盆地'],['type','项目类型'],['dimension','勘探类型'],['year','年度']];
const trials = [['basin','沁水盆地','盆地名称'],['type','解释项目','项目类型'],['year','2024','年度']];

export default function SearchPage({api}:{api:AppApi}) {
 const {t}=useTranslation();
 const {state,setState,notify} = api;
 const search = state.search;
 const rows = querySearch(search,state.role);
 const [tab,setTab] = useState('项目');
 const [closed,setClosed] = useState<string[]>([]);
 const [detail,setDetail] = useState<SearchRecord|null>(null);
 const change = (patch:Partial<SearchState>) => setState(s=>({...s,search:{...s.search,...patch}}));
 const execute = () => change({query:search.draft});
 const toggle = (key:string,value:string) => change({filters:{...search.filters,[key]:toggleValue(search.filters[key]||[],value)}});
 const summary = rows.length ? t('当前检索命中 {count} 个项目，项目类型为{types}，勘探类型为{dimensions}。\n{details}',{count:rows.length,types:[...new Set(rows.map(r=>t(r.type)))].join(' / '),dimensions:[...new Set(rows.map(r=>t(r.dimension)))].join(' / '),details:rows.map(r=>t('{basin}项目年度为 {year} 年',{basin:r.basin,year:r.year})).join(t('；'))}) : t('当前条件没有匹配的项目，可以调整关键词或筛选条件后重新检索。');
 const copySummary = async () => {try {await navigator.clipboard.writeText(summary);notify(t('已复制 AI 演示摘要'))} catch {notify(t('复制不可用，请选中摘要文字复制'))}};
 return <main className="search-page">
  <section className="search-header">
   <div className="search-heading"><div><h1>{t("数据检索")}</h1><p>{t("输入关键词检索数据资源与文档资料，可开启 AI 智能搜索")}</p></div><label className="search-ai-switch">{t("AI 搜索")}<button role="switch" aria-label={t("AI 搜索")} aria-checked={search.ai} className={'switch'+(search.ai?' on':'')} onClick={()=>change({ai:!search.ai})}><span/></button><span>{t(search.ai?'已开启':'已关闭')}</span></label></div>
   <form className="search-bar" onSubmit={e=>{e.preventDefault();execute()}}><div className="search-input-wrap"><select aria-label={t("检索字段")} value={search.field} onChange={e=>change({field:e.target.value})}>{fields.map(([v,l])=><option key={v} value={v}>{t(l)}</option>)}</select><Search size={21}/><input aria-label={t("检索关键词")} placeholder={t("输入关键词检索…")} value={search.draft} onChange={e=>change({draft:e.target.value})}/></div><button className="button primary" type="submit"><Search size={20}/>{t("搜索")}</button></form>
   <div className="search-trials" aria-label={t("试试关键词")}><span>{t("试试：")}</span>{trials.map(([field,query,label])=><button key={field} onClick={()=>change({field,query,draft:query})}>{t(label)}</button>)}</div>
   <div className="search-tabs" role="tablist" aria-label={t("检索结果栏目")}>{['项目','数据','文档'].map(v=><button role="tab" aria-selected={tab===v} className={tab===v?'active':''} key={v} onClick={()=>setTab(v)}>{t(v)}</button>)}</div>
  </section>
  <div className="search-body"><aside className="search-filters card"><header><strong>{t("筛选条件")}</strong><button className="text-button" onClick={()=>change({filters:{}})}>{t("清空")}</button></header><small>{t("未选择时检索全部")}</small>
   {groups.map(([key,label])=>{const values=facets(rows,key);return <section className="facet-group" key={key}><button className="facet-title" aria-expanded={!closed.includes(key)} onClick={()=>setClosed(v=>toggleValue(v,key))}><strong>{t(label)}</strong>{closed.includes(key)?<ChevronDown size={16}/>:<ChevronUp size={16}/>}</button>{!closed.includes(key)&&(values.length?values.map(([value,count])=><label className="facet-option" key={value}><input type="checkbox" checked={(search.filters[key]||[]).includes(value)} onChange={()=>toggle(key,value)}/><span>{t(value)}</span><span className="facet-count" aria-label={t('{value}检索结果数量',{value:t(value)})}>{count}</span></label>):<p className="facet-none">{t("暂无匹配选项")}</p>)}</section>})}
  </aside><section className="search-results">
   {!!Object.values(search.filters).flat().length&&<div className="search-chips" aria-label={t("已选筛选条件")}>{Object.entries(search.filters).flatMap(([key,values])=>values.map(value=><button key={key+value} onClick={()=>toggle(key,value)} aria-label={t('取消筛选 {value}',{value:t(value)})}>{t(value)}<X size={14}/></button>))}</div>}
   {tab==='项目'?<>
    {search.ai&&<article className="search-summary card"><header><strong><Sparkles size={24}/>{t("AI 智能总结")}<span className="badge">{t("已生成")}</span></strong><div><button className="text-button" title={t("重新生成演示摘要")} onClick={()=>notify(t('已根据当前结果重新生成演示摘要'))}><RefreshCw size={16}/>{t("重新生成")}</button><button className="text-button" onClick={copySummary}><Copy size={16}/>{t("复制")}</button><button className="text-button" onClick={()=>change({summaryCollapsed:!search.summaryCollapsed})}>{search.summaryCollapsed?<ChevronDown size={16}/>:<ChevronUp size={16}/>} {t(search.summaryCollapsed?'展开':'收起')}</button></div></header>{!search.summaryCollapsed&&<><p>{summary}</p><small>{t('依据当前 {count} 条项目结果生成 · 本地演示摘要',{count:rows.length})}</small></>}</article>}
    <div className="search-result-tools card"><div>{t("共找到")}{' '}<strong aria-label={t("项目结果数量")}>{rows.length}</strong>{' '}{t("条项目结果")}<span className="tool-divider"/>{t("当前检索：")}{' '}<b>{t(fields.find(([v])=>v===search.field)?.[1]||'')}{search.query?' · '+search.query:''}</b></div><div><span>{t("排序")}</span><button className={'text-button'+(search.sort==='relevance'?' selected':'')} onClick={()=>change({sort:'relevance'})}>{t("相关度")}</button><button className={'text-button'+(search.sort==='year'?' selected':'')} onClick={()=>change({sort:'year'})}>{t("↓ 年度")}</button><span className="tool-divider"/><span className="list-only"><List size={16}/>{t("列表")}</span></div></div>
    {rows.length?rows.map((r,i)=><article className="search-result-card card" key={r.id}><div className="result-number">{String(i+1).padStart(2,'0')}</div><div className="result-card-content"><h2>{r.name}</h2><dl><div><dt>{t("所属区域")}</dt><dd>{r.basin}</dd></div><div><dt>{t("项目类型")}</dt><dd>{t(r.type)}</dd></div><div><dt>{t("勘探类型")}</dt><dd>{t(r.dimension)}</dd></div><div><dt>{t("项目年度")}</dt><dd>{r.year}</dd></div></dl></div><div className="result-card-actions"><span className="badge">{t(r.archived?'已归档':'未归档')}</span><button className="button" onClick={()=>setDetail(r)}>{t("查看参数")}</button></div></article>):<div className="card empty-state"><FileSearch size={52}/><h2>{t("暂无匹配项目")}</h2><p>{t("请调整关键词或筛选条件后重试")}</p></div>}
    {rows.length>0&&<footer className="search-pagination"><span>{t('1–{count} / 共 {count} 条',{count:rows.length})}</span><select aria-label={t("每页结果数量")}><option>{t("30 条/页")}</option></select><button className="button" disabled>{t("首页")}</button><button className="button" disabled>{t("上一页")}</button><button className="button primary">1</button><button className="button" disabled>{t("下一页")}</button><button className="button" disabled>{t("末页")}</button></footer>}
   </>:<div className="card empty-state"><FileSearch size={52}/><h2>{t('暂无{tab}结果',{tab:t(tab)})}</h2><p>{t('当前设计未提供{tab}结果样例',{tab:t(tab)})}</p></div>}
  </section></div>
  {detail&&<Modal title={t("项目参数")} onClose={()=>setDetail(null)} footer={<button className="button" onClick={()=>setDetail(null)}>{t("关闭")}</button>}><h3>{detail.name}</h3><dl className="parameter-grid"><dt>{t("所属区域")}</dt><dd>{detail.basin}</dd><dt>{t("项目类型")}</dt><dd>{t(detail.type)}</dd><dt>{t("勘探类型")}</dt><dd>{t(detail.dimension)}</dd><dt>{t("项目年度")}</dt><dd>{detail.year}</dd><dt>{t("归档状态")}</dt><dd>{t(detail.archived?'已归档':'未归档')}</dd></dl></Modal>}
 </main>
}
