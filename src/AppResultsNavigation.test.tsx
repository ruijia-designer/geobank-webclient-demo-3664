import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { resultFilesCache, resultInfoCache } from './services/results';

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem('geobank-demo-authenticated-v1', 'true');
  window.history.replaceState(null, '', '/#/results/0');
  Object.keys(resultInfoCache).forEach(key => delete resultInfoCache[key]);
  Object.keys(resultFilesCache).forEach(key => delete resultFilesCache[key]);
});

async function editNote(note: string) {
  await userEvent.click(screen.getByRole('button', { name: '编辑' }));
  fireEvent.change(screen.getByRole('textbox', { name: '备注' }), { target: { value: note } });
}

describe('真实成果草稿与全局导航联动', () => {
  it('顶部切页可以继续编辑，保存并继续后到达目标页且返回仍有保存内容', async () => {
    const user = userEvent.setup();
    render(<App/>);
    await editNote('导航保存的备注');
    await user.click(screen.getByRole('button', { name: '概览' }));
    let dialog = screen.getByRole('dialog', { name: '未保存的修改' });
    expect(window.location.hash).toBe('#/results/0');
    await user.click(within(dialog).getByRole('button', { name: '继续编辑' }));
    expect(screen.getByRole('textbox', { name: '备注' })).toHaveValue('导航保存的备注');

    await user.click(screen.getByRole('button', { name: '检索' }));
    dialog = screen.getByRole('dialog', { name: '未保存的修改' });
    await user.click(within(dialog).getByRole('button', { name: '保存并继续' }));
    expect(screen.getByRole('heading', { name: '数据检索' })).toBeVisible();
    expect(window.location.hash).toBe('#/search');
    expect(resultInfoCache['0'].note).toBe('导航保存的备注');
    await user.click(screen.getByRole('button', { name: '成果' }));
    expect(document.querySelector('.project-note')).toHaveTextContent('导航保存的备注');
    expect(screen.queryByRole('dialog', { name: '未保存的修改' })).not.toBeInTheDocument();
  });

  it('外部Hash离开恢复当前地址，放弃修改后继续原目标且不保存草稿', async () => {
    const user = userEvent.setup();
    render(<App/>);
    await editNote('不应保存的备注');
    act(() => {
      window.history.replaceState(null, '', '#/overview');
      fireEvent(window, new HashChangeEvent('hashchange'));
    });
    expect(window.location.hash).toBe('#/results/0');
    const dialog = screen.getByRole('dialog', { name: '未保存的修改' });
    await user.click(within(dialog).getByRole('button', { name: '放弃修改' }));
    expect(window.location.hash).toBe('#/overview');
    expect(screen.getByRole('textbox', { name: '搜索项目' })).toBeVisible();
    expect(resultInfoCache['0']).toBeUndefined();
    await user.click(screen.getByRole('button', { name: '成果' }));
    expect(document.querySelector('.project-note')).not.toHaveTextContent('不应保存的备注');
  });

  it('同项目目录切换不打断编辑，文件目录中离开页面仍会保护保留的草稿', async () => {
    const user = userEvent.setup();
    render(<App/>);
    await editNote('目录切换保留的备注');
    await user.click(within(screen.getByRole('navigation', { name: '成果目录' })).getByRole('button', { name: '测井数据' }));
    expect(window.location.hash).toBe('#/results/0/wells');
    expect(screen.queryByRole('dialog', { name: '未保存的修改' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '概览' }));
    const dialog = screen.getByRole('dialog', { name: '未保存的修改' });
    await user.click(within(dialog).getByRole('button', { name: '继续编辑' }));
    await user.click(screen.getByRole('button', { name: '成果' }));
    expect(window.location.hash).toBe('#/results/0');
    expect(screen.queryByRole('dialog', { name: '未保存的修改' })).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '备注' })).toHaveValue('目录切换保留的备注');
  });

  it('修改项目名称后保存并退出，重新登录恢复更新后的项目元数据', async () => {
    const user = userEvent.setup();
    render(<App/>);
    await user.click(screen.getByRole('button', { name: '编辑' }));
    fireEvent.change(screen.getByRole('textbox', { name: '项目名称' }), { target: { value: '保存后退出的项目名称' } });
    await user.click(screen.getByRole('button', { name: 'Demo 用户菜单' }));
    await user.click(screen.getByRole('menuitem', { name: /退出登录/ }));
    const dialog = screen.getByRole('dialog', { name: '未保存的修改' });
    await user.click(within(dialog).getByRole('button', { name: '保存并继续' }));
    expect(screen.getByRole('heading', { name: '欢迎登录' })).toBeVisible();
    expect(resultInfoCache['0'].name).toBe('保存后退出的项目名称');
    expect(JSON.parse(sessionStorage.getItem('geobank-demo-return')!).projects.find((project: { id: string }) => project.id === '0').name)
      .toBe('保存后退出的项目名称');
    await user.type(screen.getByRole('textbox', { name: '用户名' }), 'Demo');
    await user.type(screen.getByLabelText('密码', { exact: true }), 'demo123{Enter}');
    expect(window.location.hash).toBe('#/results/0');
    expect(document.querySelector('.project-trigger')).toHaveTextContent('保存后退出的项目名称');
  });

  it('取消浏览器后退后，再次后退仍是原概览目标，放弃后正常返回', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/#/overview');
    render(<App/>);
    await user.dblClick(screen.getByRole('button', { name: '项目：2024年山西省左权西乡处理项目' }));
    await editNote('后退取消后仍在的草稿');

    act(() => window.history.back());
    let dialog = await screen.findByRole('dialog', { name: '未保存的修改' });
    expect(window.location.hash).toBe('#/results/0');
    await user.click(within(dialog).getByRole('button', { name: '继续编辑' }));
    expect(screen.getByRole('textbox', { name: '备注' })).toHaveValue('后退取消后仍在的草稿');

    act(() => window.history.back());
    dialog = await screen.findByRole('dialog', { name: '未保存的修改' });
    expect(window.location.hash).toBe('#/results/0');
    await user.click(within(dialog).getByRole('button', { name: '放弃修改' }));
    await waitFor(() => expect(window.location.hash).toBe('#/overview'));
    expect(screen.getByRole('textbox', { name: '搜索项目' })).toBeVisible();
    expect(resultInfoCache['0']).toBeUndefined();
  });
});
