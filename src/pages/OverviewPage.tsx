import { useTranslation } from '../i18n';
import { useEffect,useRef,useState } from 'react';
import { flushSync } from 'react-dom';
import { Search,ChevronLeft,Plus,MoreVertical,MapPin,Eye } from 'lucide-react';
import type { AppApi } from '../types';
import { visibleProjects,createProject } from '../services/demo';
import { MapView } from '../components/MapView';
import { ProjectMapCard } from '../components/ProjectMapCard';
import { OverviewFilters } from '../components/OverviewFilters';
import { matchesOverviewFilters } from '../services/overviewFilters';
import { Modal } from '../components/Modal';
import { ProjectTypePicker } from '../components/ProjectTypePicker';
import { getBasinOptions, getProjectTypeOptions, projectTypeColor } from '../services/projectClassification';
import { useOverviewWidth } from '../hooks/useOverviewWidth';
import './overview.css';
function ProjectFilterIcon(){
 return <svg className="overview-mode-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M5 3v18M12 3v18M19 3v18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
  <circle cx="5" cy="8" r="2.6" fill="currentColor"/>
  <circle cx="12" cy="14" r="2.6" fill="currentColor"/>
  <circle cx="19" cy="7" r="2.6" fill="currentColor"/>
 </svg>;
}
function ProjectColorIcon(){
 return <svg className="overview-mode-icon overview-color-icon" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
  <rect x="2" y="2" width="8" height="8" rx="1.5" fill="#248fb7"/>
  <rect x="14" y="2" width="8" height="8" rx="1.5" fill="#6bb3cb"/>
  <rect x="2" y="14" width="8" height="8" rx="1.5" fill="#cc8356"/>
  <rect x="14" y="14" width="8" height="8" rx="1.5" fill="#8170b5"/>
 </svg>;
}
export default function OverviewPage({api}:{api:AppApi}){
 const {t}=useTranslation();
 const {state,setState,notify}=api;const [mode,setMode]=useState<'list'|'filter'|'color'>('list'),[moreId,setMoreId]=useState<string|null>(null),[create,setCreate]=useState(false),[name,setName]=useState(''),[type,setType]=useState(''),[basin,setBasin]=useState(''),[error,setError]=useState('');
 const clickTimer=useRef<ReturnType<typeof setTimeout>|null>(null),menuRef=useRef<HTMLDivElement>(null),[collapsedSidebar,setCollapsedSidebar]=useState(false);
 const columns=useOverviewWidth(collapsedSidebar);
 const [visibleProjectIds,setVisibleProjectIds]=useState<string[]|null>(null);
 const [mapFocusId,setMapFocusId]=useState<string|null>(state.selectedProjectId);
 const typeOptions=getProjectTypeOptions(),basins=getBasinOptions(),selectedType=typeOptions.find(t=>t.id===type);
 const allowed=visibleProjects(state.projects.filter(p=>p.id!=='current'),state.role);const candidates=allowed.filter(p=>(p.name+p.basin+p.year+p.type).toLowerCase().includes(state.overviewQuery.toLowerCase())&&matchesOverviewFilters(p,state.overviewFilters));
 const projects=state.overviewFilters.inViewport?.includes('true')&&visibleProjectIds?candidates.filter(p=>visibleProjectIds.includes(p.id)):candidates;
 const selected=candidates.find(p=>p.id===state.selectedProjectId);
 useEffect(()=>{if(mapFocusId&&!candidates.some(p=>p.id===mapFocusId))setMapFocusId(null);},[candidates,mapFocusId]);
 useEffect(()=>{if(clickTimer.current)clearTimeout(clickTimer.current);setMoreId(null);if(state.selectedProjectId&&!candidates.some(p=>p.id===state.selectedProjectId)){setMapFocusId(null);setState(s=>({...s,selectedProjectId:null,mapZoom:1}));}},[state.overviewQuery,state.overviewFilters,state.role,state.projects]);
 useEffect(()=>{const listener=(e:MouseEvent)=>{if(menuRef.current&&!menuRef.current.contains(e.target as Node))setMoreId(null)};const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setMoreId(null)};document.addEventListener('click',listener);document.addEventListener('keydown',esc);return()=>{document.removeEventListener('click',listener);document.removeEventListener('keydown',esc);if(clickTimer.current)clearTimeout(clickTimer.current)}},[]);
 const locate=(id:string)=>{if(clickTimer.current)clearTimeout(clickTimer.current);setMoreId(null);setMapFocusId(id);setState(s=>({...s,selectedProjectId:id,mapZoom:2.2}));notify(t('已定位到 {basin}',{basin:allowed.find(p=>p.id===id)?.basin||''}))};
 const refresh=()=>{if(clickTimer.current)clearTimeout(clickTimer.current);setMoreId(null);setMapFocusId(null);setState(s=>({...s,selectedProjectId:null,mapZoom:1}));notify('已刷新地图，恢复全部项目视图')};
 const submit=()=>{if(!name.trim()||!basins.includes(basin)||!selectedType?.leaf){setError('请填写项目名称，选择所属盆地和最末级项目类型');return}const p=createProject(name,selectedType.name,{basin,typeId:selectedType.id,typePath:selectedType.path});flushSync(()=>setState(s=>({...s,projects:[...s.projects,p],currentProjectId:p.id,selectedProjectId:null,resultTab:'overview',rightMaximized:false,informationMaximized:false})));setCreate(false);api.navigate({page:'results',projectId:p.id});notify('项目创建成功')};
 return <div ref={columns.containerRef} style={columns.style} className={'overview-page '+(collapsedSidebar?'sidebar-collapsed ':'')+(columns.resizing?'is-resizing':'')}>
 {!collapsedSidebar&&<aside className="overview-sidebar"><div className="overview-toolbar"><label className="overview-search"><Search size={20}/><input aria-label={t("搜索项目")} placeholder={t("搜索")} value={state.overviewQuery} onChange={e=>setState(s=>({...s,overviewQuery:e.target.value}))}/></label><button className={'icon-button '+(mode==='filter'?'active':'')} aria-label={t("筛选项目")} aria-pressed={mode==='filter'} title={t("筛选项目")} onClick={()=>setMode(mode==='filter'?'list':'filter')}><ProjectFilterIcon/></button><button className={'icon-button '+(mode==='color'?'active':'')} aria-label={t("配色方式")} aria-pressed={mode==='color'} title={t("配色方式")} onClick={()=>setMode(mode==='color'?'list':'color')}><ProjectColorIcon/></button></div>
 {mode==='list'?<><div className="overview-count"><strong>{t('{count} 个项目',{count:projects.length})}</strong><span>{t(state.colorMode==='type'?'按项目类型着色':'按年度着色')}</span></div><div className="project-list">{projects.map(p=><article key={p.id} className={'project-card '+(selected?.id===p.id?'selected':'')} role="button" tabIndex={0} aria-label={t('项目：{name}',{name:p.name})} onClick={e=>{if(e.detail>1)return;if(clickTimer.current)clearTimeout(clickTimer.current);clickTimer.current=setTimeout(()=>locate(p.id),320)}} onDoubleClick={()=>{if(clickTimer.current)clearTimeout(clickTimer.current);api.openProject(p)}} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='Enter'){e.preventDefault();api.openProject(p)}if(e.key===' '){e.preventDefault();locate(p.id)}}}><span className="project-stripe" title={t(p.type)} aria-label={t(p.type)}><span className="project-stripe-type" style={{color:state.colorMode==='year'?(p.year==='2024'?'#249bb9':'#c68457'):projectTypeColor(p)}}/></span><div className="project-lines"><h3>{p.name}</h3><p>{p.year||'—'}｜{p.basin||'—'}｜{t(p.type)}{!p.readable?'｜'+p.area+' km²':''}</p></div><div className="project-badges">{p.readable&&<span className="badge readable">{t("可查阅")}</span>}{!p.archived&&<span className="project-archive-icon" role="img" aria-label={t("未归档")} title={t("未归档")}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M11 11V6.5a5 5 0 0 1 10 0V9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/><rect x="3" y="10" width="14" height="12" rx="3" fill="currentColor"/></svg></span>}</div><button className="project-more" aria-label={t('{name}更多菜单',{name:p.name})} title={t("更多操作")} onClick={e=>{e.stopPropagation();if(clickTimer.current)clearTimeout(clickTimer.current);setMoreId(moreId===p.id?null:p.id)}} onDoubleClick={e=>e.stopPropagation()}><MoreVertical size={19}/></button>{moreId===p.id&&<div ref={menuRef} className="project-menu" role="menu" onClick={e=>e.stopPropagation()}><button role="menuitem" onClick={()=>locate(p.id)}><MapPin size={16}/>{t("定位到")}</button><button role="menuitem" onClick={()=>{setMoreId(null);api.openProject(p)}}><Eye size={16}/>{t("查阅")}</button></div>}</article>)}{!projects.length&&<div className="empty-state"><h3>{t("暂无匹配项目")}</h3><p>{t("请调整关键词或筛选条件")}</p></div>}</div></>:
 mode==='color'?<section className="color-panel"><h3>{t("选择配色方式")}</h3><div className="color-choices"><label><input type="radio" name="color" checked={state.colorMode==='type'} onChange={()=>setState(s=>({...s,colorMode:'type'}))}/>{t("按项目类型配色")}</label><label><input type="radio" name="color" checked={state.colorMode==='year'} onChange={()=>setState(s=>({...s,colorMode:'year'}))}/>{t("按年度配色")}</label></div><button className="button primary color-apply" onClick={()=>{setMode('list');notify('已应用配色')}}>{t("应用配色")}</button></section>:
 <OverviewFilters value={state.overviewFilters} basins={[...new Set([...basins,...allowed.map(project=>project.basin).filter(Boolean)])]} role={state.role} onClose={()=>setMode('list')} onReset={()=>setState(s=>({...s,overviewFilters:{}}))} onApply={overviewFilters=>{setState(s=>({...s,overviewFilters}));setMode('list')}}/>}
 {state.role==='admin'&&mode==='list'&&<div className="create-project-footer"><button className="button primary" onClick={()=>{setCreate(true);setName('');setType('');setBasin('');setError('')}}><Plus size={18}/>{t("新建项目")}</button></div>}</aside>}
 {!collapsedSidebar&&<div {...columns.separatorProps}/>}
 <div className="overview-map"><MapView projects={candidates} onVisibleProjectsChange={setVisibleProjectIds} selectedId={state.selectedProjectId} focusId={mapFocusId} zoom={state.mapZoom} collapsed={state.panelCollapsed} colorMode={state.colorMode} onToggle={()=>setState(s=>({...s,panelCollapsed:!s.panelCollapsed}))} onRefresh={refresh} onZoom={mapZoom=>setState(s=>({...s,mapZoom}))} onLocate={id=>{if(clickTimer.current)clearTimeout(clickTimer.current);setMoreId(null);setState(s=>({...s,selectedProjectId:id}));}} renderProjectDetails={(project,anchor)=><ProjectMapCard key={project.id} project={project} projects={state.projects} role={state.role} anchor={anchor} archivePending={!!state.archiveRequests?.[project.id]} onClose={()=>setState(s=>({...s,selectedProjectId:null}))} onOpen={api.openProject}/>}/><button className="map-round sidebar-toggle" title={t(collapsedSidebar?'展开项目列表':'收起项目列表')} aria-label={t(collapsedSidebar?'展开项目列表':'收起项目列表')} onClick={()=>setCollapsedSidebar(v=>!v)}><ChevronLeft style={{transform:collapsedSidebar?'rotate(180deg)':undefined}}/></button></div>
 {create&&<Modal title={t("新建项目")} onClose={()=>setCreate(false)} footer={<><button className="button" onClick={()=>setCreate(false)}>{t("取消")}</button><button className="button primary" onClick={submit}>{t("确定")}</button></>}><div className="field"><span>{t("项目名称")}<em>*</em></span><input aria-label={t("项目名称")} placeholder={t("请输入项目名称")} value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')submit()}}/></div><label className="field"><span>{t("所属盆地")}<em>*</em></span><select aria-label={t("所属盆地")} value={basin} onChange={e=>setBasin(e.target.value)}><option value="">{t("请选择所属盆地")}</option>{basins.map(value=><option key={value} value={value}>{value}</option>)}</select></label><ProjectTypePicker options={typeOptions} value={type} onChange={setType}/>{error&&<p className="error-text" role="alert">{t(error)}</p>}</Modal>}
 </div>
}
