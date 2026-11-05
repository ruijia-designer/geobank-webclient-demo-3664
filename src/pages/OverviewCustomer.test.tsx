import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppApi, AppState } from '../types';
import { initialState } from '../services/demo';
import { demoRows } from '../services/baseline';
import { getBasinOptions, projectTypeColor, projectTypeLabel } from '../services/projectClassification';
import { PROJECT_TYPE_CATALOG_ROWS, getCreationProjectTypeOptions, saveProjectTypeCatalogRows } from '../services/projectTypeCatalog';
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
beforeEach(()=>{vi.clearAllMocks();vi.stubGlobal('innerWidth',1920);vi.stubGlobal('PointerEvent',TestPointerEvent);Object.assign(demoRows,structuredClone(original));saveProjectTypeCatalogRows(structuredClone(PROJECT_TYPE_CATALOG_ROWS));});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();Object.assign(demoRows,structuredClone(original));saveProjectTypeCatalogRows(structuredClone(PROJECT_TYPE_CATALOG_ROWS));});

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

  it('新建使用新分类，采集二级必选，成功创建仅追加新项目并保留全部旧数据',async()=>{
    demoRows.structure.push({id:'basin-new',name:'新增基准盆地',type:'盆地',level:1});
    const user=userEvent.setup();render(<Harness/>);
    const before=structuredClone(api.state.projects),legacyTypes=structuredClone(demoRows.types);
    await user.click(screen.getByRole('button',{name:'新建项目'}));
    const modal=screen.getByRole('dialog');
    await user.click(within(modal).getByRole('button',{name:'确定'}));
    expect(within(modal).getByRole('alert')).toHaveTextContent('所属地区和项目类型');
    await user.type(within(modal).getByLabelText('名称'),'分类联动演示');
    await user.selectOptions(within(modal).getByLabelText('地区'),'新增基准盆地');
    await user.click(within(modal).getByRole('button',{name:'类型'}));
    expect(within(modal).getAllByRole('option').filter(option=>option.tagName==='BUTTON').map(option=>option.textContent)).toEqual(['采集','处理','解释','井筒','非地震']);
    const parent=screen.getByRole('option',{name:'采集'});
    expect(parent).toHaveAttribute('aria-expanded','false');
    await user.click(parent);
    expect(within(modal).getByRole('button',{name:'类型'})).toHaveTextContent('请选择项目类型');
    await user.click(within(modal).getByRole('button',{name:'确定'}));
    expect(api.state.projects).toEqual(before);
    expect(navigate).not.toHaveBeenCalled();
    await user.click(within(modal).getByRole('button',{name:'类型'}));
    await user.click(screen.getByRole('option',{name:'采集 / 陆上采集'}));
    await user.click(within(modal).getByRole('button',{name:'确定'}));
    const created=api.state.projects.at(-1)!;
    expect(created).toMatchObject({name:'分类联动演示',basin:'新增基准盆地',type:'陆上采集',typeId:getCreationProjectTypeOptions().find(option=>option.name==='陆上采集')!.id,typePath:['采集','陆上采集'],archived:false});
    expect(navigate).toHaveBeenCalledWith({page:'results',projectId:created.id});
    expect(api.state.projects.slice(0,-1)).toEqual(before);
    expect(demoRows.types).toEqual(legacyTypes);
    expect(getBasinOptions()).toContain('新增基准盆地');
  });

  it.each(['处理','解释','井筒'])('两种样式都可直接选择一级“%s”并创建',async name=>{
    const user=userEvent.setup();render(<Harness/>);
    for(const radio of [false,true]){
      await user.click(screen.getByRole('button',{name:'新建项目'}));
      const modal=screen.getByRole('dialog',{name:'新建项目'});
      await user.type(within(modal).getByLabelText('名称'),`${name}-${radio?'单选':'级联'}`);
      await user.selectOptions(within(modal).getByLabelText('地区'),'百色盆地');
      if(radio){
        await user.click(within(modal).getByRole('button',{name:'切换为分级单选'}));
        await user.click(within(modal).getByRole('button',{name:'类型'}));
        await user.click(within(modal).getByRole('radio',{name}));
        expect(within(modal).queryByRole('group',{name:'项目类型选项'})).not.toBeInTheDocument();
        expect(within(modal).getByRole('button',{name:'类型'})).toHaveTextContent(name);
      }else{
        await user.click(within(modal).getByRole('button',{name:'类型'}));
        await user.click(within(modal).getByRole('option',{name}));
        expect(within(modal).queryByRole('listbox')).not.toBeInTheDocument();
        expect(within(modal).getByRole('button',{name:'类型'})).toHaveTextContent(name);
      }
      await user.click(within(modal).getByRole('button',{name:'确定'}));
      expect(api.state.projects.at(-1)).toMatchObject({type:name,typePath:[name],typeId:getCreationProjectTypeOptions().find(option=>option.name===name)!.id});
    }
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
    const modal=screen.getByRole('dialog'),trigger=within(modal).getByRole('button',{name:'类型'});
    await user.click(trigger);
    const list=within(modal).getByRole('listbox',{name:'项目类型选项'});
    const popup=list.parentElement!;
    expect(popup.style.left).toBe('100px');expect(popup.style.width).toBe('600px');
    expect(Number.parseFloat(popup.style.top)).toBeLessThan(500);
    await user.click(within(list).getByRole('option',{name:'采集'}));
    expect(within(list).getByRole('option',{name:'采集'})).toHaveAttribute('aria-expanded','true');
    expect(within(list).getByRole('option',{name:'采集 / OBN采集'})).toBeEnabled();
    const initialTop=popup.style.top,initialHeight=popup.style.height;
    expect(Number.parseFloat(initialTop)+Number.parseFloat(initialHeight)).toBe(496);
    expect(within(modal).queryByRole('searchbox',{name:'搜索项目类型'})).not.toBeInTheDocument();
    expect(within(list).getByRole('option',{name:'采集 / OBN采集'})).toHaveTextContent(/^OBN采集$/);
    await user.click(within(list).getByRole('option',{name:'非地震'}));
    expect(within(list).getByRole('option',{name:'非地震'})).toHaveAttribute('aria-expanded','true');
    expect(within(list).getByRole('option',{name:'非地震 / 电法勘探'})).toBeEnabled();
    expect(within(list).queryByRole('option',{name:'采集 / OBN采集'})).not.toBeInTheDocument();
    expect(popup.style.top).toBe(initialTop);expect(popup.style.height).toBe(initialHeight);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();expect(modal).toBeVisible();expect(trigger).toHaveFocus();
    await user.click(trigger);await user.click(within(modal).getByLabelText('名称'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('新建项目移除类型搜索栏，逐级选择与重开保留表单和已选路径',async()=>{
    const user=userEvent.setup();render(<Harness/>);
    await user.click(screen.getByRole('button',{name:'新建项目'}));
    const modal=screen.getByRole('dialog'),trigger=within(modal).getByRole('button',{name:'类型'});
    await user.type(within(modal).getByLabelText('名称'),'类型选择演示');
    await user.click(trigger);
    expect(within(modal).queryByRole('searchbox',{name:'搜索项目类型'})).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await user.click(screen.getByRole('option',{name:'非地震'}));
    expect(screen.getByRole('option',{name:'非地震'})).toHaveAttribute('aria-expanded','true');
    expect(screen.getByRole('option',{name:'非地震 / 电法勘探'})).toBeEnabled();
    expect(screen.getByRole('option',{name:'采集'})).toBeVisible();
    expect(within(modal).getByLabelText('名称')).toHaveValue('类型选择演示');
    await user.click(screen.getByRole('option',{name:'非地震 / 电法勘探'}));
    expect(trigger).toHaveTextContent('非地震 / 电法勘探');expect(trigger).toHaveFocus();
    await user.click(trigger);
    expect(within(modal).queryByRole('searchbox',{name:'搜索项目类型'})).not.toBeInTheDocument();
    expect(screen.getByRole('option',{name:'采集'})).toBeVisible();
    expect(screen.getByRole('option',{name:'非地震 / 电法勘探'})).toHaveAttribute('aria-selected','true');
    expect(within(modal).getByLabelText('名称')).toHaveValue('类型选择演示');
  });

  it('级联分类可用方向键展开二级并回到父项，仅叶子确认选择',async()=>{
    const user=userEvent.setup();render(<Harness/>);
    await user.click(screen.getByRole('button',{name:'新建项目'}));
    const modal=screen.getByRole('dialog'),trigger=within(modal).getByRole('button',{name:'类型'});
    await user.click(trigger);
    await user.keyboard('{ArrowDown}');
    const root=screen.getByRole('option',{name:'采集'});
    expect(root).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    const leaf=screen.getByRole('option',{name:'采集 / 陆上采集'});
    expect(leaf).toHaveFocus();expect(leaf).toHaveTextContent(/^陆上采集$/);
    expect(trigger).toHaveTextContent('请选择项目类型');
    await user.keyboard('{ArrowLeft}');expect(root).toHaveFocus();
    await user.keyboard('{ArrowRight}{Enter}');
    expect(screen.queryByRole('listbox',{name:'项目类型选项'})).not.toBeInTheDocument();
    expect(trigger).toHaveTextContent('采集 / 陆上采集');
    await user.click(trigger);
    expect(screen.getByRole('option',{name:'采集 / 陆上采集'})).toHaveAttribute('aria-selected','true');
  });

  it('切换样式保留选择，切换一级清空原二级，取消重开恢复默认级联',async()=>{
    const user=userEvent.setup();render(<Harness/>);
    const before=structuredClone(api.state.projects);
    await user.click(screen.getByRole('button',{name:'新建项目'}));
    const modal=screen.getByRole('dialog'),trigger=within(modal).getByRole('button',{name:'类型'});
    await user.type(within(modal).getByLabelText('名称'),'切换样式演示');
    await user.selectOptions(within(modal).getByLabelText('地区'),'百色盆地');
    await user.click(trigger);
    await user.click(within(modal).getByRole('option',{name:'采集'}));
    await user.click(within(modal).getByRole('option',{name:'采集 / 陆上采集'}));
    await user.click(within(modal).getByRole('button',{name:'切换为分级单选'}));
    expect(trigger).toHaveTextContent('采集 / 陆上采集');
    expect(within(modal).queryByRole('radio')).not.toBeInTheDocument();
    await user.click(trigger);
    expect(within(modal).getByRole('radio',{name:'采集'})).toBeChecked();
    expect(within(modal).getByRole('radio',{name:'陆上采集'})).toBeChecked();
    await user.click(within(modal).getByRole('radio',{name:'非地震'}));
    expect(within(modal).getByRole('radio',{name:'非地震'})).toBeChecked();
    expect(within(modal).queryByRole('radio',{name:'陆上采集'})).not.toBeInTheDocument();
    expect(within(within(modal).getByRole('group',{name:'二级分类'})).getAllByRole('radio').some(radio=>(radio as HTMLInputElement).checked)).toBe(false);
    await user.click(within(modal).getByRole('button',{name:'确定'}));
    expect(within(modal).getByRole('alert')).toHaveTextContent('所属地区和项目类型');
    expect(api.state.projects).toEqual(before);
    expect(within(modal).queryByRole('group',{name:'项目类型选项'})).not.toBeInTheDocument();
    await user.click(trigger);
    await user.click(within(modal).getByRole('radio',{name:'电法勘探'}));
    expect(trigger).toHaveTextContent('非地震 / 电法勘探');
    expect(within(modal).queryByRole('group',{name:'项目类型选项'})).not.toBeInTheDocument();
    await user.click(within(modal).getByRole('button',{name:'切换为级联选择'}));
    const restoredTrigger=within(modal).getByRole('button',{name:'类型'});
    expect(restoredTrigger).toHaveTextContent('非地震 / 电法勘探');
    await user.click(restoredTrigger);
    expect(within(modal).getByRole('option',{name:'非地震 / 电法勘探'})).toHaveAttribute('aria-selected','true');
    await user.keyboard('{Escape}');
    await user.click(within(modal).getByRole('button',{name:'切换为分级单选'}));
    await user.click(restoredTrigger);
    expect(within(modal).getByRole('radio',{name:'电法勘探'})).toBeChecked();
    await user.keyboard('{Escape}');
    expect(within(modal).queryByRole('group',{name:'项目类型选项'})).not.toBeInTheDocument();
    expect(modal).toBeVisible();
    expect(restoredTrigger).toHaveFocus();
    await user.click(within(modal).getByRole('button',{name:'取消'}));
    await user.click(screen.getByRole('button',{name:'新建项目'}));
    const reopened=screen.getByRole('dialog',{name:'新建项目'});
    expect(within(reopened).getByRole('button',{name:'切换为分级单选'})).toBeVisible();
    expect(within(reopened).queryByRole('radio')).not.toBeInTheDocument();
    expect(within(reopened).getByRole('button',{name:'类型'})).toHaveTextContent('请选择项目类型');
    expect(api.state.projects).toEqual(before);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('分级单选提交非地震二级时保存新类型和完整路径',async()=>{
    const user=userEvent.setup();render(<Harness/>);
    await user.click(screen.getByRole('button',{name:'新建项目'}));
    const modal=screen.getByRole('dialog',{name:'新建项目'});
    await user.type(within(modal).getByLabelText('名称'),'化探项目');
    await user.selectOptions(within(modal).getByLabelText('地区'),'百色盆地');
    await user.click(within(modal).getByRole('button',{name:'切换为分级单选'}));
    await user.click(within(modal).getByRole('button',{name:'类型'}));
    await user.click(within(modal).getByRole('radio',{name:'非地震'}));
    expect(within(within(modal).getByRole('group',{name:'二级分类'})).getAllByRole('radio').map(radio=>(radio as HTMLInputElement).value)).toEqual(
      ['重力勘探','磁力勘探','电法勘探','化探','综合物化探'].map(name=>getCreationProjectTypeOptions().find(option=>option.name===name)!.id),
    );
    await user.click(within(modal).getByRole('radio',{name:'化探'}));
    await user.click(within(modal).getByRole('button',{name:'确定'}));
    expect(api.state.projects.at(-1)).toMatchObject({name:'化探项目',type:'化探',typePath:['非地震','化探'],typeId:getCreationProjectTypeOptions().find(option=>option.name==='化探')!.id});
  });
});
