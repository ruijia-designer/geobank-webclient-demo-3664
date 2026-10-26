import projectData from '../data/projects.json';
import searchData from '../data/search.json';
import ref from '../data/reference-data.json';
import type { Project,Role,AppState,SearchRecord,SearchState } from '../types';
export const PROJECTS=projectData as Project[];
export const CURRENT_PROJECT:Project={id:'current',name:ref.projects[0].name,year:'2024',basin:'沁水盆地',type:'解释项目',area:'96.8',point:[1280,600],readable:true,archived:false};
export const SEARCH_RECORDS=searchData as SearchRecord[];
export const INITIAL_SEARCH:SearchState={field:'all',query:'',draft:'',filters:{},ai:true,summaryCollapsed:false,sort:'relevance'};
export const APPROVAL_RECORDS=ref.approvalRecords;
export const APPROVAL_TYPES=ref.approvalTypes;
export function isVisible(project:{archived:boolean},role:Role){return role==='admin'||project.archived}
export function canRead(project:Project,role:Role){return isVisible(project,role)&&project.readable}
export function visibleProjects(projects:Project[],role:Role){return projects.filter(p=>isVisible(p,role))}
export function projectOptions(state:AppState){return visibleProjects([...new Map([CURRENT_PROJECT,...state.projects].map(p=>[p.id,p])).values()],state.role)}
export function resolveProject(state:AppState,id=state.currentProjectId){return state.projects.find(p=>p.id===id)||(id==='current'?CURRENT_PROJECT:undefined)}
export function querySearch(search:SearchState,role:Role):SearchRecord[]{
 const q=search.query.trim().toLowerCase();
 const rows=SEARCH_RECORDS.filter(r=>{const hay=search.field==='all'?[r.name,r.basin,r.areaName,r.type,r.year].join(' '):search.field==='basin'?r.basin+' '+r.areaName:r[search.field as keyof SearchRecord];return isVisible(r,role)&&(!q||String(hay).toLowerCase().includes(q))&&Object.entries(search.filters).every(([k,v])=>!v.length||v.includes(String(r[k as keyof SearchRecord])))});
 return search.sort==='year'?rows.sort((a,b)=>b.year.localeCompare(a.year)):rows;
}
export function facets(rows:SearchRecord[],key:keyof SearchRecord){const counts=new Map<string,number>();rows.forEach(r=>{const value=String(r[key]);counts.set(value,(counts.get(value)||0)+1)});return [...counts].sort(([a],[b])=>a.localeCompare(b,'zh-CN'))}
export function searchFacets(search:SearchState,role:Role,key:keyof SearchRecord){
 const rows=querySearch({...search,filters:{...search.filters,[key]:[]}},role);
 const counts=new Map(facets(rows,key));
 // Keep selected values available for removal even when other conditions exclude them.
 for(const value of search.filters[key]||[])if(!counts.has(value))counts.set(value,0);
 return [...counts].sort(([a],[b])=>a.localeCompare(b,'zh-CN'));
}
export function toggleValue(values:string[],value:string){return values.includes(value)?values.filter(v=>v!==value):[...values,value]}
export function authenticateDemo(username:string,password:string){return username.trim()==='Demo'&&password==='demo123'}
export function createProject(name:string,type:string,classification:Pick<Partial<Project>,'basin'|'typeId'|'typePath'>={}):Project{return {id:'created-'+Date.now(),name:name.trim(),year:'',basin:'',type,area:'',point:[1128,413],readable:true,archived:false,...classification}}
export function initialState(role:Role):AppState{return {role,route:{page:'overview'},currentProjectId:role==='admin'?'current':'2',projects:[...PROJECTS],search:{...INITIAL_SEARCH,filters:{}},approval:{query:'',draft:'',type:'all',status:'all',read:'all',time:'all'},rightMaximized:false,informationMaximized:false,resultTab:'overview',panelCollapsed:true,colorMode:'type',overviewQuery:'',overviewFilters:{},selectedProjectId:null,mapZoom:1}}
