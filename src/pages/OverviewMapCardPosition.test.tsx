import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppApi, AppState } from '../types';
import { initialState, PROJECTS } from '../services/demo';
import OverviewPage from './OverviewPage';

let api: AppApi, width = 1200;
function Harness() {
  const [state, setState] = useState<AppState>(() => initialState('admin'));
  api = { state, setState, navigate: vi.fn(), openProject: vi.fn(), notify: vi.fn(), deny: vi.fn() };
  return <OverviewPage api={api}/>;
}
beforeEach(() => {
  width = 1200;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function(this: HTMLElement) {
    const w = this.matches('.floating-project') ? 390 : width;
    const h = this.matches('.floating-project') ? 550 : 800;
    return { x: 0, y: 0, left: 0, top: 0, right: w, bottom: h, width: w, height: h, toJSON: () => ({}) };
  });
});
afterEach(() => vi.restoreAllMocks());

describe('项目详情跟随地图项目位置', () => {
  it('点击不同地图项目保持镜头和缩放，卡片随各自标记移动', async () => {
    const user = userEvent.setup(); const { container } = render(<Harness/>);
    const scene = container.querySelector('.map-scene') as HTMLElement;
    const original = scene.style.transform;
    const first = screen.getByRole('button', { name: '定位项目：' + PROJECTS[0].name });
    await user.click(first);
    let card = screen.getByRole('region', { name: '项目详情' });
    expect(first.querySelector('.point-caption')).toBeNull();
    const firstLeft = parseFloat(card.style.left);
    expect(card.closest('.map-view')).not.toBeNull();
    expect(firstLeft + parseFloat(card.style.width)).toBeCloseTo(parseFloat(first.style.left) - 24);
    expect(scene.style.transform).toBe(original); expect(api.state.mapZoom).toBe(1);
    const second = screen.getByRole('button', { name: '定位项目：' + PROJECTS[1].name });
    await user.click(second);
    card = screen.getByRole('region', { name: '项目详情' });
    expect(second.querySelector('.point-caption')).toBeNull();
    expect(first.querySelector('.point-caption')).toHaveTextContent(PROJECTS[0].name);
    expect(card.style.left).not.toBe(firstLeft + 'px');
    expect(card).toHaveAttribute('data-placement', 'right');
    expect(parseFloat(card.style.left)).toBeCloseTo(parseFloat(second.style.left) + 24);
    expect(scene.style.transform).toBe(original); expect(api.state.mapZoom).toBe(1);
    await user.click(screen.getByRole('button', { name: '关闭项目详情' }));
    expect(screen.queryByRole('region', { name: '项目详情' })).not.toBeInTheDocument();
    expect(second.querySelector('.point-caption')).toHaveTextContent(PROJECTS[1].name);
    expect(scene.style.transform).toBe(original);
  });

  it('列表定位后选择其他地图点或关闭卡片不回弹镜头，尺寸变化继续对齐', async () => {
    const user = userEvent.setup(); const { container } = render(<Harness/>);
    const listItem = screen.getByRole('button', { name: '项目：' + PROJECTS[0].name });
    fireEvent.keyDown(listItem, { key: ' ' });
    expect(screen.getByRole('region', { name: '项目详情' })).toBeVisible();
    expect(screen.getByRole('button', { name: '定位项目：' + PROJECTS[0].name }).querySelector('.point-caption')).toBeNull();
    const scene = container.querySelector('.map-scene') as HTMLElement;
    const focusedTransform = scene.style.transform;
    expect(api.state.mapZoom).toBe(2.2);
    await user.click(screen.getByRole('button', { name: '定位项目：' + PROJECTS[1].name }));
    expect(scene.style.transform).toBe(focusedTransform); expect(api.state.mapZoom).toBe(2.2);
    const oldLeft = screen.getByRole('region', { name: '项目详情' }).style.left;
    width = 1600; fireEvent(window, new Event('resize'));
    const card = screen.getByRole('region', { name: '项目详情' });
    const point = screen.getByRole('button', { name: '定位项目：' + PROJECTS[1].name });
    expect(card.style.left).not.toBe(oldLeft);
    expect(parseFloat(card.style.left)).toBeCloseTo(parseFloat(point.style.left) + 24);
    expect(parseFloat(card.style.top)).toBeGreaterThanOrEqual(16);
    expect(parseFloat(card.style.top) + 550).toBeLessThanOrEqual(784);
    const resizedTransform = scene.style.transform;
    await user.click(screen.getByRole('button', { name: '关闭项目详情' }));
    expect(scene.style.transform).toBe(resizedTransform);
    act(() => api.setState(state => ({ ...state, selectedProjectId: PROJECTS[1].id, mapZoom: 2.6 })));
    const zoomed = screen.getByRole('region', { name: '项目详情' });
    const zoomedPoint = screen.getByRole('button', { name: '定位项目：' + PROJECTS[1].name });
    expect(parseFloat(zoomed.style.left)).toBeCloseTo(parseFloat(zoomedPoint.style.left) + 24);
  });
});
