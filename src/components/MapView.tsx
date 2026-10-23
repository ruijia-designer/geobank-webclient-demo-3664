import { useEffect, useId, useRef, useState } from 'react';
import { Layers, RotateCcw, ChevronUp, ChevronDown, Plus, Minus, Globe, Check, LocateFixed } from 'lucide-react';
import type { Project } from '../types';
import { isProjectInViewport, mapWorldTransform, projectLayer, projectMapPoint, resolveMapGeometry } from '../services/mapView';
import type { Basemap } from '../services/mapView';
import { projectTypeColor } from '../services/projectClassification';
import { useTranslation } from '../i18n';
import './map.css';

export interface MapViewProps {
  projects: Project[]; selectedId: string | null; zoom: number; collapsed: boolean;
  colorMode?: 'type' | 'year'; kind?: 'project' | 'data'; onToggle: () => void;
  onRefresh: () => void; onZoom: (n: number) => void; onLocate?: (id: string) => void;
  onVisibleProjectsChange?: (ids: string[]) => void;
}
export function MapView({ projects, selectedId, zoom, collapsed, colorMode = 'type', kind = 'project', onToggle, onRefresh, onZoom, onLocate, onVisibleProjectsChange }: MapViewProps) {
  const { t } = useTranslation();
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [acquisitionOpen, setAcquisitionOpen] = useState(true), [boundaryOpen, setBoundaryOpen] = useState(true);
  const [refreshing, setRefreshing] = useState(false), [basemap, setBasemap] = useState<Basemap>('imagery'), [basemapOpen, setBasemapOpen] = useState(false);
  const containerRef = useRef<HTMLElement>(null), menuRef = useRef<HTMLDivElement>(null), basemapButton = useRef<HTMLButtonElement>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reportedVisibleIds = useRef<string[] | null>(null);
  const [geometry, setGeometry] = useState(() => resolveMapGeometry(1200, 800));
  const panelId = useId(), menuId = useId();
  const selected = projects.find(p => p.id === selectedId), label = kind === 'project' ? '项目类型' : '数据类型';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const rect = container.getBoundingClientRect();
      const next = resolveMapGeometry(rect.width || container.clientWidth, rect.height || container.clientHeight);
      setGeometry(current => current.viewportWidth === next.viewportWidth && current.viewportHeight === next.viewportHeight ? current : next);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(container);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, []);
  useEffect(() => {
    if (!onVisibleProjectsChange) { reportedVisibleIds.current = null; return; }
    const ids = projects.filter(project => isProjectInViewport(project, geometry, zoom, selected)).map(project => project.id);
    const previous = reportedVisibleIds.current;
    if (previous && previous.length === ids.length && previous.every((id, index) => id === ids[index])) return;
    reportedVisibleIds.current = ids;
    onVisibleProjectsChange(ids);
  }, [projects, geometry, zoom, selected, onVisibleProjectsChange]);
  useEffect(() => () => { if (refreshTimer.current) clearTimeout(refreshTimer.current); }, []);
  useEffect(() => {
    if (!basemapOpen) return;
    const click = (event: MouseEvent) => { if (!menuRef.current?.contains(event.target as Node)) setBasemapOpen(false); };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setBasemapOpen(false); basemapButton.current?.focus(); }
    };
    document.addEventListener('click', click); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('click', click); document.removeEventListener('keydown', key); };
  }, [basemapOpen]);

  const reset = () => {
    setChecks({}); setAcquisitionOpen(true); setBoundaryOpen(true); setBasemapOpen(false);
    onRefresh(); setRefreshing(true);
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(() => setRefreshing(false), 450);
  };
  const toggleCheck = (name: string) => setChecks(v => ({ ...v, [name]: v[name] === false }));
  const nodes = kind === 'project' ? ['采集', '处理', '解释', '井筒', '非地震'] : ['采集', '边界', '障碍物', '观测系统', '表层调查点'];
  const row = (name: string, indent = false, depth = 1) => {
    const expandable = name === '采集' || kind === 'data' && name === '边界';
    const open = name === '边界' ? boundaryOpen : acquisitionOpen;
    return <div className={'layer-row' + (indent ? ' indent' : '')} key={name} style={indent ? { paddingLeft: 24 * depth } : undefined}>
      {expandable ? <button className="layer-disclosure" aria-label={t((open ? '收起' : '展开') + name)} aria-expanded={open} onClick={() => name === '边界' ? setBoundaryOpen(v => !v) : setAcquisitionOpen(v => !v)}>{open ? <ChevronUp size={18}/> : <ChevronDown size={18}/>}</button> : <span className="layer-disclosure" aria-hidden="true"/>}
      <label><input type="checkbox" checked={checks[name] !== false} onChange={() => toggleCheck(name)}/><span className="layer-color" style={{ background: kind === 'project' ? projectTypeColor({ type: name }) : name === '处理' ? '#8874b0' : name === '解释' ? '#c68457' : name === '井筒' ? '#49a397' : '#249bb9' }}/><span className="layer-name" title={t(name)}>{t(name)}</span></label>
    </div>;
  };
  const chooseBasemap = (next: Basemap) => { setBasemap(next); setBasemapOpen(false); basemapButton.current?.focus(); };

  return <section ref={containerRef} className="map-view" aria-label={t('项目地图')} data-basemap={basemap}>
    <div className="map-scene" style={{ width: geometry.width, height: geometry.height, left: geometry.left, top: geometry.top, transform: mapWorldTransform(geometry, zoom, selected) }}>
      <img src={basemap === 'imagery' ? './assets/satellite-map.webp' : './assets/schematic-map.svg'} alt={t(basemap === 'imagery' ? '项目区域卫星影像' : '地理示意地图（非测绘数据）')} draggable={false}/>
      {projects.filter(p => checks[projectLayer(p.type, p.typePath)] !== false && checks[p.type] !== false).map(p => {
        const { x, y } = projectMapPoint(p);
        const c = colorMode === 'year' ? (p.year === '2024' ? '#249bb9' : '#c68457') : projectTypeColor(p);
        return <button key={p.id} className={'map-point' + (selectedId === p.id ? ' selected' : '')} style={{ left: x * 100 + '%', top: y * 100 + '%', color: c }} title={p.name} aria-label={t('定位项目：') + p.name} onClick={() => onLocate?.(p.id)}><span className="region-polygon"/><span className="point-core"/><span className="point-caption">{selectedId === p.id ? p.basin + ' · ' + p.type : p.name}</span></button>;
      })}
    </div>
    <div className="map-layer-controls"><div className="layer-toolbar"><button className="layer-pill" onClick={onToggle} aria-expanded={!collapsed} aria-controls={panelId} title={t((collapsed ? '展开' : '收起') + label)}><Layers size={25}/><span>{t(label)}</span>{collapsed ? <ChevronDown size={18}/> : <ChevronUp size={18}/>}</button></div>
      {!collapsed && <div id={panelId} className="map-layer-panel"><header>
        <button className={'layer-reset' + (refreshing ? ' rotating' : '')} onClick={reset} title={t('重置' + label)} aria-label={t('重置' + label)}><RotateCcw size={25} strokeWidth={2}/><span>{t('重置')}</span></button>
      </header><div>{row('采集')}{kind === 'project' ? <>{acquisitionOpen && ['三维陆上常规采集', '三维陆上混叠采集'].map(n => row(n, true))}{nodes.slice(1).map(n => row(n))}</> : acquisitionOpen && <>{row('边界', true)}{boundaryOpen && ['满覆盖边界', '激发点边界', '接收点边界'].map(n => row(n, true, 2))}{nodes.slice(2).map(n => row(n, true))}</>}</div></div>}
    </div>
    <div className="map-zoom"><button className="map-round" aria-label={t('放大地图')} onClick={() => onZoom(Math.min(4, zoom + .4))}><Plus/></button><button className="map-round" aria-label={t('缩小地图')} onClick={() => onZoom(Math.max(1, zoom - .4))}><Minus/></button>
      <div className="basemap-control" ref={menuRef}><button ref={basemapButton} className="map-round" title={t('切换底图')} aria-label={t('切换底图')} aria-haspopup="menu" aria-controls={menuId} aria-expanded={basemapOpen} onClick={() => setBasemapOpen(v => !v)}><Globe/></button>
        {basemapOpen && <div id={menuId} className="basemap-options" role="menu" aria-label={t('底图类型')}><strong>{t('切换底图')}</strong><button role="menuitemradio" aria-checked={basemap === 'map'} onClick={() => chooseBasemap('map')}><span className="basemap-thumb schematic"/><span className="basemap-label"><span>{t('地图')}</span><small>{t('地理示意')}</small></span>{basemap === 'map' && <Check size={16}/>}</button><button role="menuitemradio" aria-checked={basemap === 'imagery'} onClick={() => chooseBasemap('imagery')}><span className="basemap-thumb imagery"/><span className="basemap-label"><span>{t('影像')}</span><small>{t('设计参考影像')}</small></span>{basemap === 'imagery' && <Check size={16}/>}</button></div>}
      </div>
    </div>
    <div className="coordinates" title={t('固定演示坐标，非实时定位数据')}><LocateFixed size={20} aria-label={t('圆形定位图标')}/><span className="coordinates-divider" aria-hidden="true"/><span className="coordinates-value">136.23° E, 39.89° N, 10.81</span></div>
    {basemap === 'map' && <div className="map-demo-attribution" title={t('本地简化地理示意，不用于测绘或项目边界判断')}>{t('地图 · 地理示意，非测绘数据')}</div>}
  </section>;
}
