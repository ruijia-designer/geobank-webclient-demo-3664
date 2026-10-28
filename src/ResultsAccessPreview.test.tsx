import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { resultFilesCache, resultInfoCache } from './services/results';

const emptyMessage='您无任何可查阅的项目，请联系系统管理员。';
beforeEach(()=>{
  sessionStorage.clear();
  sessionStorage.setItem('geobank-demo-authenticated-v1','true');
  window.history.replaceState(null,'','/#/results/0');
  [resultInfoCache,resultFilesCache].forEach(cache=>Object.keys(cache).forEach(key=>delete cache[key]));
});

async function togglePreview(user:ReturnType<typeof userEvent.setup>,active=false){
  await user.click(screen.getByRole('button',{name:'工具'}));
  await user.click(screen.getByRole('menuitem',{name:active?'退出无权限预览':'预览无权限页面'}));
}

describe('成果无权限样式预览',()=>{
  it('只切换显示，反复预览保留同一个表单和草稿，不修改地址或权限',async()=>{
    const user=userEvent.setup();render(<App/>);
    await user.click(screen.getByRole('button',{name:'编辑'}));
    const note=screen.getByRole('textbox',{name:'备注'});
    fireEvent.change(note,{target:{value:'切换预览仍保留的草稿'}});
    const savedState=sessionStorage.getItem('geobank-demo-ui-v1');
    for(let count=0;count<2;count++){
      await togglePreview(user);
      expect(screen.getByText(emptyMessage)).toBeVisible();
      expect(note).not.toBeVisible();
      expect(screen.queryByRole('button',{name:'上传成果'})).not.toBeInTheDocument();
      expect(screen.queryByRole('navigation',{name:'成果目录'})).not.toBeInTheDocument();
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(window.location.hash).toBe('#/results/0');
      expect(sessionStorage.getItem('geobank-demo-ui-v1')).toBe(savedState);
      await togglePreview(user,true);
      expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
      expect(screen.getByRole('textbox',{name:'备注'})).toBe(note);
      expect(note).toHaveValue('切换预览仍保留的草稿');
    }
    expect(resultInfoCache['0']).toBeUndefined();
  });

  it('预览中离开页面仍保护草稿，取消可继续编辑，保存后才离开',async()=>{
    const user=userEvent.setup();render(<App/>);
    await user.click(screen.getByRole('button',{name:'编辑'}));
    fireEvent.change(screen.getByRole('textbox',{name:'备注'}),{target:{value:'从预览中保存的草稿'}});
    await togglePreview(user);
    await user.click(screen.getByRole('button',{name:'概览'}));
    let dialog=screen.getByRole('dialog',{name:'未保存的修改'});
    expect(dialog).toBeVisible();
    await user.click(within(dialog).getByRole('button',{name:'继续编辑'}));
    expect(screen.getByRole('textbox',{name:'备注'})).toHaveValue('从预览中保存的草稿');
    await togglePreview(user);
    await user.click(screen.getByRole('button',{name:'概览'}));
    dialog=screen.getByRole('dialog',{name:'未保存的修改'});
    await user.click(within(dialog).getByRole('button',{name:'保存并继续'}));
    expect(window.location.hash).toBe('#/overview');
    expect(resultInfoCache['0'].note).toBe('从预览中保存的草稿');
    await user.click(screen.getByRole('button',{name:'成果'}));
    expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'编辑'})).toBeVisible();
  });

  it('刷新清除预览，切换英文同时翻译提示和工具菜单',async()=>{
    const user=userEvent.setup();const view=render(<App/>);
    await togglePreview(user);
    view.unmount();render(<App/>);
    expect(screen.queryByText(emptyMessage)).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'上传成果'})).toBeVisible();
    await togglePreview(user);
    await user.click(screen.getByRole('button',{name:'选择语言'}));
    await user.click(screen.getByRole('menuitemradio',{name:'English'}));
    expect(screen.getByText('You do not have access to any projects. Please contact your system administrator.')).toBeVisible();
    await user.click(screen.getByRole('button',{name:'Tools'}));
    expect(screen.getByRole('menuitem',{name:'Exit no-access preview'})).toBeVisible();
  });
});
