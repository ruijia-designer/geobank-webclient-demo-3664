import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppApi, AppState } from '../types';
import { initialState } from '../services/demo';
import { demoRows } from '../services/baseline';
import { getBasinOptions, getProjectTypeOptions, projectTypeColor, projectTypeLabel } from '../services/projectClassification';
import OverviewPage from './OverviewPage';
import ApprovalPage from './ApprovalPage';

const original = structuredClone(demoRows);
let api: AppApi;
const navigate=vi.fn(), openProject=vi.fn();
function Harness({approval=false}:{approval?:boolean}) {
  const [state,setState] = useState<AppState>(()=>initialState('admin'));
  api={state,setState,navigate,openProject,notify:vi.fn(),deny:vi.fn()};
  return approval?<ApprovalPage api={api}/>:<OverviewPage api={api}/>;
}
class TestPointerEvent extends MouseEvent {
  readonly pointerId:number;
  constructor(type:string,init:PointerEventInit={}) {super(type,init);this.pointerId=init.pointerId??1;}
}
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('innerWidth',1920);vi.stubGlobal('PointerEvent',TestPointerEvent);Object.assign(demoRows,structuredClone(original));});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();Object.assign(demoRows,structuredClone(original));});

describe('概览及客户联动要求',()=>{
  it('未归档以打开的锁图标标识，所有项目使用实色色条并保留类型提示',async()=>{
    const user=userEvent.setup();const {container}=render(<Harness/>);
    expect(screen.queryByText('未归档')).not.toBeInTheDocument();
    expect(api.state.projects.filter(project=>!project.archived&&project.id!=='current')).toHaveLength(3);
    expect(screen.getAllByRole('img',{name:'未归档'})).toHaveLength(3);
    expect(container.querySelectorAll('.project-stripe')).toHaveLength(6);
    expect(container.querySelector('.project-stripe')).toHaveAttribute('title','三维陆上常规采集');
    expect(screen.getAllByText('可查阅')).toHaveLength(3);
    const first=container.querySelector('.project-stripe-type') as HTMLElement;
    expect(first.style.color).toBe('rgb(76, 146, 181)');
    await user.click(screen.getByRole('button',{name:'配色方式'}));
    expect(screen.queryByRole('img',{name:'未归档'})).not.toBeInTheDocument();
    expect(screen.queryByText('可查阅')).not.toBeInTheDocument();
    expect(screen.queryByText('未归档')).not.toBeInTheDocument();
    expect(container.querySelector('.project-stripe')).not.toBeInTheDocument();
  });

  it('列表拖拽限制260–640，键盘微调；收起再展开保留宽度，重新挂载恢复默认',async()=>{
    const user=userEvent.setup();const {container,rerender}=render(<Harness/>);
    const root=()=>container.querySelector('.overview-page') as HTMLElement;
    const handle=()=>screen.getByRole('separator',{name:'调整项目列表宽度'});
    expect(root().style.getPropertyValue('--overview-sidebar-width')).toBe('390px');
    fireEvent.pointerDown(handle(),{button:0,pointerId:1,clientX:390});
    expect(root()).toHaveClass('is-resizing');
    fireEvent.pointerMove(handle(),{pointerId:1,clientX:1000});
    fireEvent.pointerUp(handle(),{pointerId:1,clientX:1000});
    expect(handle()).toHaveAttribute('aria-valuenow','640');
    expect(root()).not.toHaveClass('is-resizing');
    fireEvent.keyDown(handle(),{key:'ArrowLeft'});expect(handle()).toHaveAttribute('aria-valuenow','630');
    await user.click(screen.getByRole('button',{name:'收起项目列表'}));
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'展开项目列表'}));
    expect(handle()).toHaveAttribute('aria-valuenow','630');
    fireEvent.pointerDown(handle(),{button:0,pointerId:1,clientX:630});
    fireEvent.pointerUp(handle(),{pointerId:1,clientX:0});expect(handle()).toHaveAttribute('aria-valuenow','260');
    rerender(<div/>);rerender(<Harness/>);expect(handle()).toHaveAttribute('aria-valuenow','390');
  });

  it('新建先选基准盆地，仅最末级类型可选，成功创建携带分类与盆地',async()=>{
    demoRows.types.push({id:'third',parent:'2',name:'三级采集演示',level:3,color:'#123456'});
    demoRows.structure.push({id:'basin-new',name:'新增基准盆地',type:'盆地',level:1});
    const user=userEvent.setup();render(<Harness/>);
    await user.click(screen.getByRole('button',{name:'新建项目'}));
    const modal=screen.getByRole('dialog');
    await user.click(within(modal).getByRole('button',{name:'确定'}));
    expect(within(modal).getByRole('alert')).toHaveTextContent('所属盆地和最末级项目类型');
    await user.type(within(modal).getByLabelText('项目名称'),'分类联动演示');
    await user.selectOptions(within(modal).getByLabelText('所属盆地'),'新增基准盆地');
    await user.click(within(modal).getByRole('button',{name:'项目类型'}));
    expect(screen.getByRole('option',{name:'采集'})).toBeDisabled();
    expect(screen.getByRole('option',{name:'采集 / 三维陆上常规采集'})).toBeDisabled();
    await user.click(screen.getByRole('option',{name:'采集 / 三维陆上常规采集 / 三级采集演示'}));
    await user.click(within(modal).getByRole('button',{name:'确定'}));
    const created=api.state.projects.at(-1)!;
    expect(created).toMatchObject({name:'分类联动演示',basin:'新增基准盆地',type:'三级采集演示',typeId:'third',typePath:['采集','三维陆上常规采集','三级采集演示'],archived:false});
    expect(navigate).toHaveBeenCalledWith({page:'results',projectId:created.id});
    expect(getProjectTypeOptions().find(type=>type.id==='third')).toMatchObject({leaf:true,level:3});
    expect(projectTypeColor(created)).toBe('#123456');expect(getBasinOptions()).toContain('新增基准盆地');
  });

  it('审批侧栏和类型下拉显示简化名称，筛选值保持原类型',async()=>{
    const user=userEvent.setup();render(<Harness approval/>);
    for(const name of ['归档审批','解档审批','下载审批']){
      expect(screen.getByRole('button',{name})).toBeVisible();
      expect(screen.getByRole('option',{name})).toBeInTheDocument();
    }
    expect(screen.queryByRole('button',{name:'项目归档审批'})).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('审批类型'),'archive');
    expect(api.state.approval.type).toBe('archive');
  });

  it('检索排除已定位项目后，浮动详情与地图选择同时清除',async()=>{
    const user=userEvent.setup();render(<Harness/>);
    await user.click(screen.getByRole('button',{name:'定位项目：2024年山西省左权西乡处理项目'}));
    expect(screen.getByRole('region',{name:'项目详情'})).toBeVisible();
    await user.type(screen.getByRole('textbox',{name:'搜索项目'}),'2023年C');
    expect(screen.queryByRole('region',{name:'项目详情'})).not.toBeInTheDocument();
    expect(api.state.selectedProjectId).toBeNull();expect(api.state.mapZoom).toBe(1);
  });

  it('临时基准类型刷新消失后仍按保留的路径回退一级颜色',()=>{
    expect(projectTypeColor({type:'常规',typeId:'custom-removed',typePath:['采集','陆上','常规']})).toBe('#277DA8');
    expect(projectTypeColor({type:'常规',typePath:['非地震','井筒参考']})).toBe('#647C97');
  });

  it('类型标签只显示所属大类，保留存储中的完整末级名称',()=>{
    const project={type:'三维陆上常规采集',typeId:'2',typePath:['采集','三维陆上常规采集']};
    expect(projectTypeLabel(project)).toBe('采集');expect(project.type).toBe('三维陆上常规采集');
    expect(projectTypeLabel({type:'三维陆上处理'})).toBe('处理');
    expect(projectTypeLabel({type:'非地震井筒参考'})).toBe('非地震');
    expect(projectTypeLabel({type:'自定义末级',typePath:['解释','自定义末级']})).toBe('解释');
  });

  it('新建类型列表浮在表单上层，底部空间不足向上展开，Esc先收起列表',async()=>{
    vi.stubGlobal('innerHeight',600);
    vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
      return this.matches('.select-trigger')?{left:100,right:700,top:500,bottom:542,width:600,height:42,x:100,y:500,toJSON:()=>({})}:
        {left:0,right:1920,top:0,bottom:600,width:1920,height:600,x:0,y:0,toJSON:()=>({})};
    });
    const user=userEvent.setup();render(<Harness/>);
    await user.click(screen.getByRole('button',{name:'新建项目'}));
    const modal=screen.getByRole('dialog'),trigger=within(modal).getByRole('button',{name:'项目类型'});
    await user.click(trigger);
    const list=within(modal).getByRole('listbox',{name:'项目类型选项'});
    const popup=list.parentElement!;
    expect(popup.style.left).toBe('100px');expect(popup.style.width).toBe('600px');
    expect(Number.parseFloat(popup.style.top)).toBeLessThan(500);
    expect(within(list).getByRole('option',{name:'处理'})).toBeDisabled();
    expect(within(list).getByRole('option',{name:'处理 / 二维处理'})).toBeEnabled();
    const initialTop=popup.style.top,initialHeight=popup.style.height;
    expect(Number.parseFloat(initialTop)+Number.parseFloat(initialHeight)).toBe(496);
    const search=within(modal).getByRole('searchbox',{name:'搜索项目类型'});
    await user.type(search,'处理 / 二维处理');
    expect(within(list).getAllByRole('option')).toHaveLength(1);
    expect(popup.style.top).toBe(initialTop);expect(popup.style.height).toBe(initialHeight);
    await user.clear(search);await user.type(search,'不存在的类型');
    expect(within(modal).getByRole('status')).toHaveTextContent('无匹配项目类型');
    expect(popup.style.top).toBe(initialTop);expect(popup.style.height).toBe(initialHeight);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();expect(modal).toBeVisible();expect(trigger).toHaveFocus();
    await user.click(trigger);await user.click(within(modal).getByLabelText('项目名称'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('新建项目按完整类型路径搜索，空结果保留表单，重新打开恢复全部选项',async()=>{
    const user=userEvent.setup();render(<Harness/>);
    await user.click(screen.getByRole('button',{name:'新建项目'}));
    const modal=screen.getByRole('dialog'),trigger=within(modal).getByRole('button',{name:'项目类型'});
    await user.type(within(modal).getByLabelText('项目名称'),'搜索类型演示');
    await user.click(trigger);
    const search=within(modal).getByRole('searchbox',{name:'搜索项目类型'});
    expect(search).toHaveFocus();
    await user.type(search,' 处理 ');
    expect(screen.getByRole('option',{name:'处理'})).toBeDisabled();
    expect(screen.getByRole('option',{name:'处理 / 二维处理'})).toBeEnabled();
    expect(screen.queryByRole('option',{name:'采集'})).not.toBeInTheDocument();
    await user.clear(search);await user.type(search,'不存在的类型');
    expect(within(modal).getByRole('status')).toHaveTextContent('无匹配项目类型');
    expect(within(modal).getByLabelText('项目名称')).toHaveValue('搜索类型演示');
    await user.clear(search);await user.type(search,'处理 / 二维处理');
    await user.click(screen.getByRole('option',{name:'处理 / 二维处理'}));
    expect(trigger).toHaveTextContent('处理 / 二维处理');expect(trigger).toHaveFocus();
    await user.click(trigger);
    expect(within(modal).getByRole('searchbox',{name:'搜索项目类型'})).toHaveValue('');
    expect(screen.getByRole('option',{name:'采集'})).toBeVisible();
    expect(screen.getByRole('option',{name:'处理 / 二维处理'})).toHaveAttribute('aria-selected','true');
  });
});
