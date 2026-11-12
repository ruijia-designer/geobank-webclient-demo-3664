import {useState} from 'react';
import {describe,it,expect,vi,beforeEach} from 'vitest';
import {act,render,screen,within,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type {AppApi,AppState,Route} from '../types';
import {initialState} from '../services/demo';
import ResultsPage from './ResultsPage';
import {projectInfoWorkbook} from '../test/projectInfoWorkbook';
import BaselinePage from './BaselinePage';
import {BASELINE_CONFIGS,baselineFilter} from '../services/baseline';
import {resultFilesCache,resultInfoCache} from '../services/results';
let lastApi:AppApi;
const notify=vi.fn(),deny=vi.fn();
function Harness({page='results',section,projectId='current'}:{page?:'results'|'baseline';section?:string;projectId?:string}){
 const [state,setState]=useState<AppState>(()=>({...initialState('admin'),route:{page,section},currentProjectId:projectId}));
 const navigate=(route:Route)=>setState(s=>({...s,route,currentProjectId:route.projectId||s.currentProjectId}));
 const api:AppApi={state,setState,navigate,notify,deny,openProject:()=>{}};lastApi=api;
 return page==='results'?<ResultsPage api={api}/>:<BaselinePage api={api}/>;
}
beforeEach(()=>{vi.clearAllMocks();Object.keys(resultFilesCache).forEach(k=>delete resultFilesCache[k]);Object.keys(resultInfoCache).forEach(k=>delete resultInfoCache[k]);vi.stubGlobal('requestAnimationFrame',(cb:FrameRequestCallback)=>{cb(0);return 1})});
describe('成果页真实组件流程',()=>{
 it('面积只在标签显示单位，基本信息包含新增字段且无边框',()=>{render(<Harness/>);expect(screen.getAllByText('大小(km² / km)')).toHaveLength(2);expect(screen.queryByText('96.8 km²')).not.toBeInTheDocument();expect(screen.getByText('坳陷')).toBeInTheDocument();expect(screen.getByText('凹陷')).toBeInTheDocument();expect(screen.getByText('起始日期')).toBeInTheDocument();expect(screen.queryByText('边框')).not.toBeInTheDocument()});
 it('页内编辑所有信息卡片并保存真实值，输入焦点稳定且取消不保存草稿',async()=>{
  const user=userEvent.setup();const {container}=render(<Harness/>);
  await user.click(screen.getByRole('button',{name:'编辑'}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  const information=container.querySelector('.results-information') as HTMLElement;
  const form=within(information),name=form.getByLabelText('项目名称');
  await user.clear(name);await user.type(name,'项目测试名称');expect(name).toHaveFocus();
  expect(form.getByLabelText('位置').tagName).toBe('INPUT');
  const area=form.getByLabelText('大小(km² / km)');expect(area).toHaveValue(96.8);
  const changes:[string,string][]=[['位置','太岳山东侧，覆盖南北两片工区。北部工区位于测试河谷沿线。'],['大小(km² / km)','104.5'],['数据名','Seismic-测试'],['iline','200'],['层位(个)','11'],['井数','21'],['备注','页内编辑备注']];
  for(const [label,text] of changes){const field=form.getByLabelText(label);await user.clear(field);await user.type(field,text);}
  await user.selectOptions(form.getByLabelText('正断层'),'无');
  expect(information.querySelectorAll('.information-card input,.information-card select,.information-card textarea').length).toBeGreaterThan(30);
  await user.click(form.getByRole('button',{name:'保存'}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(lastApi.state.projects.find(p=>p.id==='current')?.name).toBe('项目测试名称');
  expect(resultInfoCache.current).toMatchObject({location:'太岳山东侧，覆盖南北两片工区。北部工区位于测试河谷沿线。',area:'104.5',seismicName:'Seismic-测试',iline:'200',layerCount:'11',wellCount:'21',normalFault:'无',note:'页内编辑备注'});
  await user.click(form.getByRole('button',{name:'编辑'}));
  await user.clear(form.getByLabelText('数据名'));await user.type(form.getByLabelText('数据名'),'未保存草稿');
  await user.click(form.getByRole('button',{name:'取消'}));
  expect(resultInfoCache.current.seismicName).toBe('Seismic-测试');
  expect(form.getByText('Seismic-测试')).toBeVisible();expect(form.queryByText('未保存草稿')).not.toBeInTheDocument();
 });
 it('读取 Excel 横表中的真实值和日期后直接回填当前项目',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  await user.click(screen.getByRole('button',{name:'导入'}));
  const file=projectInfoWorkbook([
   ['项目名称','位置','年度','大小(km² / km)','起始日期','结束日期','井数','备注'],
   ['实测项目','东区',2025,0,new Date(2025,0,11),'2025/2/8',0,'实测备注'],
  ]);
  await user.upload(screen.getByLabelText('选择Excel文件'),file);
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(notify).toHaveBeenCalledWith('项目信息已导入');
  expect(resultInfoCache.current).toMatchObject({name:'实测项目',location:'东区',year:'2025',area:'0',start:'2025-01-11',end:'2025-02-08',wellCount:'0',note:'实测备注'});
  expect(lastApi.state.projects.find(project=>project.id==='current')?.name).toBe('实测项目');
 });
 it('无效 Excel 或不符合表单约束时不写入；可在同一弹窗重试',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  await user.click(screen.getByRole('button',{name:'导入'}));
  const input=screen.getByLabelText('选择Excel文件');
  const invalid: [File,string][]=[
   [new File(['fake'],'invalid.xlsx'),'无法读取 Excel 文件'],
   [projectInfoWorkbook([['未知字段','内容']]),'未找到可导入'],
   [projectInfoWorkbook([['位置'],['北区'],['南区']]),'请在表头下只填写一个项目'],
   [projectInfoWorkbook([['位置','井数'],['新位置',-1]]),'井数：请输入非负数'],
   [projectInfoWorkbook([['井数',1.5]]),'井数：请输入非负整数'],
   [projectInfoWorkbook([['位置','起始日期'],['新位置','2025-02-30']]),'起始日期：请输入有效日期'],
   [projectInfoWorkbook([['起始日期','结束日期'],['2025-02-01','2025-01-01']]),'结束日期不能早于起始日期'],
   [projectInfoWorkbook([['正断层','其他']]),'正断层：请选择有效选项'],
  ];
  for(const [file,error] of invalid){
   await user.upload(input,file);
   await waitFor(()=>expect(screen.getByRole('alert')).toHaveTextContent(error));
   expect(resultInfoCache.current).toBeUndefined();
  }
  await user.upload(input,projectInfoWorkbook([['位置','修正位置']]));
  await waitFor(()=>expect(resultInfoCache.current?.location).toBe('修正位置'));
 });

 it('读取 Excel 期间取消弹窗，随后完成读取也不会改动项目',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  const original=FileReader.prototype.readAsArrayBuffer;
  let finish: (()=>Promise<void>) | undefined;
  const reading=vi.spyOn(FileReader.prototype,'readAsArrayBuffer').mockImplementation(function(this:FileReader,file:Blob){
   finish=()=>new Promise<void>(resolve=>{
    this.addEventListener('loadend',()=>resolve(),{once:true});
    original.call(this,file);
   });
  });
  try {
   await user.click(screen.getByRole('button',{name:'导入'}));
   await user.upload(screen.getByLabelText('选择Excel文件'),projectInfoWorkbook([['位置','应舍弃']]));
   await waitFor(()=>expect(finish).toBeDefined());
   await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:'取消'}));
   await act(async()=>{await finish!();});
   expect(resultInfoCache.current).toBeUndefined();
   expect(notify).not.toHaveBeenCalledWith('项目信息已导入');
  } finally { reading.mockRestore(); }
 });
 it('最大化当前右侧栏目，隐藏左侧目录，保留活动标签并恢复滚动位置',async()=>{const user=userEvent.setup();const {container}=render(<Harness/>);const info=container.querySelector('.results-information') as HTMLElement;const right=container.querySelector('.result-right-content') as HTMLElement;info.scrollTop=123;right.scrollTop=234;await user.click(screen.getByRole('tab',{name:'综合成图'}));await user.click(screen.getByRole('button',{name:'最大化当前右侧栏目'}));expect(info).not.toBeVisible();expect(screen.queryByRole('navigation',{name:'成果目录'})).not.toBeInTheDocument();expect(container.querySelector('.result-project-tools')).not.toBeVisible();expect(lastApi.state.resultTab).toBe('gis');await user.click(screen.getByRole('button',{name:'还原'}));expect(info).toBeVisible();expect(info.scrollTop).toBe(123);expect(right.scrollTop).toBe(234);expect(lastApi.state.resultTab).toBe('gis')});
 it('独立全屏与隐藏/显示保留各布局滚动、页签数量和项目',async()=>{
  const user=userEvent.setup();const {container}=render(<Harness/>);
  const info=container.querySelector('.results-information') as HTMLElement;
  const right=container.querySelector('.result-right-content') as HTMLElement;
  info.scrollTop=123;right.scrollTop=234;
  await user.click(screen.getByRole('tab',{name:'综合成图'}));
  await user.click(screen.getAllByRole('button',{name:'关闭设计文档.doc'})[0]);
  await user.click(screen.getByRole('button',{name:'关闭B1-1.las'}));
  await user.click(screen.getByRole('button',{name:'最大化当前右侧栏目'}));
  expect(info).not.toBeVisible();expect(right).toBeVisible();right.scrollTop=345;
  await user.click(screen.getByRole('button',{name:'隐藏成果视图'}));
  expect(info).toBeVisible();expect(right).not.toBeVisible();
  expect(screen.getByLabelText('已打开3个页签')).toHaveTextContent('3');
  expect(screen.queryByRole('button',{name:'最大化当前右侧栏目'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'还原'})).not.toBeInTheDocument();
  expect(info.scrollTop).toBe(123);info.scrollTop=456;
  expect(screen.getByRole('navigation',{name:'成果目录'})).toBeVisible();
  await user.click(screen.getByRole('button',{name:'显示成果视图'}));
  expect(info).not.toBeVisible();expect(right).toBeVisible();expect(right.scrollTop).toBe(345);
  expect(lastApi.state.rightMaximized).toBe(true);expect(lastApi.state.informationMaximized).toBe(false);
  expect(screen.queryByLabelText('已打开3个页签')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'还原'}));
  expect(info).toBeVisible();expect(right).toBeVisible();
  expect(info.scrollTop).toBe(123);expect(right.scrollTop).toBe(234);
  expect(lastApi.state.resultTab).toBe('gis');expect(lastApi.state.currentProjectId).toBe('current');
  await user.click(screen.getByRole('button',{name:'隐藏成果视图'}));
  expect(info.scrollTop).toBe(456);info.scrollTop=567;
  await user.click(screen.getByRole('button',{name:'显示成果视图'}));
  expect(lastApi.state.rightMaximized).toBe(false);expect(info.scrollTop).toBe(123);expect(right.scrollTop).toBe(234);
  await user.click(screen.getByRole('button',{name:'隐藏成果视图'}));expect(info.scrollTop).toBe(567);
 });
 it('仅列表上传文件提供本地与远程菜单，本地无选择禁用，选择后添加文件',async()=>{const user=userEvent.setup();render(<Harness section="wells"/>);expect(screen.getByRole('button',{name:'一键上传'})).toBeInTheDocument();expect(screen.queryByText('本地上传')).not.toBeInTheDocument();await user.click(screen.getByRole('button',{name:'上传成果'}));expect(screen.getByRole('button',{name:'本地上传'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'远程上传'})).toBeInTheDocument();expect(screen.queryByText('批量上传')).not.toBeInTheDocument();await user.click(screen.getByRole('button',{name:'本地上传'}));const dialog=screen.getByRole('dialog');expect(within(dialog).getByRole('button',{name:'上传'})).toBeDisabled();await user.upload(within(dialog).getByLabelText('选择本地文件'),new File(['abc'],'test.las',{type:'application/octet-stream'}));expect(within(dialog).getByText('test.las')).toBeInTheDocument();await user.click(within(dialog).getByRole('button',{name:'上传'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.getByRole('button',{name:'test.las'})).toBeInTheDocument();expect(screen.queryByText('前缀与后缀均未配置')).not.toBeInTheDocument()});
 it('远程来源、目录、搜索、选择、刷新及上传相互关联',async()=>{const user=userEvent.setup();render(<Harness section="wells"/>);await user.click(screen.getByRole('button',{name:'上传成果'}));await user.click(screen.getByRole('button',{name:'远程上传'}));const dialog=screen.getByRole('dialog');expect(within(dialog).getByRole('button',{name:'上传'})).toBeDisabled();await user.selectOptions(within(dialog).getByLabelText('数据来源'),'57服务器-华北-解释项目');await user.click(within(dialog).getByRole('button',{name:'测井数据'}));expect(within(dialog).getByText('An18.las')).toBeInTheDocument();await user.type(within(dialog).getByLabelText('搜索文件名'),'An18');expect(within(dialog).queryByText('An19.las')).not.toBeInTheDocument();await user.click(within(dialog).getByLabelText('选择远程An18.las'));await user.click(within(dialog).getByRole('button',{name:'刷新文件列表'}));expect(notify).toHaveBeenCalledWith('远程演示文件列表已刷新');await user.click(within(dialog).getByRole('button',{name:'上传'}));expect(screen.queryByRole('dialog')).not.toBeInTheDocument();expect(screen.getAllByRole('button',{name:'An18.las'})).toHaveLength(2)});
 it('搜索无权限项目不显示候选，保留当前项目',async()=>{const user=userEvent.setup();render(<Harness/>);await user.click(screen.getByRole('button',{name:/2024年山西地区三维地震资料处理解释技术服务/}));await user.type(screen.getByLabelText('筛选项目'),'C解释');expect(screen.queryByRole('option')).not.toBeInTheDocument();expect(screen.getByText('未找到匹配项目')).toBeVisible();expect(deny).not.toHaveBeenCalled();expect(lastApi.state.currentProjectId).toBe('current')});
 it('新创建项目保持空字段和空文件列表',()=>{const p={id:'created-demo',name:'新建演示',basin:'',year:'',area:'',point:[100,100] as [number,number],type:'采集',readable:true,archived:false};function New(){const [state,setState]=useState<AppState>({...initialState('admin'),projects:[p],currentProjectId:p.id,route:{page:'results'}});return <ResultsPage api={{state,setState,navigate:()=>{},notify,deny,openProject:()=>{}}}/>};render(<New/>);expect(screen.getAllByText('暂无上传记录')).toHaveLength(1);expect(screen.queryByText('189')).not.toBeInTheDocument()});
});
describe('基准页面字段与有效流程',()=>{
 it('项目类型显示名称编码和可点击色块，完整展示且没有操作列',async()=>{render(<Harness page="baseline" section="types"/>);expect(screen.getAllByRole('columnheader').map(t=>t.textContent)).toEqual(['名称','编码','颜色']);expect(screen.getAllByText('#277DA8').length).toBeGreaterThan(0);expect(await screen.findByRole('button',{name:'修改采集颜色'})).toBeEnabled();expect(screen.queryByRole('button',{name:'新增项目类型'})).not.toBeInTheDocument();expect(screen.queryByRole('button',{name:'拖动排序采集'})).not.toBeInTheDocument();expect(screen.queryByRole('combobox',{name:'每页行数'})).not.toBeInTheDocument()});
 it('井别表单无状态，新增、查看、修改、删除可用',async()=>{const user=userEvent.setup();render(<Harness page="baseline" section="wells"/>);await user.click(screen.getAllByRole('button',{name:'新增井别'})[0]);let dialog=screen.getByRole('dialog');expect(within(dialog).queryByText('状态')).not.toBeInTheDocument();expect(within(dialog).queryByText('尚未填写')).not.toBeInTheDocument();await user.type(within(dialog).getByLabelText(/名称/),'测试井别');await user.type(within(dialog).getByLabelText('编码'),'T01');await user.click(within(dialog).getByRole('button',{name:'保存'}));await user.click(screen.getByRole('button',{name:'测试井别'}));dialog=screen.getByRole('dialog');expect(within(dialog).getByText('T01')).toBeInTheDocument();await user.click(within(dialog).getAllByRole('button',{name:'关闭'}).at(-1)!);await user.click(screen.getByRole('button',{name:'编辑测试井别'}));dialog=screen.getByRole('dialog');await user.clear(within(dialog).getByLabelText('编码'));await user.type(within(dialog).getByLabelText('编码'),'T02');await user.click(within(dialog).getByRole('button',{name:'保存'}));expect(screen.getByText('T02')).toBeInTheDocument();await user.click(screen.getByRole('button',{name:'删除测试井别'}));await user.click(screen.getByRole('button',{name:'确认删除'}));expect(screen.queryByRole('button',{name:'测试井别'})).not.toBeInTheDocument()});
 it('承包商新增仅保留联系字段，不出现国家省份',async()=>{const user=userEvent.setup();render(<Harness page="baseline" section="contractors"/>);await user.click(screen.getByRole('button',{name:'新增承包商'}));const d=screen.getByRole('dialog');expect(within(d).getByLabelText('地址')).toBeInTheDocument();expect(within(d).getByLabelText('联系电话')).toBeInTheDocument();expect(within(d).queryByText('国家')).not.toBeInTheDocument();expect(within(d).queryByText('省份')).not.toBeInTheDocument()});
 it('树查询保留上级路径，磁盘扫描更新本地时间',async()=>{const structure=BASELINE_CONFIGS.find(c=>c.id==='structure')!;expect(baselineFilter(structure.rows,'田东','',true).map(r=>r.name)).toEqual(['百色盆地','东部坳陷','田东凹陷']);const user=userEvent.setup();render(<Harness page="baseline" section="disks"/>);await user.click(screen.getByRole('button',{name:'扫描57服务器-华北-解释项目'}));await user.click(screen.getByRole('button',{name:'开始扫描'}));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());expect(notify).toHaveBeenCalledWith('本地演示扫描完成')});
});
