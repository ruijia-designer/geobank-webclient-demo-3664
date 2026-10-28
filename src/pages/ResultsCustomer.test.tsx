import {useState} from 'react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultsPage from './ResultsPage';
import {LanguageProvider,useTranslation} from '../i18n';
import {CURRENT_PROJECT,PROJECTS,initialState} from '../services/demo';
import type {AppApi,AppState,Project,Route} from '../types';
import {bytesLabel,getDownloadSummary,getResultDirectories,getResultSummary,INITIAL_RESULT_FILES,parseFileBytes,resultDownloadsCache,resultFilesCache,resultInfoCache} from '../services/results';
let lastApi:AppApi;
const notify=vi.fn();
function Harness({section,projectId='current'}:{section?:string;projectId?:string}){
 const [state,setState]=useState<AppState>(()=>({...initialState('admin'),route:{page:'results',section},currentProjectId:projectId}));
 const navigate=(route:Route)=>setState(previous=>({...previous,route,currentProjectId:route.projectId||previous.currentProjectId}));
 const api:AppApi={state,setState,navigate,notify,deny:vi.fn(),openProject:vi.fn()};lastApi=api;
 return <ResultsPage api={api}/>;
}
beforeEach(()=>{sessionStorage.removeItem('geobank-demo-locale');vi.clearAllMocks();[resultFilesCache,resultInfoCache,resultDownloadsCache].forEach(cache=>Object.keys(cache).forEach(key=>delete cache[key]));vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callback(0);return 1;});});
describe('成果页本轮客户流程',()=>{
 it('目录叶子隐藏零数量标签，保留非零数量、状态点和分组完成率',()=>{
  render(<Harness/>);
  const directory=within(screen.getByRole('navigation',{name:'成果目录'}));
  for(const name of ['井位坐标、轨迹','时深关系','岩芯','偏移叠加纯波数据','层位']){
   const leaf=directory.getByRole('button',{name});
   expect(leaf.querySelector('.directory-leaf-count')).not.toBeInTheDocument();
   expect(leaf.querySelector('.status-dot')).toBeInTheDocument();
  }
  expect(directory.getByRole('button',{name:'测井数据'}).querySelector('.directory-leaf-count')).toHaveTextContent('18');
  expect(directory.getByRole('button',{name:'处理数据0/2'})).toBeVisible();
 });
 it('盆地以只读输入展示，其他下拉可编辑，保存和导入均保留原盆地',async()=>{
  const project=PROJECTS.find(project=>project.basin==='四川盆地')!;
  const user=userEvent.setup();render(<Harness projectId={project.id}/>);
  await user.click(screen.getByRole('button',{name:'编辑'}));
  const basin=screen.getByRole('textbox',{name:'所属盆地'});
  expect(basin).toHaveAttribute('readonly');expect(basin).toHaveValue(project.basin);
  expect(screen.queryByRole('combobox',{name:'所属盆地'})).not.toBeInTheDocument();
  await user.type(basin,'不允许修改');expect(basin).toHaveValue(project.basin);
  await user.selectOptions(screen.getByRole('combobox',{name:'所属工区'}),'大安区块');
  await user.click(screen.getByRole('button',{name:'保存'}));
  expect(resultInfoCache[project.id]).toMatchObject({basin:project.basin,areaName:'大安区块'});
  await user.click(screen.getByRole('button',{name:'导入'}));
  await user.upload(screen.getByLabelText('选择Excel文件'),new File(['demo'],'demo.xlsx'));
  expect(resultInfoCache[project.id].basin).toBe(project.basin);
  expect(lastApi.state.projects.find(row=>row.id===project.id)?.basin).toBe(project.basin);
 });
 it('目录切换清空选择并重置分页，避免在另一个目录删除上次勾选文件',async()=>{
  resultFilesCache.current=Array.from({length:51},(_,i)=>({...INITIAL_RESULT_FILES[0],id:'page-'+i,name:'page-'+i+'.las'}));
  const user=userEvent.setup();render(<Harness section="wells"/>);
  await user.click(screen.getByRole('checkbox',{name:'选择page-0.las'}));
  await user.click(screen.getByRole('button',{name:'下一页'}));
  expect(screen.getByText('已选 1 个文件')).toBeVisible();
  const directory=within(screen.getByRole('navigation',{name:'成果目录'}));
  await user.click(directory.getByRole('button',{name:'时深关系'}));
  expect(screen.getByRole('button',{name:/^删除$/})).toBeDisabled();
  await user.click(directory.getByRole('button',{name:'测井数据'}));
  expect(screen.getByText('第 1–50 条，共 51 条')).toBeVisible();
  expect(screen.getByRole('checkbox',{name:'选择page-0.las'})).not.toBeChecked();
 });

 it('右侧最大化均隐藏顶部上传成果，其他布局显示且目录上传独立',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  expect(screen.getByRole('button',{name:'上传成果'})).toBeVisible();
  await user.click(screen.getByRole('button',{name:'上传成果'}));
  expect(notify).toHaveBeenCalledWith('已选择上传成果入口');
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(resultFilesCache.current).toBeUndefined();
  await user.click(screen.getByRole('button',{name:'最大化当前右侧栏目'}));
  expect(screen.queryByRole('button',{name:'上传成果'})).not.toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'综合成图'}));
  expect(screen.queryByRole('button',{name:'上传成果'})).not.toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'成果概览'}));
  expect(screen.queryByRole('button',{name:'上传成果'})).not.toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'综合成图'}));
  await user.click(screen.getByRole('button',{name:'隐藏成果视图'}));
  expect(screen.getByRole('button',{name:'上传成果'})).toBeVisible();
  expect(screen.queryByRole('button',{name:'最大化当前右侧栏目'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'还原'})).not.toBeInTheDocument();
  await user.click(within(screen.getByRole('navigation',{name:'成果目录'})).getByRole('button',{name:'测井数据'}));
  expect(screen.getByRole('button',{name:'上传成果'})).toBeVisible();
  await user.click(screen.getByRole('button',{name:'上传文件'}));
  expect(screen.getByRole('button',{name:'本地上传'})).toBeVisible();expect(screen.getByRole('button',{name:'远程上传'})).toBeVisible();
  await user.click(screen.getByRole('button',{name:'本地上传'}));
  const dialog=screen.getByRole('dialog');
  expect(within(dialog).getByText('井筒数据 / 测井数据')).toBeVisible();
  await user.upload(within(dialog).getByLabelText('选择本地文件'),new File(['sample'],'客户.las'));
  await user.click(within(dialog).getByRole('button',{name:'上传'}));
  expect(resultFilesCache.current.some(file=>file.name==='客户.las'&&file.directory==='测井数据')).toBe(true);
  expect(resultFilesCache.current.some(file=>file.directory==='项目信息')).toBe(false);
 });
 it('切换英文翻译控件但保留项目名称、编辑草稿和目录内部值',async()=>{
  function Switch(){const {setLocale}=useTranslation();return <><button onClick={()=>setLocale('en')}>Switch English</button><button onClick={()=>setLocale('zh')}>切换中文</button></>;}
  const user=userEvent.setup();render(<LanguageProvider><Switch/><Harness/></LanguageProvider>);
  await user.click(screen.getByRole('button',{name:'编辑'}));
  const name=screen.getByLabelText('项目名称');await user.clear(name);await user.type(name,'用户输入不翻译');
  await user.click(screen.getByRole('button',{name:'Switch English'}));
  expect(screen.getByLabelText('Project name')).toHaveValue('用户输入不翻译');
  expect(screen.getByRole('button',{name:'Cancel'})).toBeVisible();expect(screen.getByRole('button',{name:'Upload results'})).toBeVisible();
  expect(screen.getByRole('button',{name:CURRENT_PROJECT.name})).toBeVisible();
  await user.click(screen.getByRole('button',{name:'Cancel'}));
  await user.click(within(screen.getByRole('navigation',{name:'Results catalogue'})).getByRole('button',{name:'Well log data'}));
  expect(lastApi.state.route.section).toBe('wells');
  await user.click(screen.getByRole('button',{name:'Upload files'}));await user.click(screen.getByRole('button',{name:'Local upload'}));
  expect(within(screen.getByRole('dialog')).getByText('Well data / Well log data')).toBeVisible();
  await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Cancel'}));
  await user.click(screen.getByRole('button',{name:'切换中文'}));
  expect(screen.getByRole('heading',{name:'测井数据'})).toBeVisible();expect(lastApi.state.route.section).toBe('wells');
 });
 it('页内编辑全卡片保存，取消草稿不改变项目与缓存',async()=>{
  const user=userEvent.setup();const {container}=render(<Harness/>);
  await user.click(screen.getByRole('button',{name:'编辑'}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const fields:[string,string][]=[['项目名称','客户页内修改'],['数据名','Seismic-2026'],['iline','200'],['层位（个）','12'],['井数','20'],['备注','客户确认备注']];
  for(const [label,text] of fields){const input=screen.getByLabelText(label);await user.clear(input);await user.type(input,text);}
  await user.selectOptions(screen.getByLabelText('正断层'),'无');
  await user.selectOptions(screen.getByLabelText('是否有时深关系'),'无');
  await user.click(screen.getByRole('button',{name:'保存'}));
  expect(resultInfoCache.current).toMatchObject({name:'客户页内修改',seismicName:'Seismic-2026',iline:'200',layerCount:'12',wellCount:'20',normalFault:'无',hasTimeDepth:'无',note:'客户确认备注'});
  expect(lastApi.state.projects.find(project=>project.id==='current')?.name).toBe('客户页内修改');
  expect(within(container.querySelector('.results-information') as HTMLElement).getByText('Seismic-2026')).toBeVisible();
  await user.click(screen.getByRole('button',{name:'编辑'}));
  await user.clear(screen.getByLabelText('数据名'));await user.type(screen.getByLabelText('数据名'),'草稿不应保存');
  await user.click(screen.getByRole('button',{name:'取消'}));
  expect(resultInfoCache.current.seismicName).toBe('Seismic-2026');
  await user.click(screen.getByRole('button',{name:'编辑'}));expect(screen.getByLabelText('数据名')).toHaveValue('Seismic-2026');
 });
 it('保存拒绝负数和倒置日期，保留可纠正的编辑内容',async()=>{
  const user=userEvent.setup();render(<Harness/>);await user.click(screen.getByRole('button',{name:'编辑'}));
  await user.clear(screen.getByLabelText('井数'));await user.type(screen.getByLabelText('井数'),'-1');
  await user.click(screen.getByRole('button',{name:'保存'}));expect(screen.getByRole('alert')).toHaveTextContent('非负数');expect(resultInfoCache.current).toBeUndefined();
  await user.clear(screen.getByLabelText('井数'));await user.type(screen.getByLabelText('井数'),'1');
  await user.clear(screen.getByLabelText('结束日期'));await user.type(screen.getByLabelText('结束日期'),'2023-01-01');
  await user.click(screen.getByRole('button',{name:'保存'}));expect(screen.getByRole('alert')).toHaveTextContent('结束日期不能早于');
 });
 it('独立最大化与隐藏成果视图可恢复原右栏状态及页签',async()=>{
  const user=userEvent.setup();const {container}=render(<Harness/>);
  await user.click(screen.getByRole('button',{name:'综合成图'}));
  await user.click(screen.getByRole('button',{name:'最大化当前右侧栏目'}));
  const right=container.querySelector('.result-right-content') as HTMLElement;right.scrollTop=219;
  await user.click(screen.getByRole('button',{name:'隐藏成果视图'}));
  expect(lastApi.state.informationMaximized).toBe(true);expect(screen.getByLabelText('已打开5个页签')).toHaveTextContent('5');
  await user.click(screen.getByRole('button',{name:'显示成果视图'}));
  expect(lastApi.state.rightMaximized).toBe(true);expect(lastApi.state.informationMaximized).toBe(false);expect(lastApi.state.resultTab).toBe('gis');expect(right.scrollTop).toBe(219);
  await user.click(screen.getByRole('button',{name:'还原'}));
  await user.click(screen.getByRole('button',{name:'隐藏成果视图'}));await user.click(screen.getByRole('button',{name:'显示成果视图'}));
  expect(lastApi.state.rightMaximized).toBe(false);expect(lastApi.state.informationMaximized).toBe(false);
 });
 it('项目选择器有类型色签、面积及选中状态',async()=>{
  const user=userEvent.setup();render(<Harness/>);await user.click(screen.getByRole('button',{name:CURRENT_PROJECT.name}));
  const selected=screen.getAllByRole('option').find(option=>option.getAttribute('aria-selected')==='true')!;
  expect(within(selected).getByText('96.8 km²')).toBeVisible();expect(selected.querySelector('.project-type-label')).toHaveTextContent('解释');expect(selected.querySelector('.project-type-label')).not.toHaveTextContent('解释项目');
 });
 it('资产与完整度随实际目录文件派生，未下载不伪造下载活动',()=>{
  const directories=getResultDirectories(CURRENT_PROJECT),initial=getResultSummary(directories,INITIAL_RESULT_FILES);
  expect(initial.files).toHaveLength(22);expect(initial.totalBytes).toBe(INITIAL_RESULT_FILES.reduce((sum,file)=>sum+parseFileBytes(file.size),0));
  const next=getResultSummary(directories,[...INITIAL_RESULT_FILES,{id:'new',name:'new.sgy',size:'1 KB',format:'sgy',directory:'偏移叠加纯波数据',uploaded:'2026-10-18',user:'Demo'}]);
  expect(next.ready).toBe(initial.ready+1);expect(next.pending).toBe(initial.pending-1);expect(next.totalBytes).toBe(initial.totalBytes+1024);
  expect(getDownloadSummary('current')).toMatchObject({count:0,totalBytes:0,users:0});expect(bytesLabel(0)).toBe('0 B');
  render(<Harness/>);expect(screen.getByText('成果完整度详情')).toBeVisible();expect(screen.getByText('最近数据下载动态')).toBeVisible();expect(screen.getByText('暂无下载记录')).toBeVisible();
 });
 it('完整度表格移除类别与状态列，仅有文件的目录显示数量与大小',()=>{
  render(<Harness/>);
  const table=screen.getByRole('table',{name:'成果完整度明细'});
  expect(within(table).getAllByRole('columnheader').map(header=>header.textContent)).toEqual(['名称','数量','大小','备注']);
  const row=within(table).getByRole('button',{name:'测井数据'}).closest('tr')!;
  const wellFiles=INITIAL_RESULT_FILES.filter(file=>file.directory==='测井数据');
  expect(within(row).getAllByRole('cell').map(cell=>cell.textContent)).toEqual(['测井数据','18',bytesLabel(wellFiles.reduce((sum,file)=>sum+parseFileBytes(file.size),0)),'—']);
  for(const name of ['井位坐标、轨迹','岩芯','时深关系']){
   const emptyRow=within(table).getByRole('button',{name}).closest('tr')!;
   expect(within(emptyRow).getAllByRole('cell').slice(1,3).map(cell=>cell.textContent)).toEqual(['-','-']);
  }
  const summary=getResultSummary(getResultDirectories(CURRENT_PROJECT),[{id:'precise',name:'precise.las',format:'las',directory:'测井数据',size:'1.46 KB',bytes:1500,user:'Demo',uploaded:'2026-10-18'}]);
  expect(summary.totalBytes).toBe(1500);expect(summary.entries.find(entry=>entry.name==='测井数据')).toMatchObject({count:1,totalBytes:1500,status:'ready'});
 });
 it('新建分类项目没有文件或录入记录时保持零完整度',()=>{
  const project={...CURRENT_PROJECT,id:'created-customer',name:'新建解释项目',typeId:'interpretation',type:'解释'} as Project;
  const summary=getResultSummary(getResultDirectories(project),[],true);
  expect(summary.files).toHaveLength(0);expect(summary.totalBytes).toBe(0);expect(summary.ready).toBe(0);expect(summary.percent).toBe(0);expect(summary.pending).toBeGreaterThan(0);
  expect(summary.entries.every(entry=>entry.status!=='ready')).toBe(true);
 });
 it('有明确分类才采用已有目录子集，旧样例保留原目录',()=>{
  const project=(type:string,typeId:string)=>({...CURRENT_PROJECT,type,typeId} as Project);
  expect(getResultDirectories(CURRENT_PROJECT).map(group=>group.name)).toContain('井筒数据');
  expect(getResultDirectories(project('处理','processing')).map(group=>group.name)).toEqual(['基本信息','处理数据','反演与建模','综合成图','项目文档']);
  expect(getResultDirectories(project('采集','acquisition-land')).map(group=>group.name)).toEqual(['基本信息','综合成图','项目文档']);
 });
});
