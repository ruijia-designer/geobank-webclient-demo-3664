import {act,fireEvent,render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {StrictMode} from 'react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import App,{parseRoute} from './App';
import {canRead,initialState,projectOptions,visibleProjects} from './services/demo';

beforeEach(()=>{sessionStorage.clear();sessionStorage.setItem('geobank-demo-authenticated-v1','true');window.history.replaceState(null,'','/#/overview')});
describe('全局角色与 Hash 路由',()=>{
 it('结果子目录支持刷新，非法地址安全回到概览',()=>{
  expect(parseRoute('#/results/1/wells')).toEqual({page:'results',projectId:'1',section:'wells'});
  expect(parseRoute('#/unknown')).toEqual({page:'overview'});
  expect(parseRoute('#/results/%E0%A4')).toEqual({page:'overview'});
 });
 it('六个原样例保留状态，普通用户仅见三个已归档且无查阅权限',()=>{
  const admin=initialState('admin'),ordinary=initialState('ordinary');
  expect(visibleProjects(admin.projects,'admin')).toHaveLength(6);
  expect(visibleProjects(ordinary.projects,'ordinary').map(p=>p.id)).toEqual(['2','4','5']);
  expect(projectOptions(ordinary).map(p=>p.id)).toEqual(['2','4','5']);
  expect(ordinary.projects.filter(p=>canRead(p,'ordinary'))).toHaveLength(0);
 });
 it('普通入口的地图和卡片一致，不显示创建或未归档',()=>{
  window.history.replaceState(null,'','/?role=ordinary#/overview');render(<App/>);
  expect(screen.getByText('3 个项目')).toBeInTheDocument();
  expect(screen.getAllByRole('button',{name:/^项目：/})).toHaveLength(3);
  expect(screen.getAllByRole('button',{name:/^定位项目：/})).toHaveLength(3);
  expect(screen.queryByRole('button',{name:'新建项目'})).not.toBeInTheDocument();
  expect(screen.queryByText('未归档')).not.toBeInTheDocument();
 });
 it('普通用户直达未归档项目被拒绝，不渲染成果内容',()=>{
  window.history.replaceState(null,'','/?role=ordinary#/results/0');render(<App/>);
  expect(screen.getByRole('dialog',{name:'无浏览权限'})).toHaveTextContent('您无浏览此项目数据的权限');
  expect(screen.queryByRole('button',{name:'上传成果'})).not.toBeInTheDocument();
  expect(window.location.hash).toBe('#/overview');
 });
});
describe('概览与跨页面流程',()=>{
 it('单击定位弹出摘要，双击可读卡片进入对应成果',async()=>{
  const u=userEvent.setup();render(<App/>);
  const card=screen.getByRole('button',{name:'项目：2024年山西省左权西乡处理项目'});
  vi.useFakeTimers();fireEvent.click(card,{detail:1});act(()=>vi.advanceTimersByTime(330));vi.useRealTimers();
  expect(screen.getByRole('region',{name:'项目基本信息'})).toBeInTheDocument();
  await u.dblClick(card);
  expect(window.location.hash).toBe('#/results/0');
  expect(screen.getByRole('button',{name:'上传成果'})).toBeInTheDocument();
  await u.click(screen.getByRole('button',{name:'概览'}));
  await u.click(screen.getByRole('button',{name:'成果'}));
  expect(window.location.hash).toBe('#/results/0');
 });
 it('配色页及图层收起保持无卡片权限标签',async()=>{
  const u=userEvent.setup();render(<App/>);
  await u.click(screen.getByRole('button',{name:'配色方式'}));
  expect(screen.queryByText('可查阅')).not.toBeInTheDocument();
  expect(screen.getByRole('button',{name:/^项目类型$/})).toHaveAttribute('aria-expanded','false');
  await u.click(screen.getByRole('button',{name:/^项目类型$/}));
  expect(screen.getByRole('checkbox',{name:'采集'})).toBeVisible();
  await u.click(screen.getByRole('button',{name:/^项目类型$/}));
  expect(screen.queryByText('可查阅')).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox',{name:'采集'})).not.toBeInTheDocument();
 });
 it('创建项目后直接进入空成果，再经概览返回仍为新项目',async()=>{
  const u=userEvent.setup();render(<App/>);
  await u.click(screen.getByRole('button',{name:'成果'}));
  await u.click(screen.getByRole('button',{name:'最大化当前右侧栏目'}));
  await u.click(screen.getByRole('button',{name:'隐藏成果视图'}));
  await u.click(screen.getByRole('button',{name:'概览'}));
  await u.click(screen.getByRole('button',{name:'新建项目'}));
  const modal=screen.getByRole('dialog',{name:'新建项目'});
  await u.type(within(modal).getByRole('textbox',{name:'项目名称'}),'验收项目');
  await u.selectOptions(within(modal).getByRole('combobox',{name:'所属盆地'}),'百色盆地');
  await u.click(within(modal).getByRole('button',{name:'项目类型'}));
  await u.click(within(modal).getByRole('option',{name:'处理'}));
  await u.click(within(modal).getByRole('button',{name:'确定'}));
  expect(window.location.hash).toMatch(/^#\/results\/created-/);
  expect(screen.getByRole('button',{name:'上传成果'})).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'最大化当前右侧栏目'})).toBeInTheDocument();
  expect(document.querySelector('.result-right-content')).toBeVisible();
  expect(screen.queryByRole('dialog',{name:'无浏览权限'})).not.toBeInTheDocument();
  const address=window.location.hash;
  await u.click(screen.getByRole('button',{name:'概览'}));
  await u.click(screen.getByRole('button',{name:'成果'}));
  expect(window.location.hash).toBe(address);
 });
});
describe('Demo 菜单与本地登录',()=>{
 it('首次访问及直达成果先显示登录页，成功登录后才能打开工作区',async()=>{
  const u=userEvent.setup();sessionStorage.clear();window.history.replaceState(null,'','/#/results/1');render(<StrictMode><App/></StrictMode>);
  expect(screen.getByRole('heading',{name:'欢迎登录'})).toBeInTheDocument();
  expect(document.body).toHaveClass('geobank-login-active');
  expect(screen.queryByRole('button',{name:'上传成果'})).not.toBeInTheDocument();
  expect(window.location.hash).toBe('#/login');
  await u.type(screen.getByRole('textbox',{name:'用户名'}),'Demo');
  await u.type(screen.getByLabelText('密码',{exact:true}),'demo123{Enter}');
  expect(screen.getByRole('navigation',{name:'顶部导航'})).toBeInTheDocument();
  expect(document.body).not.toHaveClass('geobank-login-active');
  expect(sessionStorage.getItem('geobank-demo-authenticated-v1')).toBe('true');
  await u.click(screen.getByRole('button',{name:'检索'}));
  expect(screen.getByRole('heading',{name:'数据检索'})).toBeInTheDocument();
  await u.click(screen.getByRole('button',{name:'Demo 用户菜单'}));
  await u.click(screen.getByRole('menuitem',{name:/退出登录/}));
  expect(screen.getByRole('heading',{name:'欢迎登录'})).toBeInTheDocument();
  expect(document.body).toHaveClass('geobank-login-active');
  expect(sessionStorage.getItem('geobank-demo-authenticated-v1')).toBeNull();
 });
 it('管理返回恢复检索关键词与筛选',async()=>{
  const u=userEvent.setup();render(<App/>);
  await u.click(screen.getByRole('button',{name:'检索'}));
  await u.click(screen.getByRole('button',{name:'盆地名称'}));
  await u.click(screen.getByRole('button',{name:'Demo 用户菜单'}));
  await u.click(screen.getByRole('menuitem',{name:'系统管理'}));
  await u.click(screen.getByRole('button',{name:'返回项目'}));
  expect(screen.getByRole('textbox',{name:'检索关键词'})).toHaveValue('沁水盆地');
  expect(screen.getByLabelText('项目结果数量')).toHaveTextContent('1');
 });
 it('密码错误、显示切换与正确登录恢复退出前项目',async()=>{
  const u=userEvent.setup();window.history.replaceState(null,'','/#/results/1');render(<App/>);
  await u.click(screen.getByRole('button',{name:'Demo 用户菜单'}));
  await u.click(screen.getByRole('menuitem',{name:/退出登录/}));
  await u.type(screen.getByRole('textbox',{name:'用户名'}),'Demo');
  await u.type(screen.getByLabelText('密码',{exact:true}),'wrong');
  await u.click(screen.getByRole('button',{name:'登录系统'}));
  expect(screen.getByRole('alert')).toHaveTextContent('用户名或密码错误');
  await u.click(screen.getByRole('button',{name:'显示密码'}));
  expect(screen.getByLabelText('密码',{exact:true})).toHaveAttribute('type','text');
  await u.clear(screen.getByLabelText('密码',{exact:true}));
  await u.type(screen.getByLabelText('密码',{exact:true}),'demo123{Enter}');
  expect(window.location.hash).toBe('#/results/1');
  expect(sessionStorage.getItem('geobank-demo-logged-out')).toBeNull();
  expect(sessionStorage.getItem('geobank-demo-ui-v1')).not.toContain('demo123');
 });
 it('Alt Q 在输入框或弹窗内无效，在页面可退出',async()=>{
  const u=userEvent.setup();render(<App/>);
  const input=screen.getByRole('textbox',{name:'搜索项目'});
  fireEvent.keyDown(input,{key:'q',code:'KeyQ',altKey:true});
  expect(screen.queryByRole('heading',{name:'欢迎登录'})).not.toBeInTheDocument();
  await u.click(screen.getByRole('button',{name:'新建项目'}));
  fireEvent.keyDown(document.body,{key:'q',code:'KeyQ',altKey:true});
  expect(screen.getByRole('dialog',{name:'新建项目'})).toBeInTheDocument();
  await u.click(screen.getByRole('button',{name:'取消'}));
  fireEvent.keyDown(document.body,{key:'q',code:'KeyQ',altKey:true});
  expect(screen.getByRole('heading',{name:'欢迎登录'})).toBeInTheDocument();
 });
});
