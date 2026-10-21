import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, ClipboardList, FileText, Folder, FolderOpen, Import, Layers, Map as MapIcon, Maximize, Minimize, Download, Pencil, RefreshCw, Search, SquareSplitHorizontal, Upload, X } from 'lucide-react';
import type { AppApi, Project } from '../types';
import { canRead, projectOptions, resolveProject } from '../services/demo';
import { Modal } from '../components/Modal';
import { ProjectArchiveControl } from '../components/ProjectArchiveControl';
import { ResultFileTable } from '../components/ResultFileTable';
import { MapView } from '../components/MapView';
import { RESULT_DIRECTORIES, REMOTE_FILES, INITIAL_RESULT_FILES, getResultDirectories, getDirectoryStatus, getResultSummary, getDownloadSummary, resultFileBytes, bytesLabel, initialResultInfo, resultFilesCache, resultInfoCache, saveProjectInfo, saveDirectoryFiles, importProjectInformation, appendUploadedFiles, removeFiles } from '../services/results';
import type { ResultFile, ResultInfo, ResultDirectory } from '../services/results';
import {projectTypeColor,projectTypeLabel} from '../services/projectClassification';
import { useResultColumns } from '../hooks/useResultColumns';
import {useTranslation} from '../i18n';
import './ResultsPage.css';
type Dialog = 'import' | 'local' | 'remote' | 'delete' | 'file' | 'fields' | null;
const tabs = [{ id: 'overview', label: '成果概览', Icon: FileText }, { id: 'gis', label: '综合成图', Icon: MapIcon }, { id: 'doc', label: '设计文档.doc', Icon: FileText }, { id: 'las', label: 'B1-1.las', Icon: FileText }, { id: 'report', label: '设计文档.doc', Icon: FileText }];
const infoLabels: [
    string,
    string
][] = [['name', '项目名称'], ['basin', '所属盆地'], ['areaName', '所属工区'], ['depression', '坳陷'], ['concavity', '凹陷'], ['location', '工区位置'], ['area', '工区面积（km²）'], ['client', '甲方'], ['contractor', '承包商'], ['start', '起始日期'], ['end', '结束日期'], ['year', '年度']];
const seismicFields:[string,string][]=[['seismicName','数据名'],['seismicDomain','数据域类型'],['seismicDimension','地震数据维度'],['seismicSize','数据大小（GB）'],['seismicSample','线道间隔/采样率（ms）']];
const sgyFields:[string,string][]=[['iline','iline'],['xline','xline'],['xloc','xloc'],['istep','istep'],['xstep','xstep'],['yloc','yloc']];
const geologyFields:[string,string][]=[['normalFault','正断层'],['reverseFault','逆断层'],['strikeSlip','走滑断层'],['buriedHill','潜山'],['channel','河道'],['cave','溶洞'],['slope','坡体'],['saltDome','盐丘'],['intrusive','侵入体'],['unconformity','不整合面']];
const structureFields:[string,string][]=[['layerCount','层位（个）'],['faultCount','断层（条）']];
const wellFields:[string,string][]=[['wellCount','井数'],['curveCount','测井曲线'],['hasTimeDepth','是否有时深关系']];
const selectFields:Record<string,string[]>={areaName:['大安区块','川南低陡褶带南缘太阳工区'],depression:['东部坳陷','北部坳陷'],concavity:['田东凹陷','福山凹陷'],client:['浙江油田','胜利油田'],contractor:['北京市海天吉佳科技公司','东方地球物理公司西南物探分公司'],seismicDomain:['时间域','深度域'],seismicDimension:['二维','三维']};
const numericFields=new Set(['area','seismicSize','seismicSample','layerCount','faultCount','wellCount','curveCount',...sgyFields.map(([key])=>key)]);
const integerFields=new Set(['layerCount','faultCount','wellCount','curveCount']);
function value(v?:string) { return v || '—'; }
function InfoTable({data,fields,editing=false,onChange,className='result-facts'}:{data:Record<string,string>;fields:[string,string][];editing?:boolean;onChange?:(key:string,value:string)=>void;className?:string}){
    const {t}=useTranslation();
    return <div className={className}>{fields.map(([key,label])=>{
        const choices=selectFields[key]||(geologyFields.some(([name])=>name===key)||key==='hasTimeDepth'?['有','无']:null);
        const current=data[key]||'';
        return <div key={key} className={key==='name'||key==='year'||key==='seismicName'?'span-two':''}><dt>{t(label)}</dt><dd>{editing?(key==='basin'?<input className="read-only-field" aria-label={t(label)} title={t("只读")} readOnly value={value(current)}/>:choices?<select aria-label={t(label)} value={current} onChange={e=>onChange?.(key,e.target.value)}><option value="">{t("请选择")}</option>{[...new Set([...choices,...(current?[current]:[])])].map(option=><option key={option} value={option}>{['seismicDomain','seismicDimension','hasTimeDepth'].includes(key)||geologyFields.some(([name])=>name===key)?t(option):option}</option>)}</select>:<input aria-label={t(label)} value={current} placeholder={t("请输入")} type={key==='start'||key==='end'?'date':numericFields.has(key)||key==='year'?'number':'text'} min={numericFields.has(key)?0:undefined} step={integerFields.has(key)?1:'any'} onChange={e=>onChange?.(key,e.target.value)}/>):['seismicDomain','seismicDimension','hasTimeDepth'].includes(key)||geologyFields.some(([name])=>name===key)?t(value(current)):value(current)}</dd></div>;
    })}</div>;
}
function Information({info,onEdit,onImport,editing,onChange,onSave,onCancel,error}:{info:ResultInfo;onEdit:()=>void;onImport:()=>void;editing:boolean;onChange:(key:string,value:string)=>void;onSave:()=>void;onCancel:()=>void;error:string}){
    const {t}=useTranslation();
    const table=(fields:[string,string][],className?:string)=><InfoTable data={info} fields={fields} editing={editing} onChange={onChange} className={className}/>;
    return <><header className="information-heading"><h1>{t(editing?'编辑项目信息':'项目信息')}</h1><div>{editing?<><button className="button small" onClick={onCancel}>{t("取消")}</button><button className="button primary small" onClick={onSave}>{t("保存")}</button></>:<><button className="button small" onClick={onImport}><Import size={16}/>{t("导入")}</button><button className="button small" onClick={onEdit}><Pencil size={16}/>{t("编辑")}</button></>}</div></header>{error&&<p className="form-error" role="alert">{t(error)}</p>}<section className="card information-card"><h2><ClipboardList size={20}/>{t("基本信息")}</h2>{table(infoLabels)}</section><section className="card information-card"><h2><ClipboardList size={20}/>{t("地震数据信息")}</h2>{table(seismicFields)}</section><section className="card information-card"><h2><ClipboardList size={20}/>{t("SGY道头信息")}</h2>{table(sgyFields,'result-sgy')}</section><section className="card information-card"><h2><ClipboardList size={20}/>{t("地质体类型")}</h2>{table(geologyFields,'result-geology')}</section><div className="information-pair"><section className="card information-card"><h2><ClipboardList size={20}/>{t("构造成果数据")}</h2>{table(structureFields)}</section><section className="card information-card"><h2><ClipboardList size={20}/>{t("测井数据")}</h2>{table(wellFields)}</section></div><section className="card information-card"><h2><ClipboardList size={20}/>{t("备注")}</h2>{editing?<textarea className="project-note-editor" aria-label={t("备注")} value={info.note} onChange={e=>onChange('note',e.target.value)}/>:<p className="project-note">{value(info.note)}</p>}</section></>;
}
function OverviewContent({api,info,project,files,directories,onDirectory}:{api:AppApi;info:ResultInfo;project:Project;files:ResultFile[];directories:ResultDirectory[];onDirectory:(name:string)=>void}){
    const {t}=useTranslation();
    const summary=getResultSummary(directories,files,project.id.startsWith('created-'));
    const downloads=getDownloadSummary(project.id);
    const recent=[...summary.files].sort((a,b)=>b.uploaded.localeCompare(a.uploaded)).slice(0,4);
    const groupLabels:Record<string,string>={'井筒数据':'井筒数据成果','处理数据':'处理数据','解释成果':'解释成果','反演与建模':'反演与建模成果','综合成图':'成图成果','项目文档':'文档成果'};
    return <div className="result-overview"><header className="result-overview-heading"><h2>{t("成果概览")}</h2><ProjectArchiveControl key={project.id} api={api} project={project} fileCount={summary.files.length} totalBytes={summary.totalBytes}/></header><div className="overview-summary"><div><span>{t("工区位置")}</span><strong>{value(info.location)}</strong></div><div><span>{t("工区面积（km²）")}</span><strong>{value(info.area)}</strong></div><div><span>{t("数据资产总量")}</span><strong>{summary.files.length} {t('项')} / {bytesLabel(summary.totalBytes)}</strong></div><div><span>{t("项目周期")}</span><strong>{info.start?info.start+' '+t('至')+' '+value(info.end):'—'}</strong></div></div>
    <h3><ClipboardList size={20}/>{t("数据资产详情")}</h3><div className="result-assets">{directories.filter(group=>group.name!=='基本信息').map(group=>{const groupFiles=summary.files.filter(file=>group.items.includes(file.directory));return <button key={group.name} className="card" onClick={()=>onDirectory(groupFiles[0]?.directory||group.items[0])}><span>{t(groupLabels[group.name]||group.name)}</span><strong>{groupFiles.length} {t('项')} / {bytesLabel(groupFiles.reduce((total,file)=>total+resultFileBytes(file),0))}</strong></button>;})}</div>
    <h3><ClipboardList size={20}/>{t("成果完整度详情")}</h3><section className="card result-completeness"><div className="completion-heading"><strong>{summary.percent}%</strong><span>{t('已录入')} {summary.ready}　{t('未录入')} {summary.pending}　{t('无需录入')} {summary.neutral}</span></div><progress aria-label={t("成果完整度")} value={summary.percent} max={100}/><div className="table-wrap completion-table-wrap"><table className="completion-table" aria-label={t("成果完整度明细")}><thead><tr>{['类别','名称','数量','大小','状态','备注'].map(label=><th key={label}>{t(label)}</th>)}</tr></thead><tbody>{summary.entries.map(entry=><tr key={entry.name}><td>{t(entry.group)}</td><td><button className="completion-directory-link" onClick={()=>onDirectory(entry.name)}>{t(entry.name)}</button></td><td>{entry.count}</td><td>{bytesLabel(entry.totalBytes)}</td><td><span className="completion-row-status"><i className={'status-dot '+entry.status}/>{t(entry.status==='ready'?'已录入':entry.status==='pending'?'未录入':'无需录入')}</span></td><td>{entry.note||'—'}</td></tr>)}</tbody></table></div></section>
    <h3><RefreshCw size={18}/>{t("最近上传")}</h3>{!recent.length?<div className="empty-state">{t("暂无上传记录")}</div>:<div className="recent-files">{recent.map(file=><div key={file.id}><FileText size={22}/><span><strong>{file.name}</strong><small>{file.user}　{file.uploaded}</small></span><b>{file.size}</b></div>)}</div>}
    <h3><Download size={18}/>{t("最近数据下载动态")}</h3><section className="card result-downloads"><div className="download-summary"><span>{t("下载次数")}<strong>{downloads.count}</strong></span><span>{t("下载总量")}<strong>{bytesLabel(downloads.totalBytes)}</strong></span><span>{t("下载人数")}<strong>{downloads.users}</strong></span></div>{!downloads.records.length?<div className="empty-state">{t("暂无下载记录")}</div>:<div className="recent-files">{downloads.records.map(record=><div key={record.id}><Download size={20}/><span><strong>{record.fileName}</strong><small>{record.user}　{record.time}</small></span><b>{bytesLabel(record.bytes)}</b></div>)}</div>}</section></div>;
}
export default function ResultsPage({ api }: {
    api: AppApi;
}) {
    const {t}=useTranslation();
    const { state, setState } = api;
    const project = resolveProject(state) || projectOptions(state)[0];
    const id = project?.id || 'current';
    const blank = id.startsWith('created-');
    const directories=project?getResultDirectories(project):RESULT_DIRECTORIES;
    const [info, setInfo] = useState<ResultInfo>(project ? {...initialResultInfo(project),...resultInfoCache[id]} : initialResultInfo({ id: '', name: '', basin: '', area: '', year: '', type: '', readable: false, archived: false, point: [0, 0] }));
    const [directory, setDirectory] = useState(state.route.section === 'wells' ? '测井数据' : '项目信息');
    const layoutMode = state.rightMaximized ? 'right' : state.informationMaximized ? 'information' : 'split';
    const columns = useResultColumns(layoutMode, layoutMode !== 'right');
    const [collapsedGroups, setCollapsedGroups] = useState<string[]>([]);
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [projectQuery, setProjectQuery] = useState('');
    const [closedTabs, setClosedTabs] = useState<string[]>([]);
    const [dialog, setDialog] = useState<Dialog>(null);
    const [draft, setDraft] = useState(info);
    const [editing,setEditing]=useState(false);
    const visibleLayoutBeforeHide=useRef(false);
    const [formError, setFormError] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [localFile, setLocalFile] = useState<File | null>(null);
    const [remoteSource, setRemoteSource] = useState('');
    const [directoryQuery, setDirectoryQuery] = useState('');
    const [remoteDirectory, setRemoteDirectory] = useState('');
    const [remoteQuery, setRemoteQuery] = useState('');
    const [remoteChosen, setRemoteChosen] = useState<string[]>([]);
    const [remoteExpanded, setRemoteExpanded] = useState(true);
    const [fileRows, setFileRows] = useState<ResultFile[]>(resultFilesCache[id] || (blank ? [] : INITIAL_RESULT_FILES));
    const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
    useEffect(() => { setSelectedFiles([]); }, [id, directory]);
    const [activeFile, setActiveFile] = useState<ResultFile | null>(null);
    const [deleteIds, setDeleteIds] = useState<string[]>([]);
    const [dataPanelCollapsed, setDataPanelCollapsed] = useState(false);
    const [mapZoom, setMapZoom] = useState(1);
    const infoRef = useRef<HTMLElement>(null), rightRef = useRef<HTMLDivElement>(null);
    const scrollPositions = useRef({ info: 0, right: 0 });
    const maximizedScrollPositions = useRef<{ info: number | null; right: number | null }>({ info: null, right: null });
    const section = state.route.section;
    useEffect(() => { if (project) {
        setInfo({...initialResultInfo(project),...resultInfoCache[id]});
        setFileRows(resultFilesCache[id] || (blank ? [] : INITIAL_RESULT_FILES));
        setSelectedFiles([]);
        setDialog(null);
        setEditing(false);
        setFormError('');
    } }, [id]);
    useEffect(() => {
        const requested=section==='wells'?'测井数据':section;
        setDirectory(requested&&directories.some(group=>group.items.includes(requested))?requested:'项目信息');
    }, [section,id]);
    useEffect(() => { const click = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.result-project-selector'))
        setSelectorOpen(false); if (!(e.target as HTMLElement).closest('.file-upload-dropdown'))
        setMenuOpen(false); }; const key = (e: KeyboardEvent) => { if (e.key === 'Escape') {
        setSelectorOpen(false);
        setMenuOpen(false);
    } }; document.addEventListener('click', click); document.addEventListener('keydown', key); return () => { document.removeEventListener('click', click); document.removeEventListener('keydown', key); }; }, []);
    // Restore synchronously after a layout change: a delayed animation frame could
    // overwrite a scroll the user makes before the next unrelated render (e.g. locale).
    useLayoutEffect(() => {
        if (infoRef.current && !state.rightMaximized)
            infoRef.current.scrollTop = (state.informationMaximized ? maximizedScrollPositions.current.info : null) ?? scrollPositions.current.info;
        if (rightRef.current && !state.informationMaximized)
            rightRef.current.scrollTop = (state.rightMaximized ? maximizedScrollPositions.current.right : null) ?? scrollPositions.current.right;
    }, [state.rightMaximized, state.informationMaximized]);
    if (!project || !canRead(project, state.role))
        return <div className="results-denied empty-state"><Folder size={44}/><h2>{t("您无浏览此项目数据的权限")}</h2><button className="button primary" onClick={() => api.navigate({ page: 'overview' })}>{t("返回概览")}</button></div>;
    const selectDirectory = (n: string) => { setDirectory(n); setMenuOpen(false); setState(s => ({ ...s, rightMaximized: false, route: { ...s.route, section: n === '测井数据' ? 'wells' : n === '项目信息' ? undefined : n } })); api.navigate({ page: 'results', projectId: id, section: n === '测井数据' ? 'wells' : n === '项目信息' ? undefined : n }); };
    const openDialog = (d: Dialog) => { setDialog(d); setSelectorOpen(false); setMenuOpen(false); setFormError(''); if (d === 'local')
        setLocalFile(null); if (d === 'remote') {
        setRemoteSource('');
        setRemoteDirectory('');
        setRemoteQuery('');
        setDirectoryQuery('');
        setRemoteChosen([]);
    } };
    const saveInfo = (data: ResultInfo) => { const next = {...data, basin: project.basin}; setInfo(saveProjectInfo(id,next)); setState(s => ({ ...s, projects: [...s.projects.filter(p => p.id !== id), { ...project, name: next.name, basin: next.basin, year: next.year, area: next.area }] })); setDialog(null); setEditing(false); };
    const editSave = () => { if (!draft.name.trim()) {
        setFormError('请输入项目名称');
        return;
    } if (draft.start && draft.end && draft.start > draft.end) {
        setFormError('结束日期不能早于起始日期');
        return;
    }
    const badNumeric=[...numericFields].find(key=>draft[key]!==''&&draft[key]!==undefined&&(!Number.isFinite(Number(draft[key]))||Number(draft[key])<0||(integerFields.has(key)&&!Number.isInteger(Number(draft[key])))));
    if(badNumeric){setFormError('面积、数据大小和数量须为非负数，数量须为整数');return;}
    if(draft.year&&!/^\d{4}$/.test(draft.year)){setFormError('年度须为四位数字');return;}
    saveInfo({ ...draft, name: draft.name.trim() }); api.notify(t('项目信息已保存')); };
    const importFile = (file?: File) => { if (!file)
        return; if (!/\.xlsx?$/i.test(file.name)) {
        setFormError('请选择 Excel 文件（.xls 或 .xlsx）');
        return;
    } saveInfo(importProjectInformation(info)); api.notify(t('Excel 文件已选择，演示信息已自动回填')); };
    const directoryCounts = new Map<string, number>();
    fileRows.forEach(file => directoryCounts.set(file.directory, (directoryCounts.get(file.directory) || 0) + 1));
    const currentFiles = fileRows.filter(f => f.directory === directory);
    const setFiles = (next: ResultFile[]) => { setFileRows(saveDirectoryFiles(id,next)); };
    const addFiles = (files: ResultFile[]) => { setFiles(appendUploadedFiles(fileRows,files,directory)); setDialog(null); api.notify(t('文件已加入当前成果目录（本地演示）')); };
    const uploadLocal = () => { if (localFile)
        addFiles([{ id: '', name: localFile.name, format: localFile.name.split('.').at(-1) || '', size: bytesLabel(localFile.size), bytes:localFile.size, uploaded: '', user: '', directory }]); };
    const deleteFiles = () => { setFiles(removeFiles(fileRows,deleteIds)); setSelectedFiles(x => x.filter(id => !deleteIds.includes(id))); setDialog(null); api.notify(t('已删除所选文件')); };
    const rememberScroll = () => {
        if (!state.rightMaximized && infoRef.current)
            (state.informationMaximized ? maximizedScrollPositions : scrollPositions).current.info = infoRef.current.scrollTop;
        if (!state.informationMaximized && rightRef.current)
            (state.rightMaximized ? maximizedScrollPositions : scrollPositions).current.right = rightRef.current.scrollTop;
    };
    const maximize = () => {
        rememberScroll();
        setSelectorOpen(false);
        setState(s => ({ ...s, rightMaximized: !s.rightMaximized, informationMaximized: false }));
    };
    const toggleRight = () => {
        rememberScroll();
        if(state.informationMaximized){
            setState(s=>({...s,informationMaximized:false,rightMaximized:visibleLayoutBeforeHide.current}));
        }else{
            visibleLayoutBeforeHide.current=state.rightMaximized;
            setState(s=>({...s,informationMaximized:true,rightMaximized:false}));
        }
    };
    const nextLayout=state.informationMaximized?'显示成果视图':'隐藏成果视图';
    const translateTab=t;
    const tab = state.resultTab;
    const activeTabs = tabs.filter(t => !closedTabs.includes(t.id));
    const directoryPath = t(directories.find(g => g.items.includes(directory))?.name||'') + ' / ' + t(directory);
    const visibleRemote = remoteSource && remoteDirectory ? REMOTE_FILES.filter(f => f.name.toLowerCase().includes(remoteQuery.toLowerCase())) : [];
    return <div ref={columns.containerRef} style={columns.style} className={'results-layout layout-' + layoutMode + (columns.resizing ? ' is-resizing' : '')}>
        <div className={'results-toolbar' + (state.informationMaximized ? ' information-maximized' : state.rightMaximized ? ' right-maximized' : '')}>
            <div className="result-project-tools" style={{display: layoutMode === 'right' ? 'none' : undefined}}><div className="result-project-selector"><button className="project-trigger" title={project.name} aria-haspopup="listbox" aria-expanded={selectorOpen} onClick={() => setSelectorOpen(!selectorOpen)}><Search size={19}/><span>{project.name}</span><ChevronDown size={16}/></button>{selectorOpen && <div className="result-project-options"><label><Search size={17}/><input autoFocus aria-label={t("筛选项目")} value={projectQuery} onChange={e => setProjectQuery(e.target.value)} placeholder={t("搜索项目名称、盆地或年度…")}/></label><div role="listbox" aria-label={t("项目")}>{projectOptions(state).filter(p => [p.name, p.basin, p.year].join(' ').toLowerCase().includes(projectQuery.toLowerCase())).map(p => <button role="option" aria-selected={p.id === id} key={p.id} onClick={() => { setSelectorOpen(false); if (!canRead(p, state.role)) {
        api.deny();
        return;
    } setState(s => ({ ...s, currentProjectId: p.id, rightMaximized: false, informationMaximized: false })); api.navigate({ page: 'results', projectId: p.id }); }}><strong>{p.name}</strong><small><span className="project-type-label" style={{background:projectTypeColor(p)}}>{t(projectTypeLabel(p))}</span><span>{p.year}　{p.basin}</span><span>{p.area||'—'} km²</span></small></button>)}</div></div>}</div>{!state.rightMaximized && <button className="button primary result-upload-primary" onClick={() => api.notify(t('已选择上传成果入口'))}><Upload size={18}/>{t("上传成果")}</button>}</div>
            <div className="result-tabbar"><div className="result-tabs" style={{ display: state.informationMaximized ? 'none' : undefined }}>{activeTabs.map(t => <div className={'result-tab' + (tab === t.id ? ' active' : '')} key={t.id}><button onClick={() => setState(s => ({ ...s, resultTab: t.id }))}><t.Icon size={18}/>{['overview','gis'].includes(t.id)?translateTab(t.label):t.label}</button>{!['overview', 'gis'].includes(t.id) && <button className="tab-close" aria-label={translateTab('关闭{file}',{file:t.label})} onClick={() => { setClosedTabs(x => [...x, t.id]); if (tab === t.id)
        setState(s => ({ ...s, resultTab: 'overview' })); }}><X size={13}/></button>}</div>)}</div><div className="result-view-actions">{!state.informationMaximized&&<button className="icon-button" title={t(state.rightMaximized ? '还原' : '最大化当前右侧栏目')} aria-label={t(state.rightMaximized ? '还原' : '最大化当前右侧栏目')} onClick={maximize}>{state.rightMaximized?<Minimize size={19}/>:<Maximize size={19}/>}</button>}<button className="icon-button result-layout-toggle" title={t(nextLayout)} aria-label={t(nextLayout)} onClick={toggleRight}><SquareSplitHorizontal size={19}/>{state.informationMaximized && <span className="result-tab-count" aria-label={t('已打开{count}个页签',{count:activeTabs.length})}>{activeTabs.length}</span>}</button></div></div>
        </div><div className="results-body"><aside className="results-directory" style={{display: layoutMode === 'right' ? 'none' : undefined}}><h2>{t("成果目录")}</h2><nav aria-label={t("成果目录")}>{directories.map(g => { const collapse = collapsedGroups.includes(g.name), Icon = g.icon === 'map' ? MapIcon : g.icon === 'layers' ? Layers : g.icon === 'file' ? FileText : g.icon === 'well' ? ClipboardList : Folder; return <section key={g.name}><button className="directory-group" onClick={() => setCollapsedGroups(s => collapse ? s.filter(x => x !== g.name) : [...s, g.name])} aria-expanded={!collapse}>{collapse ? <ChevronRight size={13}/> : <ChevronDown size={13}/>}<Icon size={17}/><strong>{t(g.name)}</strong>{g.name!=='基本信息'&&<small>{g.items.filter(n=>getDirectoryStatus(n,fileRows,blank)==='ready').length}/{g.items.length}</small>}</button>{!collapse && g.items.map(n => {
                const hasData = g.name !== '基本信息';
                const count = directoryCounts.get(n) || 0;
                return <button className={'directory-leaf' + (directory === n ? ' active' : '')} key={n} onClick={() => selectDirectory(n)} aria-label={t(n)} aria-description={hasData ? t('{count} 条数据', {count}) : undefined}>
                    {hasData && <i className={'status-dot ' + getDirectoryStatus(n,fileRows,blank)}/>}
                    <span className="directory-leaf-label">{t(n)}</span>
                    {hasData && <small className={'directory-leaf-count' + (count === 0 ? ' empty' : '')} title={t('{count} 条数据', {count})}>{count}</small>}
                </button>;
            })}</section>; })}</nav><footer><span><i className="status-dot ready"/>{t('已录入')} {getResultSummary(directories,fileRows,blank).ready}</span><span><i className="status-dot pending"/>{t('未录入')} {getResultSummary(directories,fileRows,blank).pending}</span><span><i className="status-dot neutral"/>{t('无需录入')} {getResultSummary(directories,fileRows,blank).neutral}</span></footer></aside>
 <div className={'results-workspace' + (state.rightMaximized ? ' right-maximized' : state.informationMaximized ? ' information-maximized' : '')}>
     <section ref={infoRef} className={'results-information' + (directory === '项目信息' ? '' : ' directory-details')} style={{ display: state.rightMaximized ? 'none' : undefined }}>
         {directory === '项目信息' ? <Information info={editing?draft:info} editing={editing} onEdit={()=>{setDraft({...info});setEditing(true);setFormError('');}} onImport={()=>openDialog('import')} onChange={(key,value)=>setDraft(current=>({...current,[key]:value}))} onSave={editSave} onCancel={()=>{setEditing(false);setDraft({...info});setFormError('');}} error={editing?formError:''}/> : directory === '关联项目' ? <section className="results-related"><h1>{t("关联项目")}</h1><div className="empty-state"><Folder size={42}/><h3>{t("暂无关联项目")}</h3></div></section> : <section className="results-file-content"><header className="files-heading"><h1>{t(directory)}</h1><span className="badge">{currentFiles.length}{t('个文件')}</span>{selectedFiles.length > 0 && <span className="file-selection-count" aria-live="polite">{t('已选 {count} 个文件',{count:selectedFiles.length})}</span>}<div className="files-actions"><button className="button danger-primary" disabled={!selectedFiles.length} onClick={() => { setDeleteIds(selectedFiles); openDialog('delete'); }}>{t("删除")}</button><button className="button" onClick={() => setSelectedFiles([])}>{t("取消")}</button><div className="file-upload-dropdown"><button className="button" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Upload size={17}/>{t("上传文件")}<ChevronDown size={15}/></button>{menuOpen && <div className="file-upload-menu"><button onClick={() => openDialog('local')}><Upload size={17}/>{t("本地上传")}</button><button onClick={() => openDialog('remote')}><Folder size={17}/>{t("远程上传")}</button></div>}</div></div></header><ResultFileTable key={id+':'+directory} files={currentFiles} selected={selectedFiles} onSelect={setSelectedFiles} onView={file=>{setActiveFile(file);openDialog('file');}} onFields={file=>{setActiveFile(file);openDialog('fields');}} onDelete={file=>{setDeleteIds([file.id]);openDialog('delete');}} onUpload={()=>openDialog('local')}/></section>}
     </section>
     <section className="results-right"><div ref={rightRef} className="result-right-content">{tab === 'overview' ? <OverviewContent api={api} info={info} project={project} files={fileRows} directories={directories} onDirectory={selectDirectory}/> : tab === 'gis' ? <div className="result-gis"><MapView projects={[project]} selectedId={project.id} zoom={mapZoom} collapsed={dataPanelCollapsed} kind="data" onToggle={() => setDataPanelCollapsed(!dataPanelCollapsed)} onRefresh={() => setMapZoom(1)} onZoom={setMapZoom}/></div> : tab === 'las' ? <div className="result-document"><h2>B1-1.las</h2><h3>{t("测井数据")}</h3><pre>{'~Version Information\nVERS.  2.0\nWRAP.  NO\n\n~Well Information\nWELL.  B1-1\n\n~Curve Information\nDEPT.M\nGR.API\nRHOB.G/C3'}</pre></div> : <div className="result-document"><FileText size={42}/><h2>设计文档.doc</h2><p>{t('项目')}：{project.name}</p><p className="muted">{t("文档预览")}</p><section className="card"><h3>{t("项目基本信息")}</h3><InfoTable data={info} fields={infoLabels.slice(0, 7)}/></section></div>}</div></section>
 </div>
 </div>
 {layoutMode !== 'right' && <><div {...columns.separatorProps('directory')}/>{layoutMode === 'split' && <div {...columns.separatorProps('information')}/>}</>}
 {dialog === 'import' && <Modal title={t("导入项目信息")} onClose={() => setDialog(null)} footer={<button className="button" onClick={() => setDialog(null)}>{t("取消")}</button>}><p>{t("选择 Excel 文件，自动导入当前项目的基本信息。")}</p><label className="result-file-picker"><Import size={30}/><strong>{t("选择 Excel 文件")}</strong><input type="file" accept=".xls,.xlsx" aria-label={t("选择Excel文件")} onChange={e => importFile(e.target.files?.[0])}/></label><p className="muted">{t("文件选择后自动回填预设演示信息。")}</p>{formError && <p className="form-error" role="alert">{t(formError)}</p>}</Modal>}
 {dialog === 'local' && <Modal title={t("本地上传")} onClose={() => setDialog(null)} footer={<><button className="button" onClick={() => setDialog(null)}>{t("取消")}</button><button className="button primary" disabled={!localFile} onClick={uploadLocal}>{t("上传")}</button></>}><div className="upload-context"><p>{t("当前项目")}　<strong>{project.name}</strong></p><p>{t("成果目录")}　<strong>{directoryPath}</strong></p></div><label className="result-file-picker"><Upload size={30}/><strong>{t("选择本地文件上传至当前成果目录")}</strong><input type="file" aria-label={t("选择本地文件")} onChange={e => setLocalFile(e.target.files?.[0] || null)}/></label><h3>{t("待上传文件")}</h3><table className="upload-files"><thead><tr><th>{t("文件名")}</th><th>{t("大小")}</th><th>{t("状态")}</th></tr></thead><tbody>{localFile ? <tr><td>{localFile.name}</td><td>{bytesLabel(localFile.size)}</td><td>{t("待上传")}</td></tr> : <tr><td colSpan={3} className="muted">{t("尚未选择文件")}</td></tr>}</tbody></table></Modal>}
 {dialog === 'remote' && <Modal title={t("远程上传")} wide onClose={() => setDialog(null)} footer={<><button className="button" onClick={() => setDialog(null)}>{t("取消")}</button><button className="button primary" disabled={!remoteChosen.length} onClick={() => addFiles(REMOTE_FILES.filter(f => remoteChosen.includes(f.id)))}>{t("上传")}</button></>}><div className="upload-context"><p>{t("当前项目")}　<strong>{project.name}</strong></p><p>{t("成果目录")}　<strong>{directoryPath}</strong></p></div><div className="remote-source"><label className="field">{t("数据来源")}<select value={remoteSource} onChange={e => { setRemoteSource(e.target.value); setRemoteDirectory(''); setRemoteChosen([]); }}><option value="">{t("请选择远程挂载数据")}</option><option>57服务器-华北-解释项目</option><option>57服务器-处理中心-处理项目</option></select></label><button className="button" onClick={() => { setDialog(null); api.navigate({ page: 'baseline', section: 'disks' }); }}>{t("管理")}</button></div><div className="remote-panels"><section className="remote-directories"><header><h3>{t("目录")}</h3><small>{remoteSource ? 1 : 0} {t('个')}</small></header><input aria-label={t("搜索目录")} placeholder={t("搜索目录…")} value={directoryQuery} onChange={e => setDirectoryQuery(e.target.value)}/>{remoteSource && (!directoryQuery || ['测井数据',t('测井数据')].some(name=>name.toLowerCase().includes(directoryQuery.toLowerCase()))) ? <div className="remote-tree"><button onClick={() => setRemoteExpanded(!remoteExpanded)}>{remoteExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}<Folder size={17}/>{remoteSource.includes('华北') ? 'diyan_huabei' : 'chulizhongxin'}</button>{remoteExpanded && <button className={remoteDirectory ? 'active' : ''} onClick={() => { setRemoteDirectory('测井数据'); setRemoteChosen([]); }}><FolderOpen size={17}/>{t("测井数据")}</button>}</div> : <p className="remote-empty">{t("暂无目录")}</p>}</section><section className="remote-file-list"><header><h3>{t("文件列表")}</h3><small>{visibleRemote.length} {t('项')}</small><button className="icon-button" title={t("刷新文件列表")} aria-label={t("刷新文件列表")} onClick={() => api.notify(t('远程演示文件列表已刷新'))}><RefreshCw size={18}/></button></header><div className="remote-file-search"><input aria-label={t("搜索文件名")} placeholder={t("搜索文件名…")} value={remoteQuery} onChange={e => setRemoteQuery(e.target.value)}/><button className="button small" onClick={() => setRemoteChosen([])}>{t("取消选择")}</button></div><table className="upload-files"><thead><tr><th></th><th>{t("文件名")}</th><th>{t("大小")}</th><th>{t("修改时间")}</th></tr></thead><tbody>{visibleRemote.map(f => <tr key={f.id}><td><input type="checkbox" aria-label={t('选择远程{file}',{file:f.name})} checked={remoteChosen.includes(f.id)} onChange={e => setRemoteChosen(s => e.target.checked ? [...s, f.id] : s.filter(id => id !== f.id))}/></td><td>{f.name}</td><td>{f.size}</td><td>{f.uploaded}</td></tr>)}</tbody></table>{!visibleRemote.length && <p className="remote-empty">{t("暂无文件")}</p>}</section></div><section className="remote-selected"><header><h3>{t("已选文件")} <span>{remoteChosen.length}</span></h3><button className="link-button" onClick={() => setRemoteChosen([])}>{t("清空")}</button></header>{remoteChosen.length ? REMOTE_FILES.filter(f => remoteChosen.includes(f.id)).map(f => <span key={f.id}>{f.name}<button aria-label={t('取消{file}',{file:f.name})} onClick={() => setRemoteChosen(x => x.filter(id => id !== f.id))}><X size={14}/></button></span>) : <p className="muted">{t("尚未选择文件")}</p>}</section></Modal>}
 {dialog === 'delete' && <Modal title={t("删除文件")} onClose={() => setDialog(null)} footer={<><button className="button" onClick={() => setDialog(null)}>{t("取消")}</button><button className="button danger-primary" onClick={deleteFiles}>{t("确认删除")}</button></>}><p>{t('确定删除')}{deleteIds.length === 1 ? '“' + fileRows.find(f => f.id === deleteIds[0])?.name + '”' : deleteIds.length + ' '+t('个文件')}{t('吗？')}</p></Modal>}
 {(dialog === 'file' || dialog === 'fields') && activeFile && <Modal title={t(dialog === 'file' ? '查看文件' : '扩展字段')} onClose={() => setDialog(null)} footer={<button className="button" onClick={() => setDialog(null)}>{t("关闭")}</button>}><InfoTable data={{ name: activeFile.name, format: activeFile.format, size: activeFile.size, date: activeFile.uploaded, user: activeFile.user }} fields={[['name', '文件名'], ['format', '格式'], ['size', '大小'], ['date', '上传时间'], ['user', '上传人']]}/>{dialog === 'fields' && <div className="empty-state result-extra-fields"><p>{t("暂无扩展字段")}</p></div>}{dialog === 'file' && <p className="muted">{t("文件内容未连接远程服务。")}</p>}</Modal>}
 </div>;
}
