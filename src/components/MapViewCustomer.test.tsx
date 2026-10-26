import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapView } from './MapView';
import type { MapViewProps } from './MapView';
import { PROJECTS } from '../services/demo';
import { mapWorldTransform, projectLayer, projectMapPoint, projectViewportPoint, resolveMapGeometry } from '../services/mapView';
import { demoRows } from '../services/baseline';
import { projectTypeColor } from '../services/projectClassification';
import { LanguageProvider, useTranslation } from '../i18n';

const originalTypes = demoRows.types.map(row => ({ ...row }));
afterEach(() => { vi.restoreAllMocks(); demoRows.types = originalTypes.map(row => ({ ...row })); sessionStorage.removeItem('geobank-demo-locale'); });
const props = (): MapViewProps => ({ projects: PROJECTS, selectedId: '0', zoom: 2.2, collapsed: false, onToggle: vi.fn(), onRefresh: vi.fn(), onZoom: vi.fn(), onLocate: vi.fn() });

describe('客户确认的地图控件', () => {
  it('蓝色标题只保留重置按钮，图标规范与白色类型入口一致', async () => {
    const user = userEvent.setup(), p = props();
    render(<MapView {...p}/>);
    const reset = screen.getByRole('button', { name: '重置项目类型' });
    const header = reset.closest('.map-layer-panel header')!;
    expect(header.children).toHaveLength(1); expect(header.firstElementChild).toBe(reset);
    expect(reset).toHaveTextContent(/^重置$/);
    expect(header.querySelector('strong')).toBeNull();
    expect(header.querySelector('.lucide-layers')).toBeNull();
    expect(header.querySelector('.lucide-chevron-up')).toBeNull();
    const resetIcon = reset.querySelector('svg')!;
    const pill = screen.getByRole('button', { name: '项目类型' });
    const pillIcon = pill.querySelector('svg')!;
    expect(resetIcon.getAttribute('width')).toBe('25');
    expect(resetIcon.getAttribute('width')).toBe(pillIcon.getAttribute('width'));
    expect(resetIcon.getAttribute('stroke-width')).toBe('2');
    expect(resetIcon.getAttribute('stroke-width')).toBe(pillIcon.getAttribute('stroke-width'));
    expect(pill).toHaveAttribute('aria-expanded', 'true');
    expect(screen.queryByRole('button', { name: '刷新地图' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: '采集' }));
    expect(screen.queryByRole('button', { name: '定位项目：' + PROJECTS[0].name })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '收起采集' }));
    expect(screen.queryByRole('checkbox', { name: '三维陆上常规采集' })).not.toBeInTheDocument();
    await user.click(reset);
    expect(screen.getByRole('checkbox', { name: '采集' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: '三维陆上常规采集' })).toBeChecked();
    expect(screen.getByRole('button', { name: '定位项目：' + PROJECTS[0].name })).toBeInTheDocument();
    expect(p.onRefresh).toHaveBeenCalledTimes(1); expect(p.onToggle).not.toHaveBeenCalled();
  });
  it('数据类型共享重置行为，恢复边界子组', async () => {
    const user = userEvent.setup(); render(<MapView {...props()} kind="data"/>);
    await user.click(screen.getByRole('checkbox', { name: '满覆盖边界' }));
    await user.click(screen.getByRole('button', { name: '收起边界' }));
    await user.click(screen.getByRole('button', { name: '重置数据类型' }));
    expect(screen.getByRole('button', { name: '重置数据类型' })).toHaveTextContent(/^重置$/);
    expect(screen.getByRole('checkbox', { name: '满覆盖边界' })).toBeChecked();
    expect(screen.getByRole('button', { name: '收起边界' })).toHaveAttribute('aria-expanded', 'true');
  });
  it('外层收起时只保留白色展开按钮，没有额外重置入口', async () => {
    const user = userEvent.setup(), p = props(); render(<MapView {...p} collapsed/>);
    expect(screen.queryByRole('button', { name: /重置/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '项目类型' }));
    expect(p.onToggle).toHaveBeenCalledTimes(1); expect(p.onRefresh).not.toHaveBeenCalled();
  });
  it('地球按钮提供真实本地底图切换，并明确地图示意性质', async () => {
    const user = userEvent.setup(), p = props(); const { container } = render(<MapView {...p}/>);
    const scene = container.querySelector('.map-scene') as HTMLElement, transform = scene.style.transform;
    const point = screen.getByRole('button', { name: '定位项目：' + PROJECTS[0].name }), location = [point.style.left, point.style.top];
    await user.click(screen.getByRole('button', { name: '切换底图' }));
    expect(screen.getByRole('menu', { name: '底图类型' })).toBeInTheDocument(); expect(screen.getAllByRole('menuitemradio')).toHaveLength(2);
    const mapOption = screen.getByRole('menuitemradio', { name: /^地图/ });
    const imageryOption = screen.getByRole('menuitemradio', { name: /^影像/ });
    expect(mapOption.querySelector('.basemap-thumb.schematic')).not.toBeNull();
    expect(imageryOption.querySelector('.basemap-thumb.imagery')).not.toBeNull();
    await user.click(screen.getByRole('menuitemradio', { name: /^地图/ }));
    expect(screen.getByAltText('地理示意地图（非测绘数据）')).toHaveAttribute('src', './assets/schematic-map.svg');
    expect(screen.getByText('地图 · 地理示意，非测绘数据')).toBeInTheDocument();
    expect(scene.style.transform).toBe(transform); expect([point.style.left, point.style.top]).toEqual(location);
    expect(p.onRefresh).not.toHaveBeenCalled(); expect(p.onZoom).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: '切换底图' })); await user.click(screen.getByRole('menuitemradio', { name: /^影像/ }));
    expect(screen.getByAltText('项目区域卫星影像')).toHaveAttribute('src', './assets/satellite-map.webp');
  });
  it('底图菜单支持外部点击、Esc和键盘触发，坐标使用圆形定位图标', async () => {
    const user = userEvent.setup(); render(<MapView {...props()}/>);
    const trigger = screen.getByRole('button', { name: '切换底图' }); trigger.focus(); await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true'); await user.keyboard('{Escape}');
    expect(trigger).toHaveAttribute('aria-expanded', 'false'); expect(trigger).toHaveFocus();
    await user.click(trigger); await user.click(document.body); expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    const icon = screen.getByLabelText('圆形定位图标'); expect(icon).toHaveClass('lucide-locate-fixed');
    const coordinates = icon.closest('.coordinates')!;
    expect(coordinates).toHaveAttribute('title', '固定演示坐标，非实时定位数据');
    expect(icon).toHaveAttribute('width', '20');
    expect(coordinates.querySelector('.coordinates-divider')).toHaveAttribute('aria-hidden', 'true');
    expect(coordinates.querySelector('.coordinates-value')).toHaveTextContent('136.23° E, 39.89° N, 10.81');
  });
  it('容器调宽后范围跟随底图，独立标记仍投影到同一地理位置', () => {
    let width = 1200;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ x: 0, y: 0, left: 0, top: 0, right: width, bottom: 800, width, height: 800, toJSON: () => ({}) }));
    const { container } = render(<MapView {...props()}/>);
    const scene = container.querySelector('.map-scene') as HTMLElement, image = screen.getByAltText('项目区域卫星影像');
    const point = screen.getByRole('button', { name: '定位项目：' + PROJECTS[0].name });
    const region = scene.querySelector('.region-polygon') as HTMLElement;
    expect(image.parentElement).toBe(scene);
    expect(point.closest('.map-scene')).toBeNull();
    expect(point.parentElement).toHaveClass('map-marker-layer');
    expect(parseFloat(region.style.left)).toBeCloseTo(projectMapPoint(PROJECTS[0]).x * 100);
    for (const viewportWidth of [1200, 1700]) {
      width = viewportWidth; fireEvent(window, new Event('resize'));
      const geometry = resolveMapGeometry(width, 800);
      const expected = projectViewportPoint(PROJECTS[0], geometry, 2.2, PROJECTS[0]);
      expect(parseFloat(point.style.left)).toBeCloseTo(expected.x);
      expect(parseFloat(point.style.top)).toBeCloseTo(expected.y);
      expect(scene.style.width).toBe(geometry.width + 'px');
      expect(scene.style.transform).toBe(mapWorldTransform(geometry, 2.2, PROJECTS[0]));
    }
  });
  it('缩放仅作用于底图和范围，标签与圆点保持在不缩放的显示层', () => {
    const p = props(), { container, rerender } = render(<MapView {...p} zoom={1}/>);
    const point = screen.getByRole('button', { name: '定位项目：' + PROJECTS[1].name });
    const geometry = resolveMapGeometry(1200, 800);
    for (const zoom of [1, 2.2, 4, 9]) {
      rerender(<MapView {...p} zoom={zoom}/>);
      const expected = projectViewportPoint(PROJECTS[1], geometry, zoom, PROJECTS[0]);
      expect(parseFloat(point.style.left)).toBeCloseTo(expected.x);
      expect(parseFloat(point.style.top)).toBeCloseTo(expected.y);
      expect(point.querySelector('.point-caption')?.closest('.map-scene')).toBeNull();
      expect(point.querySelector('.point-core')?.closest('.map-scene')).toBeNull();
      expect(container.querySelectorAll('.map-scene .region-polygon')).toHaveLength(PROJECTS.length);
      expect(point.querySelector('.region-polygon')).toBeNull();
      expect(container.querySelector('.map-marker-layer')).not.toHaveAttribute('style');
    }
  });
  it('按钮缩放仍使用原props回调，重置不改变外层收起状态', async () => {
    const user = userEvent.setup(), refresh = vi.fn();
    function Harness() { const [zoom, setZoom] = useState(2.2), [collapsed, setCollapsed] = useState(false); return <MapView {...props()} zoom={zoom} collapsed={collapsed} onToggle={() => setCollapsed(v => !v)} onZoom={setZoom} onRefresh={() => { refresh(); setZoom(1); }}/>; }
    const { container } = render(<Harness/>); await user.click(screen.getByRole('button', { name: '放大地图' }));
    expect((container.querySelector('.map-scene') as HTMLElement).style.transform).toContain('scale(2.6)');
    await user.click(screen.getByRole('button', { name: '重置项目类型' })); expect((container.querySelector('.map-scene') as HTMLElement).style.transform).toContain('scale(1)');
    expect(screen.getByRole('button', { name: '重置项目类型' })).toBeInTheDocument(); expect(refresh).toHaveBeenCalledOnce();
  });
  it('非地震项目归入自身图层，避免与井筒开关混用', () => { expect(projectLayer('非地震项目')).toBe('非地震'); expect(projectLayer('三维陆上处理')).toBe('处理'); });
  it('地图点与图层色标读取可编辑分类颜色，三级叶类型按上级采集筛选', async () => {
    const user = userEvent.setup();
    demoRows.types.find(row => row.id === '1')!.color = '#F11122';
    demoRows.types.push({ id: 'map-custom-leaf', name: '高密度试验', parent: '2', level: 3, color: '#123ABC' });
    const custom = { ...PROJECTS[0], id: 'created-map', type: '高密度试验', typeId: 'map-custom-leaf', typePath: ['采集', '三维陆上常规采集', '高密度试验'] };
    render(<MapView {...props()} projects={[custom]} selectedId={custom.id}/>);
    const markerName = '定位项目：' + custom.name;
    expect(screen.getByRole('button', { name: markerName })).toHaveStyle({ color: projectTypeColor(custom) });
    expect(screen.getByRole('checkbox', { name: '采集' }).closest('label')!.querySelector('.layer-color')).toHaveStyle({ background: '#F11122' });
    await user.click(screen.getByRole('checkbox', { name: '井筒' }));
    expect(screen.getByRole('button', { name: markerName })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: '采集' }));
    expect(screen.queryByRole('button', { name: markerName })).not.toBeInTheDocument();
    expect(projectLayer('高密度试验', custom.typePath)).toBe('采集');
    expect(projectLayer('井筒参考叶', ['非地震', '其他', '井筒参考叶'])).toBe('非地震');
  });
  it('按年度配色保留既有年度色，不受分类改色影响', () => {
    demoRows.types.find(row => row.id === '2')!.color = '#FF0000';
    render(<MapView {...props()} colorMode="year"/>);
    expect(screen.getByRole('button', { name: '定位项目：' + PROJECTS[0].name })).toHaveStyle({ color: '#249bb9' });
    expect(screen.getByRole('button', { name: '定位项目：' + PROJECTS[2].name })).toHaveStyle({ color: '#c68457' });
  });
  it('切换英文翻译控件但保留图层状态和项目名，英文Reset恢复同一默认状态', async () => {
    const user = userEvent.setup(), p = props();
    sessionStorage.removeItem('geobank-demo-locale');
    function Harness() {
      const { toggleLocale } = useTranslation();
      return <><button onClick={toggleLocale}>Test language</button><MapView {...p}/></>;
    }
    render(<LanguageProvider><Harness/></LanguageProvider>);
    await user.click(screen.getByRole('checkbox', { name: '处理' }));
    expect(screen.getByRole('checkbox', { name: '处理' })).not.toBeChecked();
    await user.click(screen.getByRole('button', { name: 'Test language' }));
    expect(screen.getByRole('button', { name: 'Project type' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('checkbox', { name: 'Processing' })).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Locate project: ' + PROJECTS[0].name })).not.toHaveAttribute('title');
    const otherPoint = screen.getByRole('button', { name: 'Locate project: ' + PROJECTS[1].name });
    expect(otherPoint).not.toHaveAttribute('title');
    expect(otherPoint.querySelector('.point-caption')).toHaveTextContent(PROJECTS[1].name);
    const reset = screen.getByRole('button', { name: 'Reset project types' });
    expect(reset).toHaveTextContent(/^Reset$/);
    await user.click(reset);
    expect(screen.getByRole('checkbox', { name: 'Processing' })).toBeChecked();
    expect(p.onRefresh).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Switch basemap' }));
    await user.click(screen.getByRole('menuitemradio', { name: /^Map/ }));
    expect(screen.getByAltText('Schematic geographic map (not survey data)')).toBeInTheDocument();
    expect(screen.getByText('Map · geographic schematic, not survey data')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Test language' }));
    expect(screen.getByRole('button', { name: '重置项目类型' })).toHaveTextContent(/^重置$/);
    expect(screen.getByRole('checkbox', { name: '处理' })).toBeChecked();
  });
});
