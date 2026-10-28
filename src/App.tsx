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
import { resolveResultsEntry } from './services/resultsNavigation';
import type { AppState,Route,Page,Project,AppApi } from './types';
const STORE='geobank-demo-ui-v1';
const AUTH='geobank-demo-authenticated-v1';
const HISTORY_POSITION='geobank-route-position';
function routePosition(){const value=window.history.state?.[HISTORY_POSITION];return typeof value==='number'?value:null}
function markRoutePosition(position:number){window.history.replaceState({...window.history.state,[HISTORY_POSITION]:position},'',window.location.href)}
const PAGES:Page[]=['overview','results','search','approval','baseline','admin','login','statistics'];
export function parseRoute(hash=window.location.hash):Route{let parts:string[];try{parts=hash.replace(/^#\/?/,'').split('/').map(decodeURIComponent)}catch{return {page:'overview'}}const [page,section,resultSection]=parts;if(!PAGES.includes(page as Page))return {page:'overview'};return page==='results'?{page:'results',projectId:section||undefined,section:resultSection||undefined}:{page:page as Page,section:section||undefined}}
function hashRoute(route:Route){return '#/'+route.page+(route.page==='results'?(route.projectId?'/'+encodeURIComponent(route.projectId)+(route.section?'/'+encodeURIComponent(route.section):''):''):route.section?'/'+encodeURIComponent(route.section):'')}
function restore(){const explicit=new URLSearchParams(window.location.search).get('role');const role=explicit==='ordinary'?'ordinary':'admin';let base=initialState(role);try{const saved=JSON.parse(sessionStorage.getItem(STORE)||'null');if(saved?.version===1){base={...base,...saved.state,role:explicit?role:saved.state.role};if(!Array.isArray(base.projects))base.projects=initialState(role).projects}}catch{/* Invalid local UI state returns to demo defaults. */}base.panelCollapsed=true;base.route=parseRoute();return base}
export default function App(){return <LanguageProvider><AppContent/></LanguageProvider>}
function AppContent(){
 const {t}=useTranslation();
 const [state,setState]=useState<AppState>(restore),[denied,setDenied]=useState(false),[toast,setToast]=useState(''),[loggedOut,setLoggedOut]=useState(()=>sessionStorage.getItem(AUTH)!=='true'||sessionStorage.getItem('geobank-demo-logged-out')==='true');
 const [resultsPreview,setResultsPreview]=useState(false);
 const stateRef=useRef(state),returnRef=useRef<AppState|null>(null),adminReturn=useRef<Route|null>((()=>{try{return JSON.parse(sessionStorage.getItem('geobank-admin-return')||'null')}catch{return null}})()),toastTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const navigationGuard=useRef<((proceed:()=>void)=>void)|null>(null);
 const historyPosition=useRef(routePosition()??0);
 const restoringTraversal=useRef<{from:number;to:number;route:Route}|null>(null);
 const approvedTraversal=useRef<{position:number;route:Route}|null>(null);
 stateRef.current=state;
 const notify=useCallback((text:string)=>{setToast(text);if(toastTimer.current)clearTimeout(toastTimer.current);toastTimer.current=setTimeout(()=>setToast(''),1800)},[]);
 const deny=useCallback(()=>setDenied(true),[]);
 const registerNavigationGuard=useCallback((guard:(proceed:()=>void)=>void)=>{
  navigationGuard.current=guard;
  return ()=>{if(navigationGuard.current===guard)navigationGuard.current=null};
 },[]);
 const needsNavigationGuard=useCallback((route?:Route)=>{
  const s=stateRef.current;
  const sameRoute=route&&hashRoute(route)===hashRoute(s.route);
  const sameProject=route?.page==='results'&&s.route.page==='results'&&(route.projectId||s.currentProjectId)===s.currentProjectId;
  return !!navigationGuard.current&&!sameRoute&&!sameProject;
 },[]);
 const requestNavigation=useCallback((proceed:()=>void,route?:Route)=>{
  if(needsNavigationGuard(route))navigationGuard.current?.(proceed);else proceed();
 },[needsNavigationGuard]);
 const commitRoute=useCallback((route:Route,replaceHash=false)=>{
  const s=stateRef.current;
  if(route.page==='admin'&&s.route.page!=='admin'){adminReturn.current={...s.route};sessionStorage.setItem('geobank-admin-return',JSON.stringify(s.route))}
  stateRef.current={...s,route,currentProjectId:route.projectId||s.currentProjectId};
  setState(v=>({...v,route,currentProjectId:route.projectId||v.currentProjectId}));
  if(window.location.hash!==hashRoute(route)){
   if(replaceHash)window.history.replaceState(window.history.state,'',hashRoute(route));
   else{window.location.hash=hashRoute(route);historyPosition.current+=1;markRoutePosition(historyPosition.current)}
  }
 },[]);
 const navigate=useCallback((requested:Route)=>{
  const s=stateRef.current;if(loggedOut&&requested.page!=='login')return;
  const route=resolveResultsEntry(s,requested);
  if(!route){deny();return}
  setResultsPreview(false);
  requestNavigation(()=>commitRoute(route),route);
 },[commitRoute,deny,loggedOut,requestNavigation]);
 const openProject=useCallback((p:Project)=>{if(!canRead(p,stateRef.current.role)){deny();return}navigate({page:'results',projectId:p.id})},[deny,navigate]);
 useEffect(()=>{
  if(routePosition()===null)markRoutePosition(historyPosition.current);
  const onHashChange=()=>{
   let route=parseRoute();const s=stateRef.current;
   if(loggedOut){if(route.page!=='login')window.history.replaceState(null,'','#/login');return}
   const resolved=resolveResultsEntry(s,route);
   if(!resolved){deny();route={page:'overview'}}else route=resolved;
   setResultsPreview(false);
   const position=routePosition();
   const restoring=restoringTraversal.current;
   if(restoring&&position===restoring.from){
    restoringTraversal.current=null;
    requestNavigation(()=>{
     approvedTraversal.current={position:restoring.to,route:restoring.route};
     window.history.go(restoring.to-restoring.from);
    },restoring.route);
    return;
   }
   const approved=approvedTraversal.current;
   if(approved&&position===approved.position){
    approvedTraversal.current=null;
    historyPosition.current=position;
    commitRoute(approved.route,true);
    return;
   }
   // Restore a traversed entry by moving through history, not replacing its URL:
   // cancelling must leave the same Back/Forward destination available next time.
   if(needsNavigationGuard(route)&&position!==null&&position!==historyPosition.current){
    restoringTraversal.current={from:historyPosition.current,to:position,route};
    window.history.go(historyPosition.current-position);
    return;
   }
   if(needsNavigationGuard(route))window.history.replaceState(window.history.state,'',hashRoute(s.route));
   else if(position!==null)historyPosition.current=position;
   requestNavigation(()=>commitRoute(route,true),route);
  };
  window.addEventListener('hashchange',onHashChange);onHashChange();
  return()=>window.removeEventListener('hashchange',onHashChange);
 },[commitRoute,deny,loggedOut,needsNavigationGuard,requestNavigation]);
 useEffect(()=>{sessionStorage.setItem(STORE,JSON.stringify({version:1,state}));if(state.selectedProjectId){const p=resolveProject(state,state.selectedProjectId);if(p&&!isVisible(p,state.role))setState(s=>({...s,selectedProjectId:null,mapZoom:1}))}},[state]);
 const logout=useCallback(()=>{setResultsPreview(false);requestNavigation(()=>{returnRef.current=structuredClone(stateRef.current);sessionStorage.setItem('geobank-demo-return',JSON.stringify(returnRef.current));sessionStorage.setItem('geobank-demo-logged-out','true');sessionStorage.removeItem(AUTH);setLoggedOut(true);setDenied(false);window.history.replaceState(null,'','#/login')})},[requestNavigation]);
 const login=()=>{let previous=returnRef.current;try{if(!previous)previous=JSON.parse(sessionStorage.getItem('geobank-demo-return')||'null')}catch{/* Use current local state if return data is unavailable. */}const restored=previous||initialState(state.role);setState(restored);sessionStorage.removeItem('geobank-demo-return');sessionStorage.removeItem('geobank-demo-logged-out');sessionStorage.setItem(AUTH,'true');setLoggedOut(false);window.history.replaceState(null,'',hashRoute(restored.route.page==='login'?{page:'overview'}:restored.route));notify('演示登录成功')};
 const api:AppApi={state,setState,navigate,notify,deny,openProject,registerNavigationGuard};
 if(loggedOut||state.route.page==='login')return <LoginPage onLogin={login}/>;
 const content=state.route.page==='overview'?<OverviewPage api={api}/>:state.route.page==='results'?<ResultsPage api={api} previewNoAccess={import.meta.env.DEV&&resultsPreview}/>:state.route.page==='search'?<SearchPage api={api}/>:state.route.page==='approval'?<ApprovalPage api={api}/>:state.route.page==='baseline'?<BaselinePage api={api}/>:state.route.page==='admin'?<main className="management-page"><h1>{t("系统管理")}</h1><p>{t("账户信息")}</p><section className="card management-card"><div className="management-avatar">D<span/></div><div><small>{t("当前账户")}</small><h2>Demo</h2></div><button className="button primary" onClick={()=>navigate(adminReturn.current||{page:'overview'})}>{t("返回项目")}</button></section></main>:<main className="blank-page" aria-label={t("统计画板")}/>;
 return <><Header api={api} onLogout={logout} resultsPreview={import.meta.env.DEV&&state.route.page==='results'?{active:resultsPreview,onToggle:()=>setResultsPreview(value=>!value)}:undefined}/>{content}{denied&&<Modal title={t("无浏览权限")} onClose={()=>setDenied(false)} footer={<button className="button primary" onClick={()=>setDenied(false)}>{t("关闭")}</button>}><p className="permission-message">{t("您无浏览此项目数据的权限")}</p></Modal>}{toast&&<div className="toast" role="status">{t(toast)}</div>}</>
}
