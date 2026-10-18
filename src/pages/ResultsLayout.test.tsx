import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppApi, AppState, Route } from '../types';
import { initialState } from '../services/demo';
import { resultFilesCache, resultInfoCache } from '../services/results';
import ResultsPage from './ResultsPage';

let lastApi: AppApi;
function Harness() {
  const [state, setState] = useState<AppState>(() => ({
    ...initialState('admin'), route: { page: 'results' }, currentProjectId: 'current',
  }));
  const navigate = (route: Route) => setState(s => ({
    ...s, route, currentProjectId: route.projectId || s.currentProjectId,
  }));
  lastApi = { state, setState, navigate, notify: vi.fn(), deny: vi.fn(), openProject: () => {} };
  return <ResultsPage api={lastApi}/>;
}

// jsdom versions without PointerEvent must still carry the pointer coordinates and ID.
class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 1;
  }
}

beforeEach(() => {
  vi.stubGlobal('innerWidth', 1280);
  vi.stubGlobal('PointerEvent', TestPointerEvent);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 1; });
  Object.keys(resultFilesCache).forEach(key => delete resultFilesCache[key]);
  Object.keys(resultInfoCache).forEach(key => delete resultInfoCache[key]);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function layout(container: HTMLElement) {
  return container.querySelector('.results-layout') as HTMLElement;
}
function sizes(container: HTMLElement) {
  const root = layout(container);
  const directory = Number.parseFloat(root.style.getPropertyValue('--results-directory-width'));
  const information = Number.parseFloat(root.style.getPropertyValue('--results-information-width'));
  const contentStart = Number.parseFloat(root.style.getPropertyValue('--results-content-start'));
  return { directory, information, contentStart, right: window.innerWidth - directory - information };
}
function divider(which: 'directory' | 'information') {
  return screen.getByRole('separator', {
    name: which === 'directory' ? '调整成果目录宽度' : '调整项目信息与成果区宽度',
  });
}
function drag(target: HTMLElement, delta: number) {
  fireEvent.pointerDown(target, { button: 0, pointerId: 7, clientX: 500 });
  fireEvent.pointerMove(target, { pointerId: 7, clientX: 500 + delta });
  fireEvent.pointerUp(target, { pointerId: 7, clientX: 500 + delta });
}

describe('成果页三栏真实拖拽流程', () => {
  it('两个分界线支持键盘10px微调，并把共同尺寸传给页签栏与内容区', () => {
    const { container } = render(<Harness/>);
    const start = sizes(container);
    expect(start.directory).toBe(226);
    expect(start.contentStart).toBeCloseTo(start.directory + start.information);
    expect(getComputedStyle(container.querySelector('.results-toolbar')!).gridTemplateColumns)
      .toContain('var(--results-content-start)');
    expect(getComputedStyle(container.querySelector('.results-information')!).width)
      .toBe('var(--results-information-width)');

    fireEvent.keyDown(divider('directory'), { key: 'ArrowRight' });
    let next = sizes(container);
    expect(next.directory).toBe(start.directory + 10);
    expect(next.information).toBeCloseTo(start.information - 10);
    expect(next.right).toBeCloseTo(start.right);
    expect(next.contentStart).toBeCloseTo(start.contentStart);
    expect(divider('directory')).toHaveAttribute('aria-valuenow', '236');

    fireEvent.keyDown(divider('information'), { key: 'ArrowRight' });
    next = sizes(container);
    expect(next.directory).toBe(236);
    expect(next.information).toBeCloseTo(start.information);
    expect(next.right).toBeCloseTo(start.right - 10);
    expect(next.contentStart).toBeCloseTo(start.contentStart + 10);
    fireEvent.keyDown(divider('information'), { key: 'ArrowLeft' });
    expect(sizes(container).right).toBeCloseTo(start.right);
  });

  it('指针拖拽以按下位置计算，拖动时高亮，忽略其他指针并在抬起后停止', () => {
    const { container } = render(<Harness/>);
    const start = sizes(container);
    const handle = divider('directory');
    fireEvent.pointerDown(handle, { button: 0, pointerId: 7, clientX: 500 });
    expect(handle).toHaveFocus();
    expect(layout(container)).toHaveClass('is-resizing');
    expect(handle).toHaveClass('active');
    fireEvent.pointerMove(handle, { pointerId: 99, clientX: 600 });
    expect(sizes(container)).toEqual(start);
    fireEvent.pointerMove(handle, { pointerId: 7, clientX: 530 });
    expect(sizes(container).directory).toBe(start.directory + 30);
    fireEvent.pointerMove(handle, { pointerId: 7, clientX: 540 });
    expect(sizes(container).directory).toBe(start.directory + 40);
    expect(sizes(container).right).toBeCloseTo(start.right);
    fireEvent.pointerUp(handle, { pointerId: 7, clientX: 540 });
    expect(layout(container)).not.toHaveClass('is-resizing');
    expect(handle).not.toHaveClass('active');
    fireEvent.pointerMove(handle, { pointerId: 7, clientX: 560 });
    expect(sizes(container).directory).toBe(start.directory + 40);
    drag(divider('information'), -25);
    expect(sizes(container).directory).toBe(start.directory + 40);
    expect(sizes(container).information).toBeCloseTo(start.information - 65);
    expect(sizes(container).contentStart).toBeCloseTo(start.contentStart - 25);
  });

  it('独立全屏与隐藏状态均可拖目录，显示与还原后恢复比例及活动页签', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness/>);
    drag(divider('directory'), 20);
    drag(divider('information'), 30);
    const split = sizes(container);
    const ratio = split.information / (1280 - split.directory);
    await user.click(screen.getByRole('button', { name: '综合成图' }));
    await user.click(screen.getByRole('button', { name: '最大化当前右侧栏目' }));
    expect(screen.getAllByRole('separator')).toHaveLength(1);
    expect(sizes(container).contentStart).toBe(sizes(container).directory);
    drag(divider('directory'), 30);
    expect(sizes(container).directory).toBe(split.directory + 30);
    expect(sizes(container).information / (1280 - sizes(container).directory)).toBeCloseTo(ratio);

    await user.click(screen.getByRole('button', { name: '隐藏成果视图' }));
    expect(screen.getAllByRole('separator')).toHaveLength(1);
    drag(divider('directory'), -10);
    expect(sizes(container).directory).toBe(split.directory + 20);
    expect(screen.getByLabelText('已打开5个页签')).toHaveTextContent('5');
    await user.click(screen.getByRole('button', { name: '显示成果视图' }));
    expect(lastApi.state.rightMaximized).toBe(true);
    expect(lastApi.state.informationMaximized).toBe(false);
    expect(screen.getAllByRole('separator')).toHaveLength(1);
    await user.click(screen.getByRole('button', { name: '还原' }));
    const restored = sizes(container);
    expect(screen.getAllByRole('separator')).toHaveLength(2);
    expect(restored.directory).toBe(split.directory + 20);
    expect(restored.information / (1280 - restored.directory)).toBeCloseTo(ratio);
    expect(restored.contentStart).toBeCloseTo(restored.directory + restored.information);
    expect(lastApi.state.resultTab).toBe('gis');
  });

  it('切换项目、页签和目录仍保留宽度，不改变已关闭的页签', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness/>);
    drag(divider('directory'), 20);
    drag(divider('information'), 20);
    const resized = sizes(container);
    await user.click(screen.getByRole('button', { name: '综合成图' }));
    await user.click(screen.getByRole('button', { name: '关闭B1-1.las' }));
    expect(sizes(container)).toEqual(resized);
    await user.click(container.querySelector('.project-trigger')!);
    await user.click(screen.getByRole('option', { name: /2024年山西省左权西乡处理项目/ }));
    expect(lastApi.state.currentProjectId).toBe('0');
    expect(lastApi.state.resultTab).toBe('gis');
    expect(sizes(container)).toEqual(resized);
    expect(screen.queryByRole('button', { name: 'B1-1.las' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '测井数据' }));
    expect(screen.queryByRole('separator')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '项目信息' }));
    expect(sizes(container)).toEqual(resized);
    expect(screen.getAllByRole('separator')).toHaveLength(2);
  });

  it('窗口缩小只限制显示宽度，放大时恢复先前拖拽偏好', () => {
    const { container } = render(<Harness/>);
    drag(divider('directory'), 20);
    drag(divider('information'), 35);
    const resized = sizes(container);
    vi.stubGlobal('innerWidth', 1040);
    fireEvent(window, new Event('resize'));
    expect(sizes(container)).toEqual({ directory: 200, information: 420, right: 420, contentStart: 620 });
    vi.stubGlobal('innerWidth', 1280);
    fireEvent(window, new Event('resize'));
    expect(sizes(container)).toEqual(resized);
  });

  it('离开后重挂载恢复默认宽度，刷新等价重置且不写浏览器存储', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem');
    const { container, rerender } = render(<Harness key="first"/>);
    const original = sizes(container);
    drag(divider('directory'), 20);
    expect(sizes(container).directory).toBe(original.directory + 20);
    rerender(<div>离开成果页</div>);
    rerender(<Harness key="second"/>);
    expect(sizes(container)).toEqual(original);
    expect(write).not.toHaveBeenCalled();
  });
});
