import { describe, expect, it } from 'vitest';
import { positionMapCard } from './mapCardPosition';

type Anchor = Parameters<typeof positionMapCard>[0];

function expectInsideMap(anchor: Anchor, height: number) {
  const position = positionMapCard(anchor, height);
  const renderedHeight = Math.min(height, position.maxHeight);
  expect(position.left).toBeGreaterThanOrEqual(16);
  expect(position.top).toBeGreaterThanOrEqual(16);
  expect(position.width).toBeGreaterThan(0);
  expect(position.maxHeight).toBeGreaterThan(0);
  expect(position.left + position.width).toBeLessThanOrEqual(anchor.viewportWidth - 16);
  expect(position.top + renderedHeight).toBeLessThanOrEqual(anchor.viewportHeight - 16);
  return position;
}

describe('项目详情卡片定位', () => {
  it('右侧空间充足时紧邻项目，靠右项目翻到左侧', () => {
    const west = { x: 150, y: 350, viewportWidth: 1200, viewportHeight: 800 };
    const east = { ...west, x: 1050 };
    const right = expectInsideMap(west, 420);
    const left = expectInsideMap(east, 420);
    expect(right).toMatchObject({ placement: 'right', left: 174, width: 390 });
    expect(left).toMatchObject({ placement: 'left', width: 390 });
    expect(left.left + left.width).toBe(east.x - 24);
  });

  it('两侧不足完整宽度时选择较宽一侧，缩宽后不覆盖项目点', () => {
    const anchor = { x: 420, y: 350, viewportWidth: 810, viewportHeight: 800 };
    const position = expectInsideMap(anchor, 420);
    expect(position.placement).toBe('left');
    expect(position.width).toBe(380);
    expect(position.left + position.width).toBe(anchor.x - 24);
  });

  it('项目位置变化时卡片横纵坐标随锚点变化，不停留在固定位置', () => {
    const first = { x: 120, y: 260, viewportWidth: 1400, viewportHeight: 900 };
    const next = { ...first, x: 320, y: 450 };
    const before = expectInsideMap(first, 180);
    const after = expectInsideMap(next, 180);
    expect(after.left - before.left).toBe(200);
    expect(after.top).toBeGreaterThan(before.top);
  });

  it('窄地图两侧空间不足时选择上下空间较大的一侧', () => {
    const north = { x: 250, y: 150, viewportWidth: 500, viewportHeight: 700 };
    const south = { ...north, y: 550 };
    const bottom = expectInsideMap(north, 300);
    const top = expectInsideMap(south, 300);
    expect(bottom).toMatchObject({ placement: 'bottom', width: 330 });
    expect(bottom.top).toBeGreaterThanOrEqual(north.y + 24);
    expect(top).toMatchObject({ placement: 'top', width: 330 });
    expect(top.top + Math.min(300, top.maxHeight)).toBeLessThanOrEqual(south.y - 24);
  });

  it('地图比首选卡片宽度更窄时保留两边留白，并限制内容高度', () => {
    const anchor = { x: 150, y: 100, viewportWidth: 300, viewportHeight: 600 };
    const position = expectInsideMap(anchor, 950);
    expect(position).toMatchObject({ placement: 'bottom', left: 16, width: 268 });
    expect(position.maxHeight).toBeLessThan(950);
    expect(position.top).toBeGreaterThanOrEqual(anchor.y + 24);
  });

  it('卡片内容变高时重新限制高度和位置，底部不会越出地图', () => {
    const anchor = { x: 200, y: 700, viewportWidth: 1200, viewportHeight: 800 };
    const short = expectInsideMap(anchor, 180);
    const tall = expectInsideMap(anchor, 1000);
    expect(tall.placement).toBe(short.placement);
    expect(tall.left).toBe(short.left);
    expect(tall.top).toBeLessThan(short.top);
    expect(tall.maxHeight).toBeLessThanOrEqual(768);
  });

  it('地图四角的项目都保留完整卡片边界', () => {
    for (const viewportWidth of [300, 600, 1200]) {
      for (const x of [0, viewportWidth]) {
        for (const y of [0, 800]) {
          expectInsideMap({ x, y, viewportWidth, viewportHeight: 800 }, 1000);
        }
      }
    }
  });
});
