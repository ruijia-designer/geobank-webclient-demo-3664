import { describe, expect, it } from 'vitest';
import type { Project } from '../types';
import { PROJECTS } from './demo';
import { isProjectInViewport, mapWorldTransform, projectViewportPoint, resolveMapGeometry, resolveMapWorldTransform } from './mapView';

function at(x: number, y: number): Project {
  return { ...PROJECTS[0], point: [x * 2380 - 450, y * 1190 - 20] };
}

describe('地图视野坐标', () => {
  it('包含贴边点，排除视野外及无效点，保持与覆盖容器的世界几何一致', () => {
    const geometry = resolveMapGeometry(2801, 1737);
    expect(projectViewportPoint(at(.5, .5), geometry, 1)).toEqual({ x: 1400.5, y: 868.5 });
    expect(isProjectInViewport(at(0, 0), geometry, 1)).toBe(true);
    expect(isProjectInViewport(at(1, 1), geometry, 1)).toBe(true);
    expect(isProjectInViewport(at(-.001, .5), geometry, 1)).toBe(false);
    expect(isProjectInViewport(at(.5, 1.001), geometry, 1)).toBe(false);
    expect(isProjectInViewport(at(NaN, .5), geometry, 1)).toBe(false);
  });

  it('缩放裁掉边缘项目，选中定位后使用同一平移恢复可见', () => {
    const geometry = resolveMapGeometry(1200, 800), east = at(.75, .5), centre = at(.5, .5);
    expect(isProjectInViewport(east, geometry, 1)).toBe(true);
    expect(isProjectInViewport(east, geometry, 2)).toBe(false);
    expect(isProjectInViewport(east, geometry, 2, east)).toBe(true);
    expect(isProjectInViewport(centre, geometry, 2, east)).toBe(false);
    expect(projectViewportPoint(east, geometry, 2, east).x).toBeCloseTo(576);
    expect(projectViewportPoint(east, geometry, 2, east).y).toBeCloseTo(400);
  });

  it('选中靠近地图边界的项目时，视野计算使用镜头夹取后的实际位置', () => {
    const geometry = resolveMapGeometry(1200, 800), edge = at(.99, .5);
    const transform = resolveMapWorldTransform(geometry, 2, edge);
    expect(transform.translateX).toBeCloseTo((geometry.viewportWidth - geometry.width * 2) / 2);
    expect(projectViewportPoint(edge, geometry, 2, edge).x).toBeGreaterThan(1100);
    expect(isProjectInViewport(edge, geometry, 2, edge)).toBe(true);
    expect(mapWorldTransform(geometry, 2, edge)).toBe(`translate(${transform.translateX}px,${transform.translateY}px) scale(2)`);
  });

  it('容器变窄时按裁剪范围更新项目可见性', () => {
    const west = at(.05, .5);
    expect(isProjectInViewport(west, resolveMapGeometry(1200, 800), 1)).toBe(true);
    expect(isProjectInViewport(west, resolveMapGeometry(600, 800), 1)).toBe(false);
    expect(isProjectInViewport(at(.5, .5), resolveMapGeometry(600, 800), 1)).toBe(true);
  });

  it('CSS与视野计算共用原有1到4倍缩放及无效值回退', () => {
    const geometry = resolveMapGeometry(2801, 1737), centre = at(.5, .5);
    expect(mapWorldTransform(geometry, -5)).toBe('translate(0px,0px) scale(1)');
    expect(mapWorldTransform(geometry, 20)).toBe('translate(0px,0px) scale(4)');
    expect(mapWorldTransform(geometry, Infinity)).toBe('translate(0px,0px) scale(1)');
    expect(mapWorldTransform(geometry, 2, centre)).toBe('translate(-56.02px,0px) scale(2)');
    expect(projectViewportPoint(centre, geometry, 2, centre)).toEqual({ x: 1344.48, y: 868.5 });
    expect(isProjectInViewport(at(.85, .5), geometry, 20)).toBe(isProjectInViewport(at(.85, .5), geometry, 4));
  });
});
