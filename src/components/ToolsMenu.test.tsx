import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToolsMenu } from './ToolsMenu';
import type { Route } from '../types';

const resultsRoute:Route={page:'results',projectId:'current'};
const onOpen=vi.fn();

beforeEach(()=>{
  sessionStorage.removeItem('geobank-demo-locale');
  vi.clearAllMocks();
  vi.stubEnv('DEV',true);
});
afterEach(()=>vi.unstubAllEnvs());

describe('工具菜单的本地成果空态预览',()=>{
  it('切换预览和退出文案，关闭菜单并保留地址',async()=>{
    const user=userEvent.setup();
    const onToggle=vi.fn();
    function Harness(){
      const [active,setActive]=useState(false);
      return <ToolsMenu route={resultsRoute} onOpen={onOpen} resultsPreview={{active,onToggle:()=>{onToggle();setActive(value=>!value);}}}/>;
    }
    const href=window.location.href;
    render(<Harness/>);
    const trigger=screen.getByRole('button',{name:'工具'});
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem',{name:'预览无权限页面'}));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem',{name:'退出无权限预览'}));
    expect(onToggle).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(window.location.href).toBe(href);
  });

  it('按钮参与方向键、Home、End和Escape菜单导航',async()=>{
    const user=userEvent.setup(),onToggle=vi.fn();
    render(<ToolsMenu route={resultsRoute} onOpen={onOpen} resultsPreview={{active:false,onToggle}}/>);
    const trigger=screen.getByRole('button',{name:'工具'});
    trigger.focus();
    await user.keyboard('{ArrowUp}');
    const preview=screen.getByRole('menuitem',{name:'预览无权限页面'});
    expect(preview).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem',{name:'资产监控'})).toHaveFocus();
    await user.keyboard('{End}');
    expect(preview).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('menuitem',{name:'资产监控'})).toHaveFocus();
    await user.keyboard('{End}{Enter}');
    expect(onToggle).toHaveBeenCalledOnce();
    expect(trigger).toHaveFocus();
    await user.keyboard('{ArrowDown}{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('非成果页面或未提供预览控制时仅显示原有工具链接',async()=>{
    const user=userEvent.setup();
    const {rerender}=render(<ToolsMenu route={{page:'overview'}} onOpen={onOpen} resultsPreview={{active:false,onToggle:vi.fn()}}/>);
    await user.click(screen.getByRole('button',{name:'工具'}));
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    expect(screen.queryByRole('menuitem',{name:'预览无权限页面'})).not.toBeInTheDocument();
    rerender(<ToolsMenu route={resultsRoute} onOpen={onOpen}/>);
    await user.click(screen.getByRole('button',{name:'工具'}));
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });

  it('生产环境不展示预览入口',async()=>{
    vi.stubEnv('DEV',false);
    const user=userEvent.setup();
    render(<ToolsMenu route={resultsRoute} onOpen={onOpen} resultsPreview={{active:true,onToggle:vi.fn()}}/>);
    await user.click(screen.getByRole('button',{name:'工具'}));
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
    expect(screen.queryByRole('menuitem',{name:'退出无权限预览'})).not.toBeInTheDocument();
  });
});
