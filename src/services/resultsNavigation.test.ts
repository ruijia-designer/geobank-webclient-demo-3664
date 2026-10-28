import { describe, expect, it } from 'vitest';
import type { Route } from '../types';
import { CURRENT_PROJECT, initialState } from './demo';
import { resolveResultsEntry } from './resultsNavigation';

describe('成果入口权限路由', () => {
  it('非成果路由原样返回', () => {
    const route: Route = { page: 'search', section: 'projects' };
    expect(resolveResultsEntry(initialState('ordinary'), route)).toBe(route);
  });

  it('显式可读项目原样返回并保留目录', () => {
    const route: Route = { page: 'results', projectId: '1', section: 'wells' };
    expect(resolveResultsEntry(initialState('admin'), route)).toBe(route);
  });

  it.each(['2', 'missing', ''])('显式无权限或失效项目 %s 不回退到其他可读项目', projectId => {
    expect(resolveResultsEntry(initialState('admin'), { page: 'results', projectId })).toBeNull();
  });

  it('显式项目即使标记可读，角色不可见时仍拒绝', () => {
    expect(resolveResultsEntry(initialState('ordinary'), { page: 'results', projectId: '0' })).toBeNull();
  });

  it('无指定项目时优先保留当前可读项目和目录', () => {
    const state = { ...initialState('admin'), currentProjectId: '1' };
    expect(resolveResultsEntry(state, { page: 'results', section: 'wells' }))
      .toEqual({ page: 'results', projectId: '1', section: 'wells' });
  });

  it.each(['2', 'missing'])('当前项目 %s 不可读或失效时选择第一个角色可读项目', currentProjectId => {
    const state = { ...initialState('ordinary'), currentProjectId };
    state.projects = state.projects.map(project => project.id === '4' ? { ...project, readable: true } : project);
    const before = JSON.stringify(state);
    expect(resolveResultsEntry(state, { page: 'results', section: '关联项目' }))
      .toEqual({ page: 'results', projectId: '4', section: '关联项目' });
    expect(JSON.stringify(state)).toBe(before);
  });

  it('零可读项目时返回不带项目或目录的成果入口', () => {
    expect(resolveResultsEntry(initialState('ordinary'), { page: 'results', section: 'wells' }))
      .toEqual({ page: 'results' });
  });

  it('管理员候选包含演示当前项目，覆写其权限后才会进入零可读空态', () => {
    const state = initialState('admin');
    state.projects = state.projects.map(project => ({ ...project, readable: false }));
    expect(resolveResultsEntry(state, { page: 'results' }))
      .toEqual({ page: 'results', projectId: 'current' });
    state.projects.push({ ...CURRENT_PROJECT, readable: false });
    expect(resolveResultsEntry(state, { page: 'results' })).toEqual({ page: 'results' });
    expect(resolveResultsEntry(state, { page: 'results', projectId: 'current' })).toBeNull();
  });
});
