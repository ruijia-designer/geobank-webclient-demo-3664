import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { PROJECTS } from '../services/demo';
import { resultFilesCache, resultInfoCache } from '../services/results';

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem('geobank-demo-authenticated-v1', 'true');
  window.history.replaceState(null, '', '/#/results/current/' + encodeURIComponent('关联项目'));
  [resultFilesCache, resultInfoCache].forEach(cache => Object.keys(cache).forEach(key => delete cache[key]));
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
});

describe('成果页关联项目保存通知', () => {
  it('接入统一提示：保存后只出现一条全局通知，1.8 秒后消失且关联卡片保留', () => {
    render(<App/>);
    const target = PROJECTS.find(project => project.id === '0')!;
    const related = screen.getByRole('region', { name: '关联项目' });
    expect(within(related).getAllByRole('button', { name: '管理关联' })).toHaveLength(1);
    expect(within(related).queryByRole('button', { name: '建立关联关系' })).not.toBeInTheDocument();
    expect(within(related).queryByRole('button', { name: '编辑关联' })).not.toBeInTheDocument();
    fireEvent.click(within(related).getByRole('button', { name: '管理关联' }));
    const dialog = within(screen.getByRole('dialog', { name: '管理关联' }));
    fireEvent.click(dialog.getByRole('checkbox', { name: '选择项目：' + target.name }));
    fireEvent.click(dialog.getByRole('button', { name: '保存' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(within(related).getByRole('heading', { name: target.name })).toBeVisible();
    expect(within(related).queryByText('关联关系已保存')).not.toBeInTheDocument();
    expect(screen.getAllByText('关联关系已保存')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('关联关系已保存');

    act(() => { vi.advanceTimersByTime(1799); });
    expect(screen.getByRole('status')).toHaveTextContent('关联关系已保存');
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.queryByText('关联关系已保存')).not.toBeInTheDocument();
    expect(within(related).getByRole('heading', { name: target.name })).toBeVisible();
    expect(within(related).getByText('4 个项目')).toBeVisible();
  });
});
