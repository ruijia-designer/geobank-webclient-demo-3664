import type { Project } from '../types';
export interface ResultInfo {
    name: string;
    basin: string;
    areaName: string;
    depression: string;
    concavity: string;
    location: string;
    area: string;
    client: string;
    contractor: string;
    start: string;
    end: string;
    year: string;
    note: string;
    seismicName:string; seismicDomain:string; seismicDimension:string; seismicSize:string; seismicSample:string;
    iline:string; xline:string; xloc:string; istep:string; xstep:string; yloc:string;
    normalFault:string; reverseFault:string; strikeSlip:string; buriedHill:string; channel:string;
    cave:string; slope:string; saltDome:string; intrusive:string; unconformity:string;
    layerCount:string; faultCount:string; wellCount:string; curveCount:string; hasTimeDepth:string;
    [key: string]: string;
}
export interface ResultFile {
    id: string;
    name: string;
    format: string;
    size: string;
    bytes?: number;
    uploaded: string;
    user: string;
    directory: string;
}
export const RESULT_DIRECTORIES = [{ name: '基本信息', icon: 'info', items: ['项目信息', '关联项目'] }, { name: '井筒数据', count: '4/8', icon: 'well', items: ['井位坐标、轨迹', '测井数据', '时深关系', '地质分层', '测井岩性和油气水解释结论', '岩芯', '测井沉积微相解释结论', '试油成果'] }, { name: '处理数据', count: '0/2', icon: 'data', items: ['偏移叠加纯波数据', '偏移叠加成果数据'] }, { name: '解释成果', icon: 'layers', items: ['层位', '断层', '断层多边形', '地质体', '地震相', '地震属性'] }, { name: '反演与建模', count: '0/2', icon: 'data', items: ['叠后反演结果', '全套速度场'] }, { name: '综合成图', count: '1/4', icon: 'map', items: ['地层厚度图', '时间构造图', '深度构造图', '其它成图'] }, { name: '项目文档', count: '0/2', icon: 'file', items: ['项目设计文档', '项目成果文档'] }];
const note = '精细标定、对比追踪 T5、T6、T8、Tg、Tg3、Tg4-1、TgAr等各层反射层，对该地区进行了构造研究；落实研究区3#、15#煤层厚度变化规律，结合构造、断裂、煤层厚度和含气量等综合评价煤层有利区。';
export function initialResultInfo(p: Project): ResultInfo {
    const empty = p.id.startsWith('created-');
    return { name: p.name, basin: p.basin, areaName: '', depression: '', concavity: '', location: empty ? '' : p.id === 'current' ? '太岳山东侧' : '', area: p.area, client: '', contractor: '', start: empty ? '' : '2024-05-30', end: empty ? '' : '2024-11-15', year: p.year, note: empty ? '' : note,
        seismicName:'', seismicDomain:'', seismicDimension:'', seismicSize:empty?'':'3.65', seismicSample:'',
        iline:empty?'':'189', xline:empty?'':'21', xloc:empty?'':'181', istep:empty?'':'1', xstep:empty?'':'1', yloc:empty?'':'185',
        normalFault:empty?'':'有', reverseFault:empty?'':'有', strikeSlip:empty?'':'无', buriedHill:empty?'':'无', channel:empty?'':'有', cave:empty?'':'无', slope:empty?'':'有', saltDome:empty?'':'无', intrusive:empty?'':'无', unconformity:empty?'':'有',
        layerCount:empty?'':'9', faultCount:empty?'':'135', wellCount:empty?'':'18', curveCount:empty?'':'18', hasTimeDepth:empty?'':'有' };
}
const names = ['An18', 'An19', 'An22', 'An24', 'An26', 'An28', 'An29', 'An30', 'An31', 'An53X', 'An61X', 'An62X', 'An65X', 'An66X', 'An70X', 'An72X', 'Q7-6', 'Q8-9'];
const sizes = ['681.86', '560.60', '750.95', '555.46', '578.29', '758.51', '628.90', '579.84', '756.82', '504.92', '521.16', '452.82', '651.74', '422.93', '446.14', '736.05', '292.67', '768.85'];
export const WELL_FILES: ResultFile[] = names.map((n, i) => ({ id: 'well-' + i, name: n + '.las', format: 'las', size: sizes[i] + ' KB', uploaded: '2026-09-29 09:52:' + String(35 + Math.floor(i / 6)), user: '超级管理员', directory: '测井数据' }));
export const REMOTE_FILES = WELL_FILES.slice(0, 3).map(r => ({ ...r, id: 'remote-' + r.id }));
export const resultInfoCache: Record<string, ResultInfo> = {};
export const resultFilesCache: Record<string, ResultFile[]> = {};
export function saveProjectInfo(id:string,info:ResultInfo){resultInfoCache[id]={...info};return resultInfoCache[id]}
export function saveDirectoryFiles(id:string,files:ResultFile[]){resultFilesCache[id]=files.map(f=>({...f}));return resultFilesCache[id]}
export function importProjectInformation(info:ResultInfo){return {...info,basin:'沁水盆地',location:'太岳山东侧',area:'96.8',start:'2024-05-30',end:'2024-11-15',year:'2024'}}
export function appendUploadedFiles(current:ResultFile[],files:ResultFile[],directory:string){return [...current,...files.map((f,i)=>({...f,id:'uploaded-'+Date.now()+'-'+i,directory,uploaded:new Date().toLocaleString('sv-SE'),user:'Demo'}))]}
export function removeFiles(files:ResultFile[],ids:string[]){return files.filter(f=>!ids.includes(f.id))}
export function bytesLabel(n: number) {
    const bytes = Number.isFinite(n) ? Math.max(0,n) : 0;
    if(bytes < 1024) return Math.round(bytes)+' B';
    const units=['KB','MB','GB','TB'];let amount=bytes/1024,index=0;
    while(amount>=1024 && index<units.length-1){amount/=1024;index++;}
    return amount.toFixed(2)+' '+units[index];
}
export function parseFileBytes(size:string){
    const match=size.trim().match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/i);
    if(!match)return 0;
    const number=Number(match[1]);return Number.isFinite(number)?Math.round(number*1024**['B','KB','MB','GB','TB'].indexOf(match[2].toUpperCase())):0;
}
export function resultFileBytes(file:ResultFile){return typeof file.bytes==='number'&&Number.isFinite(file.bytes)&&file.bytes>=0?file.bytes:parseFileBytes(file.size);}
export const RECENT_UPLOAD_FILES:ResultFile[] = [
    ['安13北-验收附图册.ppt','52.31 MB','项目成果文档'],['安13北_验收文字报告.pdf','33.49 MB','项目成果文档'],['QinShui_A13N_DSM_Tg.GDB','1.98 MB','地层厚度图'],['QinShui_A13N_DSM_T8.GDB','2.04 MB','地层厚度图'],
].map(([name,size,directory],i)=>({id:'recent-demo-'+i,name,size,directory,format:name.split('.').at(-1)||'',uploaded:'2026-09-29 09:52:45',user:'超级管理员'}));
export const INITIAL_RESULT_FILES=[...WELL_FILES,...RECENT_UPLOAD_FILES];
export type ResultDirectory = typeof RESULT_DIRECTORIES[number];
/** Older samples have no category id: keep their established complete demo catalogue. */
export function getResultDirectories(project:Project):ResultDirectory[]{
    const typed=project as Project & {typeId?:string;typePath?:string[]|string};
    if(!typed.typeId&&!typed.typePath)return RESULT_DIRECTORIES;
    const identity=[project.type,typed.typeId,...(Array.isArray(typed.typePath)?typed.typePath:[typed.typePath||''])].join(' ');
    const common=['基本信息','综合成图','项目文档'];
    const names=/解释|interpret/i.test(identity)?[...common,'井筒数据','解释成果','反演与建模']:/处理|process/i.test(identity)?[...common,'处理数据','反演与建模']:/井筒|well/i.test(identity)?[...common,'井筒数据']:common;
    // Land/marine acquisition have no separate supplied business catalogue; use the existing common subset.
    return RESULT_DIRECTORIES.filter(group=>names.includes(group.name));
}
export type DirectoryStatus='ready'|'pending'|'neutral';
const readyExamples=new Set(['时深关系','地质分层','地层厚度图']);
const requiredDirectories=new Set(['井位坐标、轨迹','测井数据','时深关系','地质分层','偏移叠加纯波数据','偏移叠加成果数据','叠后反演结果','全套速度场','地层厚度图','时间构造图','深度构造图','其它成图','项目设计文档','项目成果文档']);
export function getDirectoryStatus(directory:string,files:ResultFile[],blank=false):DirectoryStatus{
    if(files.some(file=>file.directory===directory))return 'ready';
    if(!blank&&readyExamples.has(directory))return 'ready';
    return requiredDirectories.has(directory)?'pending':'neutral';
}
export function getResultSummary(directories:ResultDirectory[],files:ResultFile[],blank=false){
    const entries=directories.filter(group=>group.name!=='基本信息').flatMap(group=>group.items.map(name=>{
        const directoryFiles=files.filter(file=>file.directory===name);
        return {name,group:group.name,status:getDirectoryStatus(name,files,blank),count:directoryFiles.length,totalBytes:directoryFiles.reduce((sum,file)=>sum+resultFileBytes(file),0),note:''};
    }));
    const visibleFiles=files.filter(file=>entries.some(entry=>entry.name===file.directory));
    const ready=entries.filter(entry=>entry.status==='ready').length,pending=entries.filter(entry=>entry.status==='pending').length,neutral=entries.length-ready-pending;
    return {entries,files:visibleFiles,ready,pending,neutral,percent:ready+pending?Math.round(ready/(ready+pending)*100):0,totalBytes:visibleFiles.reduce((sum,file)=>sum+resultFileBytes(file),0)};
}
export interface ResultDownload {id:string;fileName:string;user:string;time:string;bytes:number}
export const resultDownloadsCache:Record<string,ResultDownload[]>={};
export function getDownloadSummary(projectId:string){
    const records=resultDownloadsCache[projectId]||[];
    return {records,count:records.length,totalBytes:records.reduce((sum,record)=>sum+record.bytes,0),users:new Set(records.map(record=>record.user)).size};
}
