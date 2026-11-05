import {useState} from 'react';
import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from 'vitest';
import {fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultsPage from './ResultsPage';
import BaselinePage from './BaselinePage';
import {LanguageProvider} from '../i18n';
import {initialState} from '../services/demo';
import {PROJECT_TYPE_CATALOG_ROWS,getProjectTypeCatalogRows,saveProjectTypeCatalogRows} from '../services/projectTypeCatalog';
import {resultInfoCache} from '../services/results';
import type {AppApi,AppState} from '../types';

beforeAll(()=>{vi.stubGlobal('ResizeObserver',class{observe(){}unobserve(){}disconnect(){}});});
afterAll(()=>vi.unstubAllGlobals());

function Harness({baseline=false}:{baseline?:boolean}){
 const [state,setState]=useState<AppState>(()=>({...initialState('admin'),route:{page:baseline?'baseline':'results',section:baseline?'types':undefined}}));
 const api:AppApi={state,setState,navigate:vi.fn(),notify:vi.fn(),deny:vi.fn(),openProject:vi.fn()};
 return <LanguageProvider>{baseline?<BaselinePage api={api}/>:<ResultsPage api={api}/>}</LanguageProvider>;
}
beforeEach(()=>{sessionStorage.removeItem('geobank-demo-locale');delete resultInfoCache.current;saveProjectTypeCatalogRows(PROJECT_TYPE_CATALOG_ROWS);});

function expectFieldError(input:HTMLElement,message:string){
 expect(input).toHaveAttribute('aria-invalid','true');
 const error=document.getElementById(input.getAttribute('aria-describedby')!);
 expect(error).toHaveTextContent(message);
 expect(input.closest('dd,label,form')).toContainElement(error);
}

describe('字段旁的编辑反馈',()=>{
 it('项目信息一次标出全部错误，定位首个字段，修正后分别清除',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  await user.click(screen.getByRole('button',{name:'编辑'}));
  const name=screen.getByLabelText('项目名称'), year=screen.getByLabelText('年度'), count=screen.getByLabelText('井数');
  await user.clear(name);fireEvent.change(year,{target:{value:'123'}});fireEvent.change(count,{target:{value:'-1'}});
  await user.click(screen.getByRole('button',{name:'保存'}));
  expect(name).toHaveFocus();expectFieldError(name,'请输入项目名称');expectFieldError(year,'四位数字');expectFieldError(count,'非负数');
  expect(resultInfoCache.current).toBeUndefined();
  await user.type(name,'字段反馈测试');
  expect(name).not.toHaveAttribute('aria-invalid');expectFieldError(year,'四位数字');
  fireEvent.change(year,{target:{value:'2026'}});fireEvent.change(count,{target:{value:'2.5'}});
  expect(year).not.toHaveAttribute('aria-invalid');expectFieldError(count,'非负整数');
  fireEvent.change(count,{target:{value:'2'}});expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'保存'}));
  expect(resultInfoCache.current).toMatchObject({name:'字段反馈测试',year:'2026',wellCount:'2'});
 });
 it('日期关联校验可通过修正起始日期清除，取消后不保留错误',async()=>{
  const user=userEvent.setup();render(<Harness/>);await user.click(screen.getByRole('button',{name:'编辑'}));
  const start=screen.getByLabelText('起始日期'),end=screen.getByLabelText('结束日期');
  fireEvent.change(end,{target:{value:'2023-01-01'}});await user.click(screen.getByRole('button',{name:'保存'}));
  expect(end).toHaveFocus();expectFieldError(end,'结束日期不能早于');
  fireEvent.change(start,{target:{value:'2022-01-01'}});expect(end).not.toHaveAttribute('aria-invalid');
  fireEvent.change(start,{target:{value:'2025-01-01'}});await user.click(screen.getByRole('button',{name:'保存'}));
  await user.click(screen.getByRole('button',{name:'取消'}));await user.click(screen.getByRole('button',{name:'编辑'}));
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();expect(screen.getByLabelText('结束日期')).not.toHaveAttribute('aria-invalid');
  expect(resultInfoCache.current).toBeUndefined();
 });
 it('Element拒绝非法颜色且关闭重开保留最后确认的颜色',async()=>{
  const user=userEvent.setup();render(<Harness baseline/>);
  const original=getProjectTypeCatalogRows()[0].color;
  const trigger=await screen.findByRole('button',{name:'修改采集颜色'});
  await user.click(trigger.querySelector<HTMLElement>('.el-color-picker__trigger')!);
  let panel=await screen.findByRole('dialog');
  let color=within(panel).getByRole('textbox');
  await user.clear(color);await user.type(color,'not-a-color');
  await user.click(within(panel).getByRole('button',{name:'确定'}));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(getProjectTypeCatalogRows()[0].color).toBe(original);
  expect(trigger.closest('td')).toHaveTextContent(String(original));
  trigger.focus();await user.keyboard('{Enter}');
  panel=await screen.findByRole('dialog');color=within(panel).getByRole('textbox');
  expect(color).toHaveValue(String(original).toLowerCase());
  await user.clear(color);await user.type(color,'#123ABC');
  await user.click(within(panel).getByRole('button',{name:'确定'}));
  await waitFor(()=>expect(getProjectTypeCatalogRows()[0].color).toBe('#123ABC'));
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  trigger.focus();await user.keyboard('{Enter}');
  panel=await screen.findByRole('dialog');color=within(panel).getByRole('textbox');
  await user.clear(color);await user.type(color,'not-a-color');await user.keyboard('{Escape}');
  await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  expect(getProjectTypeCatalogRows()[0].color).toBe('#123ABC');
 });
});
