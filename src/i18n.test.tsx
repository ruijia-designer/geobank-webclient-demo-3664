import {fireEvent, render, screen, within} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, describe, expect, it} from 'vitest';
import App from './App';

beforeEach(()=>{
  sessionStorage.clear();
  sessionStorage.setItem('geobank-demo-authenticated-v1','true');
  window.history.replaceState(null,'','/#/overview');
});

async function chooseLanguage(user:ReturnType<typeof userEvent.setup>,language:'中文'|'English'){
  await user.click(screen.getByRole('button',{name:/^(选择语言|Choose language)$/}));
  await user.click(screen.getByRole('menuitemradio',{name:language}));
}

describe('顶部中英文切换',()=>{
  it('登录页沿用保存的英文设置，显示新文案和演示账号并支持密码显隐',async()=>{
    const user=userEvent.setup();
    sessionStorage.removeItem('geobank-demo-authenticated-v1');
    sessionStorage.setItem('geobank-demo-locale','en');
    render(<App/>);
    expect(screen.getByRole('heading',{name:'Welcome back'})).toBeInTheDocument();
    expect(screen.getByText('Enter your account details to access the system')).toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Sign in'})).toBeInTheDocument();
    expect(screen.getByText('Offline demo account: Demo / demo123')).toBeInTheDocument();
    expect(screen.getByText('Interactive demo only; no live accounts are connected.')).toBeInTheDocument();
    expect(screen.getByRole('textbox',{name:'Username'})).toBeInTheDocument();
    const password=screen.getByLabelText('Password',{exact:true});
    expect(password).toHaveAttribute('type','password');
    await user.click(screen.getByRole('button',{name:'Show password'}));
    expect(password).toHaveAttribute('type','text');
    await user.click(screen.getByRole('button',{name:'Hide password'}));
    expect(password).toHaveAttribute('type','password');
  });

  it('真正切换导航及概览，保留筛选关键词、图层勾选和业务项目名',async()=>{
    const user=userEvent.setup(); render(<App/>);
    await user.type(screen.getByRole('textbox',{name:'搜索项目'}),'2024');
    await user.click(screen.getByRole('button',{name:'项目类型'}));
    await user.click(screen.getByRole('checkbox',{name:'处理'}));
    await chooseLanguage(user,'English');
    expect(document.documentElement.lang).toBe('en');
    const nav=screen.getByRole('navigation',{name:'Main navigation'});
    for(const label of ['Overview','Results','Search','Statistics','Approvals','Reference','Tools']){
      expect(within(nav).getByRole('button',{name:label})).toBeInTheDocument();
    }
    expect(screen.getByRole('textbox',{name:'Search projects'})).toHaveValue('2024');
    expect(screen.getByRole('checkbox',{name:'Processing'})).not.toBeChecked();
    expect(screen.getByRole('button',{name:'Project: 2024年山西省左权西乡处理项目'})).toBeInTheDocument();
    expect(window.location.hash).toBe('#/overview');
    await chooseLanguage(user,'中文');
    expect(screen.getByRole('textbox',{name:'搜索项目'})).toHaveValue('2024');
    expect(screen.getByRole('checkbox',{name:'处理'})).not.toBeChecked();
  });

  it('成果右侧任意页签最大化均隐藏上传，语言切换保留页签和滚动，恢复后显示上传',async()=>{
    const user=userEvent.setup();window.history.replaceState(null,'','/#/results/current');render(<App/>);
    await user.click(screen.getByRole('button',{name:'最大化当前右侧栏目'}));
    expect(screen.queryByRole('button',{name:'上传成果'})).not.toBeInTheDocument();
    const content=document.querySelector('.result-right-content') as HTMLElement;
    content.scrollTop=240;fireEvent.scroll(content);
    await chooseLanguage(user,'English');
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
    await chooseLanguage(user,'English');
    first.unmount();render(<App/>);
    expect(screen.getByRole('button',{name:'Choose language'})).toBeInTheDocument();
    expect(document.title).toBe('Geophysical Data Bank');
    await chooseLanguage(user,'中文');
    expect(sessionStorage.getItem('geobank-demo-locale')).toBe('zh');
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(document.title).toBe('物探数据银行');
  });

  it('语言菜单显示四个选项，阿拉伯语和西班牙语仅展示，不改变当前语言',async()=>{
    const user=userEvent.setup();render(<App/>);
    const trigger=screen.getByRole('button',{name:'选择语言'});
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded','true');
    const menu=screen.getByRole('menu',{name:'语言'});
    expect(within(menu).getAllByRole('menuitemradio')).toHaveLength(4);
    expect(within(menu).getByRole('menuitemradio',{name:'中文'})).toHaveAttribute('aria-checked','true');
    for(const name of ['العربية','Español']){
      const option=within(menu).getByRole('menuitemradio',{name});
      expect(option).toBeDisabled();
      await user.click(option);
      expect(sessionStorage.getItem('geobank-demo-locale')).toBe('zh');
      expect(document.documentElement.lang).toBe('zh-CN');
    }
    await user.click(within(menu).getByRole('menuitemradio',{name:'English'}));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    const englishTrigger=screen.getByRole('button',{name:'Choose language'});
    expect(englishTrigger).toHaveTextContent('EN');
    expect(englishTrigger).toHaveFocus();
    await user.click(englishTrigger);
    expect(screen.getByRole('menuitemradio',{name:'English'})).toHaveAttribute('aria-checked','true');
    expect(screen.getByRole('menuitemradio',{name:'العربية'})).toBeDisabled();
    expect(screen.getByRole('menuitemradio',{name:'Español'})).toBeDisabled();
  });

  it('语言菜单支持方向键和Esc，与Demo菜单互斥并可点击外部关闭',async()=>{
    const user=userEvent.setup();render(<App/>);
    const trigger=screen.getByRole('button',{name:'选择语言'});
    trigger.focus();await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio',{name:'中文'})).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio',{name:'English'})).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio',{name:'中文'})).toHaveFocus();
    await user.keyboard('{End}{Enter}');
    expect(screen.getByRole('button',{name:'Choose language'})).toHaveFocus();
    expect(document.documentElement.lang).toBe('en');
    await user.keyboard('{ArrowUp}{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Choose language'})).toHaveFocus();
    await user.click(screen.getByRole('button',{name:'Demo account menu'}));
    expect(screen.getByRole('menuitem',{name:'System management'})).toBeVisible();
    await user.click(screen.getByRole('button',{name:'Choose language'}));
    expect(screen.queryByRole('menuitem',{name:'System management'})).not.toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Demo account menu'}));
    expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Choose language'}));
    await user.click(screen.getByRole('textbox',{name:'Search projects'}));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('工具提供两个新窗口示例链接，支持键盘和中英文，与其他菜单互斥',async()=>{
    const user=userEvent.setup();render(<App/>);
    const tools=screen.getByRole('button',{name:'工具'});
    expect(tools).toBeEnabled();tools.focus();await user.keyboard('{ArrowDown}');
    const menu=screen.getByRole('menu',{name:'工具'});
    const links=within(menu).getAllByRole('menuitem');
    expect(links.map(link=>link.textContent)).toEqual(['资产监控','AI 开放平台']);
    expect(links[0]).toHaveFocus();
    for(const link of links){expect(link).toHaveAttribute('target','_blank');expect(link).toHaveAttribute('rel','noopener noreferrer');}
    expect(links[0]).toHaveAttribute('href','https://example.com/#asset-monitoring');
    expect(links[1]).toHaveAttribute('href','https://example.com/#ai-open-platform');
    await user.keyboard('{ArrowDown}');expect(links[1]).toHaveFocus();
    await user.keyboard('{Escape}');expect(screen.queryByRole('menu')).not.toBeInTheDocument();expect(tools).toHaveFocus();
    await user.click(screen.getByRole('button',{name:'Demo 用户菜单'}));
    expect(screen.getByRole('menuitem',{name:'系统管理'})).toBeVisible();
    await user.click(tools);expect(screen.queryByRole('menuitem',{name:'系统管理'})).not.toBeInTheDocument();
    await chooseLanguage(user,'English');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button',{name:'Tools'}));
    expect(screen.getByRole('menuitem',{name:'Asset monitoring'})).toBeVisible();
    const platform=screen.getByRole('menuitem',{name:'AI Open Platform'});
    await user.click(platform);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(window.location.hash).toBe('#/overview');
  });
});
