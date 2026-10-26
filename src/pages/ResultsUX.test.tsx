import {useState} from 'react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultsPage from './ResultsPage';
import {LanguageProvider,useTranslation} from '../i18n';
import {CURRENT_PROJECT,initialState} from '../services/demo';
import {resultDownloadsCache,resultFilesCache,resultInfoCache} from '../services/results';
import type {AppApi,AppState,Project,Route} from '../types';

const readable:Project={...CURRENT_PROJECT,id:'ux-readable',name:'可读测试项目',readable:true,archived:true};
const denied:Project={...CURRENT_PROJECT,id:'ux-denied',name:'受限测试项目',readable:false,archived:true};
const notify=vi.fn(),deny=vi.fn(),navigation=vi.fn();
let lastState:AppState;

function LocaleSwitch(){
 const {setLocale}=useTranslation();
 return <button onClick={()=>setLocale('en')}>切换英文</button>;
}

function Harness({localeSwitcher=false}:{localeSwitcher?:boolean}){
 const [state,setState]=useState<AppState>(()=>({...initialState('admin'),route:{page:'results'},projects:[{...CURRENT_PROJECT},readable,denied]}));
 lastState=state;
 const navigate=(route:Route)=>{
  navigation(route);
  setState(previous=>({...previous,route,currentProjectId:route.projectId||previous.currentProjectId}));
 };
 const api:AppApi={state,setState,navigate,notify,deny,openProject:vi.fn()};
 return <LanguageProvider>{localeSwitcher&&<LocaleSwitch/>}<ResultsPage api={api}/></LanguageProvider>;
}

beforeEach(()=>{
 sessionStorage.removeItem('geobank-demo-locale');
 vi.clearAllMocks();
 for(const cache of [resultInfoCache,resultFilesCache,resultDownloadsCache])for(const key of Object.keys(cache))delete cache[key];
 vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{callback(0);return 1;});
});

async function chooseProject(user:ReturnType<typeof userEvent.setup>,from:string,to:string){
 await user.click(screen.getByRole('button',{name:from}));
 await user.click(within(screen.getByRole('listbox',{name:'项目'})).getByRole('option',{name:new RegExp(to)}));
}

async function editNote(user:ReturnType<typeof userEvent.setup>,note='尚未保存的项目说明'){
 await user.click(screen.getByRole('button',{name:'编辑'}));
 const input=screen.getByLabelText('备注');
 await user.clear(input);
 await user.type(input,note);
 return input;
}

describe('成果页草稿保护与项目选择器',()=>{
 it('有修改时切换项目先确认，继续编辑保留草稿及唯一保存取消入口',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  await editNote(user);
  expect(screen.getAllByRole('button',{name:'保存'})).toHaveLength(1);
  expect(screen.getAllByRole('button',{name:'取消'})).toHaveLength(1);
  await chooseProject(user,CURRENT_PROJECT.name,readable.name);
  const dialog=screen.getByRole('dialog',{name:'未保存的修改'});
  for(const name of ['继续编辑','放弃修改','保存并继续'])expect(within(dialog).getByRole('button',{name})).toBeVisible();
  expect(navigation).not.toHaveBeenCalled();
  expect(lastState.currentProjectId).toBe('current');
  await user.click(within(dialog).getByRole('button',{name:'继续编辑'}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('备注')).toHaveValue('尚未保存的项目说明');
  expect(resultInfoCache.current).toBeUndefined();
  expect(navigation).not.toHaveBeenCalled();
 });

 it('放弃修改后切到目标项目，返回原项目时不留下放弃的草稿',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  await user.click(screen.getByRole('button',{name:'编辑'}));
  const originalNote=(screen.getByLabelText('备注') as HTMLTextAreaElement).value;
  await user.clear(screen.getByLabelText('备注'));
  await user.type(screen.getByLabelText('备注'),'这条修改应被放弃');
  await chooseProject(user,CURRENT_PROJECT.name,readable.name);
  await user.click(within(screen.getByRole('dialog',{name:'未保存的修改'})).getByRole('button',{name:'放弃修改'}));
  expect(lastState.currentProjectId).toBe(readable.id);
  expect(screen.getByRole('button',{name:readable.name})).toBeVisible();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await chooseProject(user,readable.name,CURRENT_PROJECT.name);
  await user.click(screen.getByRole('button',{name:'编辑'}));
  expect(screen.getByLabelText('备注')).toHaveValue(originalNote);
  expect(resultInfoCache.current).toBeUndefined();
 });

 it('保存并继续把内容保存到原项目，返回后可再次编辑已保存内容',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  await editNote(user,'保存到原项目的说明');
  await user.clear(screen.getByLabelText('项目名称'));
  await user.type(screen.getByLabelText('项目名称'),'已保存的原项目');
  await chooseProject(user,CURRENT_PROJECT.name,readable.name);
  await user.click(within(screen.getByRole('dialog',{name:'未保存的修改'})).getByRole('button',{name:'保存并继续'}));
  expect(lastState.currentProjectId).toBe(readable.id);
  expect(resultInfoCache.current).toMatchObject({name:'已保存的原项目',note:'保存到原项目的说明'});
  expect(resultInfoCache[readable.id]).toBeUndefined();
  await chooseProject(user,readable.name,'已保存的原项目');
  await user.click(screen.getByRole('button',{name:'编辑'}));
  expect(screen.getByLabelText('项目名称')).toHaveValue('已保存的原项目');
  expect(screen.getByLabelText('备注')).toHaveValue('保存到原项目的说明');
 });

 it('保存并继续校验失败时留在原项目，返回可纠正的草稿和字段错误',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  await editNote(user,'校验失败也不能丢失');
  await user.clear(screen.getByLabelText('项目名称'));
  await chooseProject(user,CURRENT_PROJECT.name,readable.name);
  await user.click(within(screen.getByRole('dialog',{name:'未保存的修改'})).getByRole('button',{name:'保存并继续'}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(lastState.currentProjectId).toBe('current');
  expect(navigation).not.toHaveBeenCalled();
  const name=screen.getByLabelText('项目名称');
  expect(name).toBeVisible();expect(name).toHaveValue('');expect(name).toHaveAttribute('aria-invalid','true');
  expect(document.getElementById(name.getAttribute('aria-describedby')!)).toHaveTextContent('请输入项目名称');
  expect(name).toHaveFocus();
  expect(screen.getByLabelText('备注')).toHaveValue('校验失败也不能丢失');
  expect(resultInfoCache.current).toBeUndefined();
  await user.type(name,'校验已通过的名称');
  await user.click(screen.getByRole('button',{name:'保存'}));
  expect(resultInfoCache.current).toMatchObject({name:'校验已通过的名称',note:'校验失败也不能丢失'});
  expect(lastState.currentProjectId).toBe('current');
  expect(navigation).not.toHaveBeenCalled();
 });

 it.each([false,true])('未修改内容时直接切换，不因编辑状态弹确认（editing=%s）',async editing=>{
  const user=userEvent.setup();render(<Harness/>);
  if(editing)await user.click(screen.getByRole('button',{name:'编辑'}));
  await chooseProject(user,CURRENT_PROJECT.name,readable.name);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(lastState.currentProjectId).toBe(readable.id);
  expect(screen.getByRole('button',{name:readable.name})).toBeVisible();
  expect(resultInfoCache.current).toBeUndefined();
 });

 it('草稿暂藏在文件目录时，保存切换校验失败仍返回可见编辑表单',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  await editNote(user,'跨目录保留的草稿');
  await user.clear(screen.getByLabelText('井数'));
  await user.type(screen.getByLabelText('井数'),'-1');
  await user.click(within(screen.getByRole('navigation',{name:'成果目录'})).getByRole('button',{name:'测井数据'}));
  expect(screen.queryByRole('textbox',{name:'备注'})).not.toBeInTheDocument();
  navigation.mockClear();
  await chooseProject(user,CURRENT_PROJECT.name,readable.name);
  await user.click(within(screen.getByRole('dialog',{name:'未保存的修改'})).getByRole('button',{name:'保存并继续'}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(lastState.currentProjectId).toBe('current');
  expect(navigation).toHaveBeenCalledTimes(1);
  expect(navigation).toHaveBeenCalledWith({page:'results',projectId:'current'});
  expect(navigation).not.toHaveBeenCalledWith(expect.objectContaining({projectId:readable.id}));
  expect(lastState.route).toEqual({page:'results',projectId:'current'});
  const count=screen.getByLabelText('井数');
  expect(count).toBeVisible();expect(count).toHaveValue(-1);expect(count).toHaveAttribute('aria-invalid','true');
  expect(count).toHaveFocus();
  expect(document.getElementById(count.getAttribute('aria-describedby')!)).toHaveTextContent('请输入非负数');
  expect(screen.getByLabelText('备注')).toHaveValue('跨目录保留的草稿');
 });

 it('重复选择当前项目不触发离开确认、不丢草稿',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  await editNote(user);
  await chooseProject(user,CURRENT_PROJECT.name,CURRENT_PROJECT.name);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('备注')).toHaveValue('尚未保存的项目说明');
  expect(lastState.currentProjectId).toBe('current');
 });

 it('选择无权限项目只提示权限，保留原项目的编辑草稿',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  await editNote(user);
  await user.click(screen.getByRole('button',{name:CURRENT_PROJECT.name}));
  const option=within(screen.getByRole('listbox',{name:'项目'})).getByRole('option',{name:new RegExp(denied.name)});
  expect(within(option).getByText('无浏览权限')).toBeVisible();
  await user.click(option);
  expect(deny).toHaveBeenCalledTimes(1);
  expect(navigation).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog',{name:'未保存的修改'})).not.toBeInTheDocument();
  expect(lastState.currentProjectId).toBe('current');
  expect(screen.getByLabelText('备注')).toHaveValue('尚未保存的项目说明');
 });

 it('选项明确展示权限，搜索无匹配时可清空恢复列表及当前选择',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  await user.click(screen.getByRole('button',{name:CURRENT_PROJECT.name}));
  const list=screen.getByRole('listbox',{name:'项目'});
  expect(within(within(list).getByRole('option',{name:new RegExp(readable.name)})).getByText('可查阅')).toBeVisible();
  expect(within(within(list).getByRole('option',{name:new RegExp(denied.name)})).getByText('无浏览权限')).toBeVisible();
  const query=screen.getByRole('textbox',{name:'筛选项目'});
  await user.type(query,'不会命中任何项目的关键词');
  expect(screen.getByText('未找到匹配项目')).toBeVisible();
  expect(screen.queryAllByRole('option')).toHaveLength(0);
  await user.click(screen.getByRole('button',{name:'清空搜索'}));
  expect(query).toHaveValue('');
  expect(screen.queryByText('未找到匹配项目')).not.toBeInTheDocument();
  const restored=screen.getByRole('listbox',{name:'项目'});
  expect(within(restored).getAllByRole('option')).toHaveLength(3);
  expect(within(restored).getByRole('option',{name:new RegExp(CURRENT_PROJECT.name)})).toHaveAttribute('aria-selected','true');
  expect(navigation).not.toHaveBeenCalled();
 });

 it('切换英文后权限、空结果和草稿保护操作均翻译，项目名及草稿保持原文',async()=>{
  const user=userEvent.setup();render(<Harness localeSwitcher/>);
  await editNote(user,'用户填写的中文备注');
  await user.click(screen.getByRole('button',{name:'切换英文'}));
  await user.click(screen.getByRole('button',{name:CURRENT_PROJECT.name}));
  const list=screen.getByRole('listbox',{name:'Project'});
  expect(within(within(list).getByRole('option',{name:new RegExp(readable.name)})).getByText('Accessible')).toBeVisible();
  expect(within(within(list).getByRole('option',{name:new RegExp(denied.name)})).getByText('No viewing permission')).toBeVisible();
  await user.type(screen.getByRole('textbox',{name:'Filter projects'}),'no match for ux test');
  expect(screen.getByText('No matching projects')).toBeVisible();
  await user.click(screen.getByRole('button',{name:'Clear search'}));
  await user.click(within(screen.getByRole('listbox',{name:'Project'})).getByRole('option',{name:new RegExp(readable.name)}));
  const dialog=screen.getByRole('dialog',{name:'Unsaved changes'});
  expect(within(dialog).getByText(CURRENT_PROJECT.name)).toBeVisible();
  expect(within(dialog).getByRole('button',{name:'Discard changes'})).toBeVisible();
  expect(within(dialog).getByRole('button',{name:'Save and continue'})).toBeVisible();
  await user.click(within(dialog).getByRole('button',{name:'Continue editing'}));
  expect(screen.getByRole('textbox',{name:'Notes'})).toHaveValue('用户填写的中文备注');
  expect(navigation).not.toHaveBeenCalled();
 });
});
