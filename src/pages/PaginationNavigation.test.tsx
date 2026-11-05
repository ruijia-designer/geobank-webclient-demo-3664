import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SearchPage from './SearchPage';
import ApprovalPage from './ApprovalPage';
import BaselinePage from './BaselinePage';
import { APPROVAL_RECORDS, initialState, SEARCH_RECORDS } from '../services/demo';
import { demoRows, saveBaselineRows } from '../services/baseline';
import type { AppApi, AppState } from '../types';

const originalSearch = structuredClone(SEARCH_RECORDS);
const originalCopies = structuredClone(APPROVAL_RECORDS.copy);
const originalMining = structuredClone(demoRows.mining);
afterEach(() => {
  SEARCH_RECORDS.splice(0, SEARCH_RECORDS.length, ...originalSearch);
  APPROVAL_RECORDS.copy.splice(0, APPROVAL_RECORDS.copy.length, ...originalCopies);
  saveBaselineRows('mining', originalMining);
  vi.restoreAllMocks();
});

function Harness({ page, section }: { page: 'search' | 'approval' | 'baseline'; section?: string }) {
  const [state, setState] = useState<AppState>(() => ({ ...initialState('admin'), route: { page, section } }));
  const api: AppApi = { state, setState, navigate: route => setState(s => ({ ...s, route })), notify: vi.fn(), deny: vi.fn(), openProject: vi.fn() };
  return page === 'search' ? <SearchPage api={api}/> : page === 'approval' ? <ApprovalPage api={api}/> : <BaselinePage api={api}/>;
}

// Model a list whose top is 240px below its pane's scroll origin.
function mockScrolledPane(container: HTMLElement, paneSelector: string, listSelector: string) {
  const pane = container.querySelector<HTMLElement>(paneSelector)!;
  const list = container.querySelector<HTMLElement>(listSelector)!;
  vi.spyOn(pane, 'getBoundingClientRect').mockImplementation(() => ({ top: 20 } as DOMRect));
  vi.spyOn(list, 'getBoundingClientRect').mockImplementation(() => ({ top: 260 - pane.scrollTop } as DOMRect));
  pane.scrollTop = 1000;
  return pane;
}

describe('跨模块分页导航', () => {
  it('检索重复提交同一查询回到首页，翻页滚动到列表起点', async () => {
    const user = userEvent.setup();
    SEARCH_RECORDS.splice(0, SEARCH_RECORDS.length, ...Array.from({ length: 41 }, (_, index) => ({ ...originalSearch[0], id: `search-${index}`, name: `分页项目${index + 1}` })));
    const { container } = render(<Harness page="search"/>);
    const pane = mockScrolledPane(container, '.search-page', '.search-result-tools');
    await user.click(screen.getByRole('button', { name: '下一页' }));
    expect(screen.getByText('第 2 / 2 页')).toBeVisible();
    expect(container.querySelectorAll('.search-result-card')).toHaveLength(11);
    expect(pane.scrollTop).toBe(240);
    await user.click(screen.getByRole('button', { name: '搜索' }));
    expect(screen.getByText('第 1 / 2 页')).toBeVisible();
    expect(container.querySelectorAll('.search-result-card')).toHaveLength(30);
  });

  it('抄送列表重置或重复查询回到首页，翻页和页大小切换使用本地滚动容器', async () => {
    const user = userEvent.setup();
    APPROVAL_RECORDS.copy.splice(0, APPROVAL_RECORDS.copy.length, ...Array.from({ length: 41 }, (_, index) => ({ ...originalCopies[0], id: `copy-${index}`, name: `抄送项目${index + 1}` })));
    const { container } = render(<Harness page="approval" section="copy"/>);
    const pane = mockScrolledPane(container, '.approval-workspace', '.approval-records');
    await user.click(screen.getByRole('button', { name: '下一页' }));
    expect(screen.getByText('第 2 / 3 页')).toBeVisible();
    expect(pane.scrollTop).toBe(240);
    await user.click(screen.getByRole('button', { name: '重置' }));
    expect(screen.getByText('第 1 / 3 页')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '下一页' }));
    await user.click(screen.getByRole('button', { name: '查询' }));
    expect(screen.getByText('第 1 / 3 页')).toBeVisible();
    pane.scrollTop = 1000;
    await user.selectOptions(screen.getByRole('combobox', { name: '每页行数' }), '30');
    expect(pane.scrollTop).toBe(240);
    expect(container.querySelectorAll('.approval-record')).toHaveLength(30);
  });

  it('基准列表翻页后定位表格起点', async () => {
    const user = userEvent.setup();
    saveBaselineRows('mining', Array.from({ length: 41 }, (_, index) => ({ id: `mining-${index}`, name: `矿权${index + 1}` })));
    const { container } = render(<Harness page="baseline" section="mining"/>);
    const pane = mockScrolledPane(container, '.baseline-main', '.baseline-list');
    await user.click(screen.getByRole('button', { name: '下一页' }));
    expect(pane.scrollTop).toBe(240);
    expect(container.querySelector('tbody tr')).toHaveTextContent('矿权21');
  });

  it.each([['orders', 8], ['download', 3], ['center', 5], ['flow', 3]] as const)('%s 二级列表提供相同的页大小控件并保持记录操作', async (section, total) => {
    const user = userEvent.setup();
    const { container } = render(<Harness page="approval" section={section}/>);
    expect(screen.getByRole('combobox', { name: '每页行数' })).toHaveValue('20');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(total);
    expect(screen.getByText(`第 1–${total} 条，共 ${total} 条`)).toBeVisible();
    await user.selectOptions(screen.getByRole('combobox', { name: '每页行数' }), '50');
    expect(container.querySelectorAll('tbody tr')).toHaveLength(total);
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled();
  });
});
