import {useState} from 'react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {render,screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchPage from './SearchPage';
import {LanguageProvider} from '../i18n';
import {initialState,SEARCH_RECORDS} from '../services/demo';
import type {AppApi,AppState} from '../types';

function Harness({initial=initialState('admin')}:{initial?:AppState}){
 const [state,setState]=useState(initial);
 const api:AppApi={state,setState,navigate:vi.fn(),notify:vi.fn(),deny:vi.fn(),openProject:vi.fn()};
 return <LanguageProvider><SearchPage api={api}/></LanguageProvider>;
}
beforeEach(()=>sessionStorage.removeItem('geobank-demo-locale'));

describe('检索分组多选',()=>{
 it('选择一个盆地后可继续选择另一个盆地，结果取并集且数量独立计算',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  await user.click(screen.getByRole('checkbox',{name:/沁水盆地/}));
  expect(screen.getByLabelText('项目结果数量')).toHaveTextContent('1');
  expect(screen.getByLabelText('渤海湾盆地检索结果数量')).toHaveTextContent('1');
  expect(screen.getByRole('checkbox',{name:/渤海湾盆地/})).not.toBeChecked();
  await user.click(screen.getByRole('checkbox',{name:/渤海湾盆地/}));
  expect(screen.getByLabelText('项目结果数量')).toHaveTextContent('2');
  expect(screen.getByRole('checkbox',{name:/沁水盆地/})).toBeChecked();
  expect(screen.getByRole('checkbox',{name:/渤海湾盆地/})).toBeChecked();
  for(const record of SEARCH_RECORDS)expect(screen.getByRole('heading',{name:record.name})).toBeVisible();
 });

 it('跨组条件无交集时保留已选零结果项，可直接取消以恢复结果',async()=>{
  const initial=initialState('admin');initial.search.filters={basin:['沁水盆地'],year:['2023']};
  const user=userEvent.setup();render(<Harness initial={initial}/>);
  expect(screen.getByText('暂无匹配项目')).toBeVisible();
  expect(screen.getByRole('checkbox',{name:/沁水盆地/})).toBeChecked();
  expect(screen.getByLabelText('沁水盆地检索结果数量')).toHaveTextContent('0');
  expect(screen.getByLabelText('渤海湾盆地检索结果数量')).toHaveTextContent('1');
  expect(screen.getByLabelText('2023检索结果数量')).toHaveTextContent('0');
  expect(screen.getByLabelText('2024检索结果数量')).toHaveTextContent('1');
  await user.click(screen.getByRole('checkbox',{name:/沁水盆地/}));
  expect(screen.getByLabelText('项目结果数量')).toHaveTextContent('1');
  expect(screen.getByRole('heading',{name:SEARCH_RECORDS[1].name})).toBeVisible();
  expect(screen.getByRole('checkbox',{name:/2023/})).toBeChecked();
  expect(screen.queryByRole('checkbox',{name:/沁水盆地/})).not.toBeInTheDocument();
 });

 it('候选数量遵守已提交关键词，保留被新查询排除的已选项',async()=>{
  const user=userEvent.setup();render(<Harness/>);
  await user.click(screen.getByRole('checkbox',{name:/沁水盆地/}));
  await user.selectOptions(screen.getByLabelText('检索字段'),'basin');
  await user.type(screen.getByLabelText('检索关键词'),'渤海湾');
  expect(screen.getByLabelText('沁水盆地检索结果数量')).toHaveTextContent('1');
  await user.keyboard('{Enter}');
  expect(screen.getByText('暂无匹配项目')).toBeVisible();
  expect(screen.getByLabelText('沁水盆地检索结果数量')).toHaveTextContent('0');
  expect(screen.getByLabelText('渤海湾盆地检索结果数量')).toHaveTextContent('1');
  await user.click(screen.getByRole('checkbox',{name:/沁水盆地/}));
  expect(screen.getByLabelText('项目结果数量')).toHaveTextContent('1');
  expect(screen.getByRole('heading',{name:SEARCH_RECORDS[1].name})).toBeVisible();
  expect(screen.queryByRole('checkbox',{name:/沁水盆地/})).not.toBeInTheDocument();
 });

 it('普通用户的候选及计数不包含无权限项目，已有选择只保留零计数用于取消',async()=>{
  const initial=initialState('ordinary');initial.search.filters={basin:['沁水盆地']};
  const user=userEvent.setup();render(<Harness initial={initial}/>);
  expect(screen.getByText('暂无匹配项目')).toBeVisible();
  expect(screen.getByRole('checkbox',{name:/沁水盆地/})).toBeChecked();
  expect(screen.getByLabelText('沁水盆地检索结果数量')).toHaveTextContent('0');
  expect(screen.queryByRole('checkbox',{name:/渤海湾盆地/})).not.toBeInTheDocument();
  expect(screen.queryByRole('checkbox',{name:/2024/})).not.toBeInTheDocument();
  for(const record of SEARCH_RECORDS)expect(screen.queryByRole('heading',{name:record.name})).not.toBeInTheDocument();
  await user.click(screen.getByRole('checkbox',{name:/沁水盆地/}));
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
 });
});
