import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it} from 'vitest';
import App from './App';

beforeEach(()=>{
  sessionStorage.clear();
  sessionStorage.setItem('geobank-demo-authenticated-v1','true');
  window.history.replaceState(null,'','/#/overview');
});

describe('顶部中英文切换',()=>{
  it('真正切换导航及概览，保留筛选关键词、图层勾选和业务项目名',async()=>{
    const user=userEvent.setup(); render(<App/>);
    await user.type(screen.getByRole('textbox',{name:'搜索项目'}),'2024');
    await user.click(screen.getByRole('checkbox',{name:'处理'}));
    await user.click(screen.getByRole('button',{name:'切换为英文'}));
    expect(document.documentElement.lang).toBe('en');
    const nav=screen.getByRole('navigation',{name:'Main navigation'});
    for(const label of ['Overview','Results','Search','Statistics','Approvals','Reference','Tools']){
      expect(within(nav).getByRole('button',{name:label})).toBeInTheDocument();
    }
    expect(screen.getByRole('textbox',{name:'Search projects'})).toHaveValue('2024');
    expect(screen.getByRole('checkbox',{name:'Processing'})).not.toBeChecked();
    expect(screen.getByRole('button',{name:'Project: 2024年山西省左权西乡处理项目'})).toBeInTheDocument();
    expect(window.location.hash).toBe('#/overview');
    await user.click(screen.getByRole('button',{name:'Switch to Chinese'}));
    expect(screen.getByRole('textbox',{name:'搜索项目'})).toHaveValue('2024');
    expect(screen.getByRole('checkbox',{name:'处理'})).not.toBeChecked();
  });

  it('成果右侧任意页签最大化均隐藏上传，语言切换保留页签和滚动，恢复后显示上传',async()=>{
    const user=userEvent.setup();window.history.replaceState(null,'','/#/results/current');render(<App/>);
    await user.click(screen.getByRole('button',{name:'最大化当前右侧栏目'}));
    expect(screen.queryByRole('button',{name:'上传成果'})).not.toBeInTheDocument();
    const content=document.querySelector('.result-right-content') as HTMLElement;
    content.scrollTop=240;fireEvent.scroll(content);
    await user.click(screen.getByRole('button',{name:'切换为英文'}));
    expect(document.querySelector('.result-right-content')).toBe(content);
    expect(content.scrollTop).toBe(240);
    expect(screen.getByRole('heading',{name:'Results overview'})).toBeInTheDocument();
    expect(screen.queryByRole('button',{name:'Upload results'})).not.toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Integrated maps'}));
    expect(screen.queryByRole('button',{name:'Upload results'})).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button',{name:'设计文档.doc'})[0]);
    expect(screen.queryByRole('button',{name:'Upload results'})).not.toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Restore'}));
    expect(screen.getByRole('button',{name:'Upload results'})).toBeInTheDocument();
    expect(document.querySelector('.result-tab.active')).toHaveTextContent('设计文档.doc');
    expect(window.location.hash).toBe('#/results/current');
  });

  it('刷新记住语言，并支持切回中文',async()=>{
    const user=userEvent.setup();const first=render(<App/>);
    await user.click(screen.getByRole('button',{name:'切换为英文'}));
    first.unmount();render(<App/>);
    expect(screen.getByRole('button',{name:'Switch to Chinese'})).toBeInTheDocument();
    expect(document.title).toBe('Geophysical Data Bank');
    await user.click(screen.getByRole('button',{name:'Switch to Chinese'}));
    expect(sessionStorage.getItem('geobank-demo-locale')).toBe('zh');
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(document.title).toBe('物探数据银行');
  });
});
