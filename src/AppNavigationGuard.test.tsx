import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppApi } from './types';
import App from './App';

const guard = vi.hoisted(() => vi.fn<(proceed: () => void) => void>());

// Exercise the real App, Header, hash routing and login with a page that can defer
// navigation. ResultsPage's draft validation and confirmation dialog have separate tests.
vi.mock('./pages/ResultsPage', async () => {
  const { useEffect } = await import('react');
  return {
    default: function GuardedResults({ api }: { api: AppApi }) {
      useEffect(() => api.registerNavigationGuard?.(guard), [api.registerNavigationGuard]);
      return <main>
        <h1>受保护成果页</h1>
        <label>未保存草稿<input defaultValue="尚未保存的修改"/></label>
        <output aria-label="当前成果项目">{api.state.currentProjectId}</output>
        <output aria-label="当前成果目录">{api.state.route.section || '项目信息'}</output>
        <button onClick={() => api.navigate({ page: 'results', projectId: api.state.currentProjectId, section: 'wells' })}>切换同项目文件目录</button>
        <button onClick={() => api.navigate({ page: 'results', projectId: '1' })}>切换其他可读项目</button>
        <button onClick={() => api.navigate({ page: 'results', projectId: '2' })}>打开无权限项目</button>
      </main>;
    },
  };
});

beforeEach(() => {
  guard.mockReset();
  sessionStorage.clear();
  sessionStorage.setItem('geobank-demo-authenticated-v1', 'true');
  window.history.replaceState(null, '', '/#/results/0');
});

function externalHash(hash: string) {
  act(() => {
    window.history.replaceState(null, '', hash);
    fireEvent(window, new HashChangeEvent('hashchange'));
  });
}

function proceed() {
  const pending = guard.mock.calls.at(-1)?.[0];
  expect(pending).toBeTypeOf('function');
  act(() => pending!());
}

describe('页面注册的未保存导航保护', () => {
  it('顶部切页先保留草稿与地址，放行只执行一次，卸载页面后自动清理保护', async () => {
    const user = userEvent.setup();
    render(<StrictMode><App/></StrictMode>);
    const draft = screen.getByRole('textbox', { name: '未保存草稿' });
    await user.type(draft, '继续编辑');
    await user.click(within(screen.getByRole('navigation', { name: '顶部导航' })).getByRole('button', { name: '概览' }));

    expect(guard).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#/results/0');
    expect(draft).toHaveValue('尚未保存的修改继续编辑');
    expect(screen.getByRole('heading', { name: '受保护成果页' })).toBeVisible();
    expect(sessionStorage.getItem('geobank-demo-ui-v1')).not.toContain('registerNavigationGuard');

    proceed();
    expect(window.location.hash).toBe('#/overview');
    expect(screen.queryByRole('heading', { name: '受保护成果页' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '检索' }));
    expect(screen.getByRole('heading', { name: '数据检索' })).toBeVisible();
    expect(guard).toHaveBeenCalledTimes(1);
  });

  it('同项目目录、同项目顶部成果入口及同项目 Hash 返回不触发离开保护', async () => {
    const user = userEvent.setup();
    render(<App/>);
    const draft = screen.getByRole('textbox', { name: '未保存草稿' });
    await user.click(screen.getByRole('button', { name: '切换同项目文件目录' }));
    expect(window.location.hash).toBe('#/results/0/wells');
    expect(screen.getByLabelText('当前成果目录')).toHaveTextContent('wells');
    await user.click(screen.getByRole('button', { name: '成果' }));
    expect(window.location.hash).toBe('#/results/0');
    externalHash('#/results/0/wells');
    expect(screen.getByLabelText('当前成果目录')).toHaveTextContent('wells');
    expect(screen.getByRole('textbox', { name: '未保存草稿' })).toBe(draft);
    expect(guard).not.toHaveBeenCalled();
  });

  it('浏览器 Hash 离开先恢复当前地址，取消继续编辑，重新确认后地址和页面一致', () => {
    render(<App/>);
    const draft = screen.getByRole('textbox', { name: '未保存草稿' });
    fireEvent.change(draft, { target: { value: '保留这份草稿' } });

    externalHash('#/search');
    expect(guard).toHaveBeenCalledTimes(1);
    expect(window.location.hash).toBe('#/results/0');
    expect(draft).toHaveValue('保留这份草稿');
    // Cancelling means the page never invokes the supplied continuation.
    externalHash('#/overview');
    expect(guard).toHaveBeenCalledTimes(2);
    expect(window.location.hash).toBe('#/results/0');
    proceed();
    expect(window.location.hash).toBe('#/overview');
    expect(screen.getByRole('textbox', { name: '搜索项目' })).toBeVisible();
    expect(guard).toHaveBeenCalledTimes(2);
  });

  it('浏览器实际后退也等待放行，再恢复后退目标', async () => {
    window.history.replaceState(null, '', '#/overview');
    window.history.pushState(null, '', '#/results/0');
    render(<App/>);
    act(() => window.history.back());
    await waitFor(() => expect(guard).toHaveBeenCalledTimes(1));
    expect(window.location.hash).toBe('#/results/0');
    expect(screen.getByRole('textbox', { name: '未保存草稿' })).toBeVisible();
    proceed();
    expect(window.location.hash).toBe('#/overview');
    expect(screen.getByRole('textbox', { name: '搜索项目' })).toBeVisible();
  });

  it.each(['页面导航', 'Hash 导航'])('%s切换其他成果项目须放行后才更新当前项目', async mode => {
    const user = userEvent.setup();
    render(<App/>);
    if (mode === '页面导航') await user.click(screen.getByRole('button', { name: '切换其他可读项目' }));
    else externalHash('#/results/1');
    expect(guard).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('当前成果项目')).toHaveTextContent('0');
    expect(window.location.hash).toBe('#/results/0');
    proceed();
    expect(screen.getByLabelText('当前成果项目')).toHaveTextContent('1');
    expect(window.location.hash).toBe('#/results/1');
    // Processing the native event from an internal hash assignment must not ask twice.
    act(() => fireEvent(window, new HashChangeEvent('hashchange')));
    expect(guard).toHaveBeenCalledTimes(1);
  });

  it('退出登录被保护时保留认证，放行后才退出并保存返回页面', async () => {
    const user = userEvent.setup();
    render(<App/>);
    await user.click(screen.getByRole('button', { name: 'Demo 用户菜单' }));
    await user.click(screen.getByRole('menuitem', { name: /退出登录/ }));
    expect(guard).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem('geobank-demo-authenticated-v1')).toBe('true');
    expect(window.location.hash).toBe('#/results/0');
    expect(screen.getByRole('textbox', { name: '未保存草稿' })).toBeVisible();
    proceed();
    expect(screen.getByRole('heading', { name: '欢迎登录' })).toBeVisible();
    expect(sessionStorage.getItem('geobank-demo-authenticated-v1')).toBeNull();
    expect(JSON.parse(sessionStorage.getItem('geobank-demo-return')!).route).toEqual({ page: 'results', projectId: '0' });
    expect(window.location.hash).toBe('#/login');
  });

  it('无权限目标先拒绝，不触发放弃草稿，也不改变当前项目和地址', async () => {
    const user = userEvent.setup();
    render(<App/>);
    await user.click(screen.getByRole('button', { name: '打开无权限项目' }));
    expect(screen.getByRole('dialog', { name: '无浏览权限' })).toBeVisible();
    expect(guard).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('#/results/0');
    expect(screen.getByLabelText('当前成果项目')).toHaveTextContent('0');
    expect(screen.getByRole('textbox', { name: '未保存草稿' })).toHaveValue('尚未保存的修改');
  });
});
