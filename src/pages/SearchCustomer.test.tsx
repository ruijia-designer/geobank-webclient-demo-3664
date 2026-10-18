import {useState} from 'react';
import {beforeEach,describe,expect,it,vi} from 'vitest';
import {render,screen,within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchPage from './SearchPage';
import {LanguageProvider,useTranslation} from '../i18n';
import {initialState,SEARCH_RECORDS} from '../services/demo';
import type {AppApi,AppState} from '../types';
let lastApi:AppApi;
const notify=vi.fn();
function SearchHarness(){const [state,setState]=useState<AppState>(()=>initialState('admin'));const api:AppApi={state,setState,navigate:vi.fn(),notify,deny:vi.fn(),openProject:vi.fn()};lastApi=api;return <SearchPage api={api}/>;}
function Switch(){const {setLocale}=useTranslation();return <><button onClick={()=>setLocale('en')}>Switch English</button><button onClick={()=>setLocale('zh')}>切换中文</button></>;}
beforeEach(()=>{sessionStorage.removeItem('geobank-demo-locale');vi.clearAllMocks();});
describe('检索中英文状态一致性',()=>{
 it('英文切换只改UI，字段option、查询输入、筛选业务值与结果保持',async()=>{
  const user=userEvent.setup();render(<LanguageProvider><Switch/><SearchHarness/></LanguageProvider>);
  await user.click(screen.getByRole('checkbox',{name:/2024/}));
  await user.selectOptions(screen.getByLabelText('检索字段'),'basin');
  await user.type(screen.getByLabelText('检索关键词'),'沁水盆地{Enter}');
  await user.click(screen.getByRole('button',{name:'Switch English'}));
  expect(screen.getByRole('heading',{name:'Data search'})).toBeVisible();
  expect(screen.getByLabelText('Search field')).toHaveValue('basin');expect(screen.getByLabelText('Search field')).toHaveDisplayValue('Basin / work area');
  expect(screen.getByLabelText('Search keyword')).toHaveValue('沁水盆地');expect(screen.getByLabelText('Project result count')).toHaveTextContent('1');
  expect(lastApi.state.search).toMatchObject({field:'basin',query:'沁水盆地',draft:'沁水盆地',filters:{year:['2024']}});
  expect(screen.getByRole('heading',{name:SEARCH_RECORDS[0].name})).toBeVisible();
  expect(screen.getByText('1–1 of 1 results')).toBeVisible();
  await user.click(screen.getByRole('button',{name:'切换中文'}));
  expect(screen.getByLabelText('检索字段')).toHaveDisplayValue('盆地/工区');expect(screen.getByLabelText('检索关键词')).toHaveValue('沁水盆地');
  expect(screen.getByRole('checkbox',{name:/2024/})).toBeChecked();
 });
 it('英文试试保留中文查询值，AI摘要、参数弹窗及取消筛选均可用',async()=>{
  const user=userEvent.setup();render(<LanguageProvider><Switch/><SearchHarness/></LanguageProvider>);
  await user.click(screen.getByRole('button',{name:'Switch English'}));
  await user.click(within(screen.getByLabelText('Suggested searches')).getByRole('button',{name:'Project type'}));
  expect(screen.getByLabelText('Search field')).toHaveValue('type');expect(screen.getByLabelText('Search keyword')).toHaveValue('解释项目');
  expect(lastApi.state.search.query).toBe('解释项目');
  expect(screen.getByText(/Found 2 projects\. Project types: Interpretation project\. Survey dimensions: 3D\./)).toBeVisible();
  await user.click(screen.getByRole('checkbox',{name:/2024/}));
  expect(screen.getByRole('button',{name:'Remove filter 2024'})).toBeVisible();
  await user.click(screen.getByRole('button',{name:'Remove filter 2024'}));expect(screen.getByLabelText('Project result count')).toHaveTextContent('2');
  await user.click(screen.getAllByRole('button',{name:'View parameters'})[0]);
  const dialog=screen.getByRole('dialog',{name:'Project parameters'});expect(within(dialog).getByText('沁水盆地')).toBeVisible();expect(within(dialog).getByText('Interpretation project')).toBeVisible();
  await user.click(within(dialog).getAllByRole('button',{name:'Close'}).at(-1)!);
  await user.click(screen.getByRole('switch',{name:'AI search'}));expect(screen.queryByText('AI summary')).not.toBeInTheDocument();
 });
});
