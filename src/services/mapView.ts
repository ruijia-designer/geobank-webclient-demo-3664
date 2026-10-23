import type { Project } from '../types';

// Both offline backgrounds use the same world rectangle. Project points are
// inherited from the Sketch demonstration, rather than longitude/latitude.
export const MAP_WORLD = { width: 2801, height: 1737 };
export type Basemap = 'imagery' | 'map';
export interface MapGeometry { width: number; height: number; left: number; top: number; viewportWidth: number; viewportHeight: number }
export interface MapWorldTransform { translateX: number; translateY: number; scale: number }

export function projectMapPoint(project: Project) {
  return { x: (project.point[0] - 390 + 840) / 2380, y: (project.point[1] - 64 + 84) / 1190 };
}

export function resolveMapGeometry(viewportWidth: number, viewportHeight: number): MapGeometry {
  const w = Number.isFinite(viewportWidth) && viewportWidth > 0 ? viewportWidth : 1200;
  const h = Number.isFinite(viewportHeight) && viewportHeight > 0 ? viewportHeight : 800;
  const scale = Math.max(w / MAP_WORLD.width, h / MAP_WORLD.height);
  const width = MAP_WORLD.width * scale, height = MAP_WORLD.height * scale;
  return { width, height, left: (w - width) / 2, top: (h - height) / 2, viewportWidth: w, viewportHeight: h };
}

export function resolveMapWorldTransform(geometry: MapGeometry, zoom: number, selected?: Project): MapWorldTransform {
  const z = Number.isFinite(zoom) ? Math.max(1, Math.min(4, zoom)) : 1;
  const clamp = (n: number, limit: number) => Math.max(-limit, Math.min(limit, n));
  const point = selected ? projectMapPoint(selected) : { x: .5, y: .5 };
  const x = selected ? -.02 * geometry.viewportWidth - (point.x - .5) * geometry.width * z : 0;
  const y = selected ? -(point.y - .5) * geometry.height * z : 0;
  return { translateX: clamp(x, (geometry.width * z - geometry.viewportWidth) / 2), translateY: clamp(y, (geometry.height * z - geometry.viewportHeight) / 2), scale: z };
}

export function mapWorldTransform(geometry: MapGeometry, zoom: number, selected?: Project) {
  const { translateX, translateY, scale } = resolveMapWorldTransform(geometry, zoom, selected);
  return `translate(${translateX}px,${translateY}px) scale(${scale})`;
}

export function projectViewportPoint(project: Project, geometry: MapGeometry, zoom: number, selected?: Project) {
  const point = projectMapPoint(project);
  const { translateX, translateY, scale } = resolveMapWorldTransform(geometry, zoom, selected);
  // The world is positioned with left/top, then scaled about its centre and
  // translated in viewport pixels, exactly as .map-scene is rendered.
  return {
    x: geometry.left + geometry.width / 2 + (point.x - .5) * geometry.width * scale + translateX,
    y: geometry.top + geometry.height / 2 + (point.y - .5) * geometry.height * scale + translateY,
  };
}

export function isProjectInViewport(project: Project, geometry: MapGeometry, zoom: number, selected?: Project) {
  const { x, y } = projectViewportPoint(project, geometry, zoom, selected);
  return x >= 0 && x <= geometry.viewportWidth && y >= 0 && y <= geometry.viewportHeight;
}

export function projectLayer(type: string, typePath: readonly string[] = []) {
  // A custom leaf may contain none of the five category words. Its stored
  // ancestry identifies the checkbox that owns it, before legacy-name fallback.
  const root = typePath.find(part => ['采集', '处理', '解释', '井筒', '非地震'].includes(part));
  if (root) return root;
  if (type.includes('非地震')) return '非地震';
  if (type.includes('采集')) return '采集';
  if (type.includes('处理')) return '处理';
  if (type.includes('解释')) return '解释';
  return '井筒';
}
