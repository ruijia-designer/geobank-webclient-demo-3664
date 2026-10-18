import { useState } from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider, useTranslation } from '../i18n';
import { initialState, APPROVAL_RECORDS } from '../services/demo';
import type { AppApi, AppState, Route } from '../types';
import ApprovalPage from './ApprovalPage';

let currentApi: AppApi;
function Harness({ section }: { section: string }) {
  const [state, setState] = useState<AppState>(() => ({ ...initialState('admin'), route: { page: 'approval', section } }));
  const navigate = (route: Route) => setState(previous => ({ ...previous, route }));
  currentApi = { state, setState, navigate, notify: vi.fn(), deny: vi.fn(), openProject: vi.fn() };
  const { toggleLocale } = useTranslation();
  return <><button onClick={toggleLocale}>Switch language</button><ApprovalPage api={currentApi}/></>;
}
beforeEach(() => sessionStorage.setItem('geobank-demo-locale', 'en'));
afterEach(() => sessionStorage.removeItem('geobank-demo-locale'));

describe('审批中英文交互', () => {
  it('审批过滤仍用原值，字段与状态翻译、项目和理由原文保留；详情切换保持展开状态', async () => {
    const user = userEvent.setup();
    render(<LanguageProvider><Harness section="approved"/></LanguageProvider>);
    const type = screen.getByRole('combobox', { name: 'Approval Type' });
    await user.selectOptions(type, 'archive');
    const input = screen.getByRole('textbox', { name: 'Approval Keyword' });
    await user.type(input, '张室');
    await user.click(screen.getByRole('button', { name: 'Search' }));
    expect(currentApi.state.approval).toMatchObject({ type: 'archive', query: '张室' });
    expect(screen.getByText(APPROVAL_RECORDS.approved.name)).toBeInTheDocument();
    expect(screen.getByText(APPROVAL_RECORDS.approved.reason, { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText('Approved').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: 'View Details' }));
    expect(screen.getByRole('dialog', { name: 'Project Archiving Approval Details' })).toBeInTheDocument();
    expect(screen.getByText('Migration Results')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Gather Results/ }));
    await user.click(screen.getByRole('button', { name: 'Switch language' }));
    const dialog = screen.getByRole('dialog', { name: '项目归档审批详情' });
    expect(within(dialog).getByRole('button', { name: /道集成果/ })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('combobox', { name: '审批类型' })).toHaveValue('archive');
    expect(screen.getByRole('textbox', { name: '审批关键词' })).toHaveValue('张室');
  });
  it('订单筛选英文显示保留中文值，已打开详情跟随语言，订单状态不被改写', async () => {
    const user = userEvent.setup();
    render(<LanguageProvider><Harness section="orders"/></LanguageProvider>);
    const purpose = screen.getByRole('combobox', { name: 'Download Purpose' });
    await user.selectOptions(purpose, '生产应用');
    expect(purpose).toHaveValue('生产应用');
    expect(within(purpose).getByRole('option', { name: 'Production Use' })).toHaveAttribute('value', '生产应用');
    expect(screen.getByText('2 records')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'View DD-2026-0725-002' }));
    let dialog = screen.getByRole('dialog', { name: 'Data Order Details' });
    expect(within(dialog).getByText('塔中XX三维采集')).toBeInTheDocument();
    expect(within(dialog).getByText('In Progress')).toBeInTheDocument();
    expect(within(dialog).getByText('Order Number')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Switch language' }));
    dialog = screen.getByRole('dialog', { name: '数据订单详情' });
    expect(within(dialog).getByText('订单号')).toBeInTheDocument();
    expect(within(dialog).getByText('进行中')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: '下载用途' })).toHaveValue('生产应用');
  });
});
