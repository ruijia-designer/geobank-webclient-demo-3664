import { useCallback,useEffect,useRef,useState } from 'react';
import { Header } from './components/Header';
import { Modal } from './components/Modal';
import OverviewPage from './pages/OverviewPage';
import ResultsPage from './pages/ResultsPage';
import SearchPage from './pages/SearchPage';
import ApprovalPage from './pages/ApprovalPage';
import BaselinePage from './pages/BaselinePage';
import LoginPage from './pages/LoginPage';
import { LanguageProvider, useTranslation } from './i18n';
import { initialState,canRead,resolveProject,isVisible } from './services/demo';
import type { AppState,Route,Page,Project,AppApi } from './types';
const STORE='geobank-demo-ui-v1';
const AUTH='geobank-demo-authenticated-v1';
const PAGES:Page[]=['overview','results','search','approval','baseline','admin','login','statistics'];
export function parseRoute(hash=window.location.hash):Route{let parts:string[];try{parts=hash.replace(/^#\/?/,'').split('/').map(decodeURIComponent)}catch{return {page:'overview'}}const [page,section,resultSection]=parts;if(!PAGES.includes(page as Page))return {page:'overview'};return page==='results'?{page:'results',projectId:section||undefined,section:resultSection||undefined}:{page:page as Page,section:section||undefined}}
function hashRoute(route:Route){return '#/'+route.page+(route.page==='results'?'/'+encodeURIComponent(route.projectId||'current')+(route.section?'/'+encodeURIComponent(route.section):''):route.section?'/'+encodeURIComponent(route.section):'')}
function restore(){const explicit=new URLSearchParams(window.location.search).get('role');const role=explicit==='ordinary'?'ordinary':'admin';let base=initialState(role);try{const saved=JSON.parse(sessionStorage.getItem(STORE)||'null');if(saved?.version===1){base={...base,...saved.state,role:explicit?role:saved.state.role};if(!Array.isArray(base.projects))base.projects=initialState(role).projects}}catch{/* Invalid local UI state returns to demo defaults. */}base.route=parseRoute();return base}
export default function App(){return <LanguageProvider><AppContent/></LanguageProvider>}
function AppContent(){
 const {t}=useTranslation();
 const [state,setState]=useState<AppState>(restore),[denied,setDenied]=useState(false),[toast,setToast]=useState(''),[loggedOut,setLoggedOut]=useState(()=>sessionStorage.getItem(AUTH)!=='true'||sessionStorage.getItem('geobank-demo-logged-out')==='true');
 const stateRef=useRef(state),returnRef=useRef<AppState|null>(null),adminReturn=useRef<Route|null>((()=>{try{return JSON.parse(sessionStorage.getItem('geobank-admin-return')||'null')}catch{return null}})()),toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 stateRef.current=state;
 const notify=useCallback((text:string)=>{setToast(text);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),1800)},[]);
 const deny=useCallback(()=>setDenied(true),[]);
 const navigate=useCallback((requested:Route)=>{
  const s=stateRef.current;if(loggedOut&&requested.page!=='login')return;
  const route:Route=requested.page==='results'?{...requested,projectId:requested.projectId||s.currentProjectId}:requested;
  if(route.page==='results'){const p=resolveProject(s,route.projectId||s.currentProjectId);if(!p||!canRead(p,s.role)){deny();return}}
  if(route.page==='admin'&&s.route.page!=='admin'){adminReturn.current={...s.route};sessionStorage.setItem('geobank-admin-return',JSON.stringify(s.route))}
  setState(v=>({...v,route,currentProjectId:route.projectId||v.currentProjectId}));if(window.location.hash!==hashRoute(route))window.location.hash=hashRoute(route);
 },[deny,loggedOut]);
 const openProject=useCallback((p:Project)=>{if(!canRead(p,stateRef.current.role)){deny();return}navigate({page:'results',projectId:p.id})},[deny,navigate]);
 useEffect(()=>{const guard=()=>{const route=parseRoute();const s=stateRef.current;if(loggedOut){if(route.page!=='login')window.history.replaceState(null,'','#/login');return}if(route.page==='results'){const p=resolveProject(s,route.projectId||s.currentProjectId);if(!p||!canRead(p,s.role)){setDenied(true);window.history.replaceState(null,'','#/overview');setState(v=>({...v,route:{page:'overview'}}));return}}setState(v=>({...v,route,currentProjectId:route.projectId||v.currentProjectId}))};window.addEventListener('hashchange',guard);guard();return()=>window.removeEventListener('hashchange',guard)},[loggedOut]);
 useEffect(()=>{sessionStorage.setItem(STORE,JSON.stringify({version:1,state}));if(state.selectedProjectId){const p=resolveProject(state,state.selectedProjectId);if(p&&!isVisible(p,state.role))setState(s=>({...s,selectedProjectId:null,mapZoom:1}))}},[state]);
 const logout=useCallback(()=>{returnRef.current=structuredClone(stateRef.current);sessionStorage.setItem('geobank-demo-return',JSON.stringify(returnRef.current));sessionStorage.setItem('geobank-demo-logged-out','true');sessionStorage.removeItem(AUTH);setLoggedOut(true);setDenied(false);window.history.replaceState(null,'','#/login')},[]);
 const login=()=>{let previous=returnRef.current;try{if(!previous)previous=JSON.parse(sessionStorage.getItem('geobank-demo-return')||'null')}catch{/* Use current local state if return data is unavailable. */}const restored=previous||initialState(state.role);setState(restored);sessionStorage.removeItem('geobank-demo-return');sessionStorage.removeItem('geobank-demo-logged-out');sessionStorage.setItem(AUTH,'true');setLoggedOut(false);window.history.replaceState(null,'',hashRoute(restored.route.page==='login'?{page:'overview'}:restored.route));notify('演示登录成功')};
 const api:AppApi={state,setState,navigate,notify,deny,openProject};
 if(loggedOut||state.route.page==='login')return <LoginPage onLogin={login}/>;
 const content=state.route.page==='overview'?<OverviewPage api={api}/>:state.route.page==='results'?<ResultsPage api={api}/>:state.route.page==='search'?<SearchPage api={api}/>:state.route.page==='approval'?<ApprovalPage api={api}/>:state.route.page==='baseline'?<BaselinePage api={api}/>:state.route.page==='admin'?<main className="management-page"><h1>{t("系统管理")}</h1><p>{t("账户信息")}</p><section className="card management-card"><div className="management-avatar">D<span/></div><div><small>{t("当前账户")}</small><h2>Demo</h2></div><button className="button primary" onClick={()=>navigate(adminReturn.current||{page:'overview'})}>{t("返回项目")}</button></section></main>:<main className="blank-page" aria-label={t("统计画板")}/>;
 return <><Header api={api} onLogout={logout}/>{content}{denied&&<Modal title={t("无浏览权限")} onClose={()=>setDenied(false)} footer={<button className="button primary" onClick={()=>setDenied(false)}>{t("关闭")}</button>}><p className="permission-message">{t("您无浏览此项目数据的权限")}</p></Modal>}{toast&&<div className="toast" role="status">{t(toast)}</div>}</>
}
