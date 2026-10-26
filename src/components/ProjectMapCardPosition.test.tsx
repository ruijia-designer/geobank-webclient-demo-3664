import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectMapCard } from './ProjectMapCard';
import { PROJECTS } from '../services/demo';

const props = { project: PROJECTS[0], projects: PROJECTS, role: 'admin' as const, onClose: vi.fn(), onOpen: vi.fn() };
afterEach(() => vi.restoreAllMocks());

describe('浮动卡片边缘调整', () => {
  it('同方向跟随保留动画，翻转或缩窄时立即避让，不横穿标记', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ height: 300 } as DOMRect);
    const anchor = { x: 150, y: 250, viewportWidth: 1200, viewportHeight: 800 };
    const { rerender } = render(<ProjectMapCard {...props} anchor={anchor}/>);
    const card = screen.getByRole('region', { name: '项目详情' });
    rerender(<ProjectMapCard {...props} anchor={{ ...anchor, x: 200, y: 300 }}/>);
    expect(card).toHaveClass('follows-marker');
    rerender(<ProjectMapCard {...props} anchor={{ ...anchor, x: 750, y: 300 }}/>);
    expect(card).toHaveAttribute('data-placement', 'right');
    rerender(<ProjectMapCard {...props} anchor={{ ...anchor, x: 750, y: 300, viewportWidth: 1000 }}/>);
    expect(card).toHaveAttribute('data-placement', 'left');
    expect(card).not.toHaveClass('follows-marker');
    expect(parseFloat(card.style.left) + parseFloat(card.style.width)).toBe(726);
  });

  it('高度变化及贴边夹紧立即重新定位，底部保持在地图内', () => {
    let height = 250;
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ height }) as DOMRect);
    const anchor = { x: 150, y: 500, viewportWidth: 1200, viewportHeight: 800 };
    const { rerender } = render(<ProjectMapCard {...props} anchor={anchor}/>);
    const card = screen.getByRole('region', { name: '项目详情' });
    height = 650;
    rerender(<ProjectMapCard {...props} anchor={anchor}/>);
    expect(card).not.toHaveClass('follows-marker');
    expect(parseFloat(card.style.top) + height).toBe(784);
    rerender(<ProjectMapCard {...props} anchor={{ ...anchor, y: 700 }}/>);
    expect(card).not.toHaveClass('follows-marker');
    expect(parseFloat(card.style.top) + height).toBe(784);
  });
});
