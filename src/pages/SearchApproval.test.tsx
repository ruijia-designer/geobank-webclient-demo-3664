import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchPage from './SearchPage';
import ApprovalPage from './ApprovalPage';
import { initialState } from '../services/demo';
import type { AppApi, AppState } from '../types';

function Harness({page='search',initial=initialState('admin')}:{page?:'search'|'approval';initial?:AppState}) {
 const [state,setState]=useState(initial);
 const api:AppApi={state,setState,navigate:route=>setState(s=>({...s,route})),notify:vi.fn(),deny:vi.fn(),openProject:vi.fn()};
 return page==='search'?<SearchPage api={api}/>:<ApprovalPage api={api}/>;
}
function approvalState(section:string){const s=initialState('admin');s.route={page:'approval',section};return s}

describe('搜索的最终结果计数与交互',()=>{
 it('默认两条，零结果选项隐藏，计数来自最终结果',()=>{
  render(<Harness/>);
  expect(screen.getByLabelText('项目结果数量')).toHaveTextContent('2');
  expect(screen.getByLabelText('解释项目检索结果数量')).toHaveTextContent('2');
  expect(screen.getByLabelText('沁水盆地检索结果数量')).toHaveTextContent('1');
  expect(screen.getByLabelText('2024检索结果数量')).toHaveTextContent('1');
  expect(screen.queryByRole('checkbox',{name:/南襄盆地/})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'表格'})).not.toBeInTheDocument();
 });
 it('三个试试立即检索分别为1、2、1',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  for(const [button,count,field] of [['盆地名称','1','basin'],['项目类型','2','type'],['年度','1','year']]){
   await user.click(within(screen.getByLabelText('试试关键词')).getByRole('button',{name:button}));
   expect(screen.getByLabelText('项目结果数量')).toHaveTextContent(count);
   expect(screen.getByLabelText('检索字段')).toHaveValue(field);
  }
 });
 it('勾选组合立即更新且清空只清复选条件',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  await user.click(screen.getByRole('checkbox',{name:/2024/}));
  expect(screen.getByLabelText('项目结果数量')).toHaveTextContent('1');
  expect(screen.getByRole('checkbox',{name:/2023/})).toBeVisible();
  expect(screen.getByRole('checkbox',{name:/2023/})).not.toBeChecked();
  await user.click(screen.getByRole('checkbox',{name:/沁水盆地/}));
  expect(screen.getByLabelText('已选筛选条件')).toHaveTextContent('2024');
  await user.type(screen.getByLabelText('检索关键词'),'安13{Enter}');
  await user.click(screen.getByRole('button',{name:'清空'}));
  expect(screen.getByLabelText('检索关键词')).toHaveValue('安13');
  expect(screen.queryByLabelText('已选筛选条件')).not.toBeInTheDocument();
  expect(screen.getByLabelText('项目结果数量')).toHaveTextContent('1');
 });
 it('零结果中隐藏的已选条件可通过标签取消',async()=>{
  const user=userEvent.setup();const s=initialState('admin');s.search.filters={year:['2025']};render(<Harness initial={s}/>);
  expect(screen.getByText('暂无匹配项目')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'取消筛选 2025'})).toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'取消筛选 2025'}));
  expect(screen.getByLabelText('项目结果数量')).toHaveTextContent('2');
 });
 it('Enter关键词检索、AI关闭隐藏摘要，普通用户不可见未归档样例',async()=>{
  const user=userEvent.setup();const {unmount}=render(<Harness/>);
  await user.type(screen.getByLabelText('检索关键词'),'不匹配内容{Enter}');
  expect(screen.getByText('暂无匹配项目')).toBeInTheDocument();
  await user.click(screen.getByRole('switch',{name:'AI 搜索'}));
  expect(screen.queryByText('AI 智能总结')).not.toBeInTheDocument();
  unmount();render(<Harness initial={initialState('ordinary')}/>);
  expect(screen.getByText('暂无匹配项目')).toBeInTheDocument();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
 });
 it('查看参数与关闭使用真实对话框',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  await user.click(screen.getAllByRole('button',{name:'查看参数'})[0]);
  const dialog=screen.getByRole('dialog',{name:'项目参数'});
  expect(within(dialog).getByText('沁水盆地')).toBeInTheDocument();
  await user.keyboard('{Escape}');expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
 });
});

describe('审批关键词、类型、状态与详情',()=>{
 it('待我审批空态不显示共0条',()=>{
  render(<Harness page="approval" initial={approvalState('pending')}/>);
  expect(screen.getByText('暂无待审批记录')).toBeInTheDocument();
  expect(screen.queryByText(/共\s*0\s*条/)).not.toBeInTheDocument();
  expect(screen.getByLabelText('审批类型')).toHaveDisplayValue('全部类型');
 });
 it('已批支持关键词和类型组合，重置恢复；状态用单记录替代',async()=>{
  const user=userEvent.setup();render(<Harness page="approval" initial={approvalState('approved')}/>);
  await user.type(screen.getByLabelText('审批关键词'),'张室{Enter}');
  expect(screen.getByText('GD-20261004-0001')).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText('审批类型'),'download');
  expect(screen.getByText('暂无匹配记录')).toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'重置'}));
  await user.selectOptions(screen.getByLabelText('审批状态'),'rejected');
  expect(screen.getAllByText('GD-20261004-0001')).toHaveLength(1);
  expect(screen.getByText('已驳回',{selector:'span.badge'})).toBeInTheDocument();
  expect(screen.queryByRole('option',{name:'已撤销'})).not.toBeInTheDocument();
 });
 it('节点弹窗和归档12项明细可以打开并关闭',async()=>{
  const user=userEvent.setup();render(<Harness page="approval" initial={approvalState('approved')}/>);
  await user.click(screen.getByRole('button',{name:'室长审批（张室）'}));
  expect(screen.getByRole('dialog',{name:'室长审批'})).toHaveTextContent('manager');
  expect(screen.getByRole('dialog')).toHaveTextContent('2026-10-08 17:09');
  await user.keyboard('{Escape}');
  await user.click(screen.getByRole('button',{name:'查看详情'}));
  expect(within(screen.getByRole('dialog',{name:'项目归档审批详情'})).getAllByText('未录入',{selector:'.badge'})).toHaveLength(12);
  expect(screen.getByText('分方位叠加成果数据')).toBeInTheDocument();
 });
 it('抄送筛选未读，详情使记录已读，关键词可匹配发起人',async()=>{
  const user=userEvent.setup();render(<Harness page="approval" initial={approvalState('copy')}/>);
  await user.click(screen.getByRole('button',{name:'未读 (2)'}));
  expect(screen.getAllByRole('button',{name:'查看详情'})).toHaveLength(2);
  await user.click(screen.getAllByRole('button',{name:'查看详情'})[0]);
  expect(screen.getByRole('dialog')).toHaveTextContent('已读');
  await user.keyboard('{Escape}');
  expect(screen.getAllByRole('button',{name:'查看详情'})).toHaveLength(1);
  await user.click(screen.getByRole('button',{name:'重置'}));
  await user.type(screen.getByLabelText('审批关键词'),'张三{Enter}');
  expect(screen.getAllByRole('button',{name:'查看详情'})).toHaveLength(2);
 });
 it('已设计的订单撤销和模板列表保留，空白归档栏目保持空白',async()=>{
  const user=userEvent.setup();render(<Harness page="approval" initial={approvalState('orders')}/>);
  await user.click(screen.getByRole('button',{name:'撤销 DD-2026-0728-001'}));
  await user.click(screen.getByRole('button',{name:'确认撤销'}));
  expect(screen.queryByRole('button',{name:'撤销 DD-2026-0728-001'})).not.toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'流程配置'}));
  expect(screen.getByText('data-download.bpmn')).toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'归档审批'}));
  expect(screen.queryByText('下载订单')).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'查询'})).not.toBeInTheDocument();
 });
});
