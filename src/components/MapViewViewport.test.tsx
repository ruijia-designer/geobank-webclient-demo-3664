import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MapView } from './MapView';
import type { MapViewProps } from './MapView';
import type { Project } from '../types';
import { PROJECTS } from '../services/demo';

const at = (id: string, x: number, y = .5): Project => ({ ...PROJECTS[0], id, name: id, point: [x * 2380 - 450, y * 1190 - 20] });
const props = (): MapViewProps => ({ projects: [at('centre', .5), at('east', .85)], selectedId: null, zoom: 1, collapsed: false, onToggle: vi.fn(), onRefresh: vi.fn(), onZoom: vi.fn() });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('地图视野项目通知', () => {
  it('随缩放、选中定位及项目位置变化报告，保留完整项目作为镜头输入', () => {
    const onVisibleProjectsChange = vi.fn(), p = props();
    const { rerender } = render(<MapView {...p} onVisibleProjectsChange={onVisibleProjectsChange}/>);
    expect(onVisibleProjectsChange).toHaveBeenLastCalledWith(['centre', 'east']);
    rerender(<MapView {...p} zoom={2} onVisibleProjectsChange={onVisibleProjectsChange}/>);
    expect(onVisibleProjectsChange).toHaveBeenLastCalledWith(['centre']);
    rerender(<MapView {...p} zoom={2} selectedId="east" onVisibleProjectsChange={onVisibleProjectsChange}/>);
    expect(onVisibleProjectsChange).toHaveBeenLastCalledWith(['east']);
    expect(screen.getByRole('button', { name: '定位项目：centre' })).toBeInTheDocument();
    rerender(<MapView {...p} projects={[at('centre', .84), p.projects[1]]} zoom={2} selectedId="east" onVisibleProjectsChange={onVisibleProjectsChange}/>);
    expect(onVisibleProjectsChange).toHaveBeenLastCalledWith(['centre', 'east']);
    expect(onVisibleProjectsChange).toHaveBeenCalledTimes(4);
  });

  it('ResizeObserver及窗口resize重新测量实际容器，尺寸不变时不重复通知', () => {
    let width = 1200, resizeObserverCallback: (() => void) | undefined;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ x: 0, y: 0, left: 0, top: 0, right: width, bottom: 800, width, height: 800, toJSON: () => ({}) }));
    class Observer {
      constructor(callback: () => void) { resizeObserverCallback = callback; }
      observe() {} disconnect() {}
    }
    vi.stubGlobal('ResizeObserver', Observer);
    const onVisibleProjectsChange = vi.fn();
    render(<MapView {...props()} projects={[at('west', .05), at('centre', .5)]} onVisibleProjectsChange={onVisibleProjectsChange}/>);
    expect(onVisibleProjectsChange).toHaveBeenLastCalledWith(['west', 'centre']);
    width = 600;
    act(() => resizeObserverCallback!());
    expect(onVisibleProjectsChange).toHaveBeenLastCalledWith(['centre']);
    fireEvent(window, new Event('resize'));
    expect(onVisibleProjectsChange).toHaveBeenCalledTimes(2);
    width = 1200; fireEvent(window, new Event('resize'));
    expect(onVisibleProjectsChange).toHaveBeenLastCalledWith(['west', 'centre']);
  });

  it('树复选框不影响视野通知，父组件的新回调和等值项目不会造成反馈循环', () => {
    const report = vi.fn();
    function Harness() {
      const [ids, setIds] = useState<string[]>([]);
      return <><output aria-label="可见项目">{ids.join(',')}</output><MapView {...props()} onVisibleProjectsChange={next => { report(next); setIds(next); }}/></>;
    }
    render(<Harness/>);
    expect(screen.getByLabelText('可见项目')).toHaveTextContent('centre,east');
    expect(report).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('checkbox', { name: '采集' }));
    expect(screen.queryByRole('button', { name: '定位项目：centre' })).not.toBeInTheDocument();
    expect(report).toHaveBeenCalledOnce();
  });
});
