import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppApi, AppState, Project, Route } from '../types';
import { CURRENT_PROJECT, initialState } from '../services/demo';
import { forgetResultFileSource, getResultFileSource } from '../services/resultPreview';
import { resultDownloadsCache, resultFilesCache, resultInfoCache } from '../services/results';
import type { ResultFile } from '../services/results';
import ResultsPage from './ResultsPage';

const projectA:Project={...CURRENT_PROJECT,id:'preview-project-a',name:'预览测试项目甲'};
const projectB:Project={...CURRENT_PROJECT,id:'preview-project-b',name:'预览测试项目乙'};
const newProject:Project={...CURRENT_PROJECT,id:'created-preview-test',name:'新建文本预览项目'};
const firstFile:ResultFile={id:'preview-file-a',name:'井A.las',format:'las',size:'1 KB',directory:'测井数据',uploaded:'2026-10-29 10:00:00',user:'上传人甲'};
const secondFile:ResultFile={...firstFile,id:'preview-file-b',name:'井B.las',size:'2 KB',uploaded:'2026-10-29 11:00:00',user:'上传人乙'};
let lastState:AppState;

function Harness({project=projectA}:{project?:Project}){
  const [state,setState]=useState<AppState>(()=>({...initialState('admin'),projects:[projectA,projectB,newProject],
    currentProjectId:project.id,route:{page:'results',projectId:project.id,section:'wells'}}));
  lastState=state;
  const navigate=(route:Route)=>setState(previous=>({...previous,route,currentProjectId:route.projectId||previous.currentProjectId}));
  const api:AppApi={state,setState,navigate,notify:vi.fn(),deny:vi.fn(),openProject:vi.fn()};
  return <ResultsPage api={api}/>;
}

function tabbar(container:HTMLElement){return within(container.querySelector('.result-tabs') as HTMLElement);}
function fileTable(){return within(screen.getByRole('table',{name:'成果文件列表'}));}
function previewFacts(name:string){return within(screen.getByRole('region',{name})).getAllByRole('definition').map(item=>item.textContent);}
function clearCaches(){
  for(const [projectId,files] of Object.entries(resultFilesCache))for(const file of files)forgetResultFileSource(projectId,file.id);
  for(const cache of [resultFilesCache,resultInfoCache,resultDownloadsCache])for(const id of Object.keys(cache))delete cache[id];
}
async function selectProject(user:ReturnType<typeof userEvent.setup>,from:Project,to:Project){
  await user.click(screen.getByRole('button',{name:from.name}));
  await user.click(within(screen.getByRole('listbox',{name:'项目'})).getByRole('option',{name:new RegExp(to.name)}));
}

beforeEach(()=>{
  sessionStorage.removeItem('geobank-demo-locale');
  clearCaches();
  resultFilesCache[projectA.id]=[{...firstFile},{...secondFile}];
  resultFilesCache[projectB.id]=[{...firstFile,name:'项目乙独立文件.las',user:'项目乙上传人'}];
});
afterEach(clearCaches);

describe('成果文件右侧标签预览',()=>{
  it.each(['眼睛按钮','文件名'])('%s 打开正确文件的右侧预览和元数据，不出现查看弹窗',async entry=>{
    const user=userEvent.setup();const {container}=render(<Harness/>);
    await user.click(fileTable().getByRole('button',{name:entry==='眼睛按钮'?'查看'+firstFile.name:firstFile.name}));
    expect(tabbar(container).getByRole('button',{name:firstFile.name})).toHaveAttribute('aria-current','page');
    expect(within(container.querySelector('.result-right-content') as HTMLElement).getByRole('heading',{name:firstFile.name})).toBeVisible();
    expect(previewFacts(firstFile.name)).toEqual(['LAS','测井数据',projectA.name,'1 KB',firstFile.uploaded,firstFile.user]);
    expect(screen.queryByRole('dialog',{name:'查看文件'})).not.toBeInTheDocument();
    expect(screen.getByRole('table',{name:'成果文件列表'})).toBeVisible();
  });

  it('重复查看同一文件复用标签，同名不同 ID 的文件各自保留正确元数据',async()=>{
    const user=userEvent.setup();
    resultFilesCache[projectA.id]=[{...firstFile},{...secondFile,name:firstFile.name}];
    const {container}=render(<Harness/>);
    const files=fileTable().getAllByRole('button',{name:firstFile.name});
    await user.click(files[0]);
    await user.click(files[0]);
    expect(tabbar(container).getAllByRole('button',{name:firstFile.name})).toHaveLength(1);
    await user.click(files[1]);
    const tabs=tabbar(container).getAllByRole('button',{name:firstFile.name});
    expect(tabs).toHaveLength(2);
    expect(tabs[1]).toHaveAttribute('aria-current','page');
    expect(previewFacts(firstFile.name)).toContain(secondFile.user);
    expect(previewFacts(firstFile.name)).toContain(secondFile.size);
    await user.click(tabs[0]);
    expect(tabs[0]).toHaveAttribute('aria-current','page');
    expect(previewFacts(firstFile.name)).toContain(firstFile.user);
    expect(previewFacts(firstFile.name)).toContain(firstFile.size);
  });

  it('关闭当前文件标签回到前一个文件，关闭的文件仍可重新打开',async()=>{
    const user=userEvent.setup();const {container}=render(<Harness/>);
    await user.click(fileTable().getByRole('button',{name:firstFile.name}));
    await user.click(fileTable().getByRole('button',{name:secondFile.name}));
    await user.click(tabbar(container).getByRole('button',{name:'关闭'+secondFile.name}));
    expect(tabbar(container).queryByRole('button',{name:secondFile.name})).not.toBeInTheDocument();
    expect(tabbar(container).getByRole('button',{name:firstFile.name})).toHaveAttribute('aria-current','page');
    expect(screen.getByRole('region',{name:firstFile.name})).toBeVisible();
    await user.click(fileTable().getByRole('button',{name:'查看'+secondFile.name}));
    expect(tabbar(container).getAllByRole('button',{name:secondFile.name})).toHaveLength(1);
    expect(tabbar(container).getByRole('button',{name:secondFile.name})).toHaveAttribute('aria-current','page');
    expect(screen.getByRole('region',{name:secondFile.name})).toBeVisible();
  });

  it('隐藏右侧成果视图后查看文件自动恢复分屏',async()=>{
    const user=userEvent.setup();const {container}=render(<Harness/>);
    await user.click(screen.getByRole('button',{name:'隐藏成果视图'}));
    expect(container.querySelector('.result-right-content')).not.toBeVisible();
    await user.click(fileTable().getByRole('button',{name:'查看'+firstFile.name}));
    expect(lastState.informationMaximized).toBe(false);
    expect(lastState.rightMaximized).toBe(false);
    expect(screen.getByRole('table',{name:'成果文件列表'})).toBeVisible();
    expect(screen.getByRole('region',{name:firstFile.name})).toBeVisible();
    expect(tabbar(container).getByRole('button',{name:firstFile.name})).toHaveAttribute('aria-current','page');
  });

  it('切换项目清除文件标签，同 ID 文件不会串用其他项目内容',async()=>{
    const user=userEvent.setup();const {container}=render(<Harness/>);
    await user.click(fileTable().getByRole('button',{name:firstFile.name}));
    await selectProject(user,projectA,projectB);
    expect(tabbar(container).queryByRole('button',{name:firstFile.name})).not.toBeInTheDocument();
    expect(tabbar(container).getByRole('button',{name:'成果概览'})).toHaveAttribute('aria-current','page');
    expect(screen.queryByRole('region',{name:firstFile.name})).not.toBeInTheDocument();
    await user.click(within(screen.getByRole('navigation',{name:'成果目录'})).getByRole('button',{name:'测井数据'}));
    await user.click(fileTable().getByRole('button',{name:'项目乙独立文件.las'}));
    expect(previewFacts('项目乙独立文件.las')).toContain(projectB.name);
    expect(previewFacts('项目乙独立文件.las')).toContain('项目乙上传人');
    await selectProject(user,projectB,projectA);
    expect(tabbar(container).queryByRole('button',{name:'项目乙独立文件.las'})).not.toBeInTheDocument();
    expect(tabbar(container).queryByRole('button',{name:firstFile.name})).not.toBeInTheDocument();
    expect(tabbar(container).getByRole('button',{name:'成果概览'})).toHaveAttribute('aria-current','page');
  });

  it('删除正在预览的文件关闭对应标签并返回成果概览',async()=>{
    const user=userEvent.setup();const {container}=render(<Harness/>);
    await user.click(fileTable().getByRole('button',{name:firstFile.name}));
    await user.click(fileTable().getByRole('button',{name:'删除'+firstFile.name}));
    await user.click(within(screen.getByRole('dialog',{name:'删除文件'})).getByRole('button',{name:'确认删除'}));
    expect(tabbar(container).queryByRole('button',{name:firstFile.name})).not.toBeInTheDocument();
    expect(tabbar(container).getByRole('button',{name:'成果概览'})).toHaveAttribute('aria-current','page');
    expect(screen.queryByRole('region',{name:firstFile.name})).not.toBeInTheDocument();
    expect(fileTable().queryByRole('button',{name:firstFile.name})).not.toBeInTheDocument();
    expect(resultFilesCache[projectA.id].map(file=>file.id)).toEqual([secondFile.id]);
  });

  it('新建项目上传文本后直接预览真实内容，删除时清理原始文件来源',async()=>{
    const user=userEvent.setup();const {container}=render(<Harness project={newProject}/>);
    await user.click(within(container.querySelector('.files-actions') as HTMLElement).getByRole('button',{name:'上传文件'}));
    await user.click(screen.getByRole('button',{name:'本地上传'}));
    const dialog=screen.getByRole('dialog',{name:'本地上传'});
    const content='项目实测数据\n井号: TEST-2026\n深度,电阻率\n100,42.6';
    await user.upload(within(dialog).getByLabelText('选择本地文件'),new File([content],'实测记录.txt',{type:'text/plain'}));
    await user.click(within(dialog).getByRole('button',{name:'上传'}));
    const uploaded=resultFilesCache[newProject.id][0];
    expect(uploaded.name).toBe('实测记录.txt');
    expect(getResultFileSource(newProject.id,uploaded.id)).toBeDefined();
    await user.click(fileTable().getByRole('button',{name:'实测记录.txt'}));
    expect(await screen.findByLabelText('文件文本内容')).toHaveTextContent('井号: TEST-2026');
    expect(screen.getByLabelText('文件文本内容').textContent).toBe(content);
    expect(tabbar(container).getByRole('button',{name:'实测记录.txt'})).toHaveAttribute('aria-current','page');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(fileTable().getByRole('button',{name:'删除实测记录.txt'}));
    await user.click(within(screen.getByRole('dialog',{name:'删除文件'})).getByRole('button',{name:'确认删除'}));
    expect(getResultFileSource(newProject.id,uploaded.id)).toBeUndefined();
    expect(tabbar(container).getByRole('button',{name:'成果概览'})).toHaveAttribute('aria-current','page');
  });
});
