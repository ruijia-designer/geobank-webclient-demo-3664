import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppApi, AppState, Route } from '../types';
import { CURRENT_PROJECT, initialState } from '../services/demo';
import { INITIAL_RESULT_FILES, resultFilesCache, resultInfoCache } from '../services/results';
import { LanguageProvider, useTranslation } from '../i18n';
import ResultsPage from './ResultsPage';

let currentApi: AppApi;
const notify = vi.fn();
function Harness({ initial }: { initial?: AppState }) {
  const [state, setState] = useState<AppState>(() => initial || {
    ...initialState('admin'), route: { page: 'results', section: 'wells' },
  });
  const navigate = (route: Route) => setState(previous => ({ ...previous, route, currentProjectId: route.projectId || previous.currentProjectId }));
  currentApi = { state, setState, navigate, notify, deny: vi.fn(), openProject: vi.fn() };
  const { toggleLocale } = useTranslation();
  return <><button onClick={toggleLocale}>Switch language</button><ResultsPage api={currentApi}/></>;
}

beforeEach(() => {
  sessionStorage.removeItem('geobank-demo-locale');
  vi.clearAllMocks();
  [resultFilesCache, resultInfoCache].forEach(cache => Object.keys(cache).forEach(key => delete cache[key]));
});

describe('成果页申请归档', () => {
  it('菜单支持键盘、Esc和点击外部关闭，弹窗统计整个项目且取消不提交', async () => {
    const user = userEvent.setup();
    render(<Harness/>);
    const trigger = screen.getByRole('button', { name: '未归档' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: '申请归档' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await user.click(trigger);
    await user.click(screen.getByRole('heading', { name: '成果概览' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: '申请归档' }));
    const dialog = screen.getByRole('dialog', { name: '提交项目归档审批' });
    expect(dialog).toHaveTextContent(CURRENT_PROJECT.name);
    expect(within(dialog).getByText('共 22 个文件')).toBeVisible();
    expect(within(dialog).getByText('100.22 MB')).toBeVisible();
    expect(within(dialog).getByText('张室', { exact: true })).toBeVisible();
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(3);
    await user.type(within(dialog).getByLabelText('理由'), '取消这份草稿');
    await user.click(within(dialog).getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(currentApi.state.archiveRequests).toBeUndefined();
    expect(notify).not.toHaveBeenCalled();
  });

  it('校验理由后保存申请快照，阻止重复申请，重挂载可查阅且未直接归档项目', async () => {
    resultFilesCache.current = [
      { ...INITIAL_RESULT_FILES[0], bytes: 2048 },
      { ...INITIAL_RESULT_FILES[1], directory: '项目成果文档', bytes: 1024 },
    ];
    const user = userEvent.setup();
    const { unmount } = render(<Harness/>);
    await user.click(screen.getByRole('button', { name: '未归档' }));
    await user.click(screen.getByRole('menuitem', { name: '申请归档' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('共 2 个文件')).toBeVisible();
    expect(dialog.getByText('3.00 KB')).toBeVisible();
    await user.type(dialog.getByLabelText('理由'), '   ');
    await user.click(dialog.getByRole('button', { name: '提交审批' }));
    expect(dialog.getByRole('alert')).toHaveTextContent('请输入申请理由');
    expect(currentApi.state.archiveRequests).toBeUndefined();
    await user.clear(dialog.getByLabelText('理由'));
    await user.type(dialog.getByLabelText('理由'), '  资料整理完成，申请归档。  ');
    await user.click(dialog.getByRole('button', { name: '提交审批' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(currentApi.state.archiveRequests?.current).toMatchObject({
      projectId: 'current', projectName: CURRENT_PROJECT.name, applicant: '张室',
      reason: '资料整理完成，申请归档。', fileCount: 2, totalBytes: 3072, status: 'pending',
    });
    expect(currentApi.state.projects.some(project => project.id === 'current' && project.archived)).toBe(false);
    expect(notify).toHaveBeenCalledWith('归档申请已提交（本地演示）');
    const saved = currentApi.state;
    unmount();
    resultFilesCache.current = [];
    render(<Harness initial={saved}/>);
    await user.click(screen.getByRole('button', { name: '归档审批中' }));
    expect(screen.queryByRole('menuitem', { name: '申请归档' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('menuitem', { name: '查看归档申请' }));
    const details = within(screen.getByRole('dialog', { name: '项目归档申请详情' }));
    expect(details.getByLabelText('理由')).toHaveAttribute('readonly');
    expect(details.getByLabelText('理由')).toHaveValue('资料整理完成，申请归档。');
    expect(details.getByText('共 2 个文件')).toBeVisible();
    expect(details.queryByRole('button', { name: '提交审批' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: CURRENT_PROJECT.name }));
    await user.click(screen.getByRole('option', { name: /2024年山西省左权西乡处理项目/ }));
    expect(screen.getByRole('button', { name: '未归档' })).toBeVisible();
  });

  it('零文件项目仍正确显示统计，已归档项目不提供申请入口', async () => {
    const project = { ...CURRENT_PROJECT, id: 'created-archive', name: '空项目' };
    const state = { ...initialState('admin'), projects: [project], currentProjectId: project.id, route: { page: 'results' as const } };
    const user = userEvent.setup();
    const { rerender } = render(<Harness key="empty" initial={state}/>);
    await user.click(screen.getByRole('button', { name: '未归档' }));
    await user.click(screen.getByRole('menuitem', { name: '申请归档' }));
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('共 0 个文件')).toBeVisible();
    expect(dialog.getByText('0 B')).toBeVisible();
    rerender(<Harness key="archived" initial={{ ...state, projects: [{ ...project, archived: true }] }}/>);
    expect(screen.getByText('已归档', { exact: true })).toBeVisible();
    expect(screen.queryByRole('button', { name: '已归档' })).not.toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('切换语言保留理由草稿，关闭按钮可退出弹窗', async () => {
    const user = userEvent.setup();
    render(<LanguageProvider><Harness/></LanguageProvider>);
    await user.click(screen.getByRole('button', { name: '未归档' }));
    await user.click(screen.getByRole('menuitem', { name: '申请归档' }));
    await user.type(screen.getByLabelText('理由'), '保留中文理由');
    await user.click(screen.getByRole('button', { name: 'Switch language' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Submit project archiving request' }));
    expect(dialog.getByLabelText('Reason')).toHaveValue('保留中文理由');
    expect(dialog.getByText('22 files')).toBeVisible();
    await user.click(dialog.getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
