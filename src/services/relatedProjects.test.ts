import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Project } from '../types';
import { CURRENT_PROJECT, PROJECTS } from './demo';
import { getRelatedProjectIds, RELATED_PROJECTS_STORAGE_KEY, saveRelatedProjectIds } from './relatedProjects';

function project(id: string, overrides: Partial<Project> = {}): Project {
  return { id, name: id, year: '2024', basin: '沁水盆地', type: '解释项目', area: '10',
    point: [0, 0], readable: true, archived: true, ...overrides };
}

beforeEach(() => { sessionStorage.removeItem(RELATED_PROJECTS_STORAGE_KEY); });
afterEach(() => { vi.restoreAllMocks(); sessionStorage.removeItem(RELATED_PROJECTS_STORAGE_KEY); });

describe('成果页关联项目独立会话存储', () => {
  it('未保存时保留原演示样例，显式引用优先，普通项目不推断关系', () => {
    expect(getRelatedProjectIds(CURRENT_PROJECT, PROJECTS, 'admin')).toEqual(['1', '4', '2']);
    expect(getRelatedProjectIds(project('empty'), PROJECTS, 'admin')).toEqual([]);
    const explicit = project('current', { mapDetails: { relatedProjectIds: ['missing', 'current', 'missing'] } });
    expect(getRelatedProjectIds(explicit, PROJECTS, 'admin')).toEqual(['missing']);
    expect(sessionStorage.getItem(RELATED_PROJECTS_STORAGE_KEY)).toBeNull();
  });

  it('演示样例只从当前角色可见的候选取值，并排除自身', () => {
    const projects = [CURRENT_PROJECT, project('1', { archived: false }), project('4'), project('2'), project('extra')];
    expect(getRelatedProjectIds(CURRENT_PROJECT, projects, 'ordinary')).toEqual(['4', '2', 'extra']);
  });

  it('保存清空覆盖后再次读取仍为空，不重新出现三条演示样例', () => {
    expect(saveRelatedProjectIds(CURRENT_PROJECT, PROJECTS, 'admin', 'edit', [])).toEqual([]);
    expect(getRelatedProjectIds(CURRENT_PROJECT, PROJECTS, 'admin')).toEqual([]);
    expect(JSON.parse(sessionStorage.getItem(RELATED_PROJECTS_STORAGE_KEY)!)).toEqual({
      version: 1, byProjectId: { current: [] },
    });
  });

  it('新增合并去重，忽略自身、失效及当前角色不可见的新选择', () => {
    const current = project('source', { mapDetails: { relatedProjectIds: ['existing'] } });
    const candidates = [current, project('existing'), project('new'), project('hidden', { archived: false })];
    expect(saveRelatedProjectIds(current, candidates, 'ordinary', 'add', ['new', 'new', 'source', 'hidden', 'missing', '']))
      .toEqual(['existing', 'new']);
    expect(saveRelatedProjectIds(current, candidates, 'ordinary', 'add', ['existing', 'new']))
      .toEqual(['existing', 'new']);
  });

  it('编辑只替换可见候选内的关系，保留不可见和失效的旧引用', () => {
    const current = project('source', { mapDetails: { relatedProjectIds: ['visible', 'hidden', 'missing', 'source', 'hidden'] } });
    const candidates = [current, project('visible'), project('new'), project('hidden', { archived: false })];
    expect(saveRelatedProjectIds(current, candidates, 'ordinary', 'edit', ['new', 'source', 'other-missing']))
      .toEqual(['hidden', 'missing', 'new']);
    expect(getRelatedProjectIds(current, candidates, 'admin')).toEqual(['hidden', 'missing', 'new']);
    expect(saveRelatedProjectIds(current, candidates, 'ordinary', 'edit', [])).toEqual(['hidden', 'missing']);
    expect(saveRelatedProjectIds(current, candidates, 'admin', 'edit', [])).toEqual(['missing']);
  });

  it('可见但无查阅权限的项目仍可关联，不改变既有权限口径', () => {
    const current = project('source');
    const restricted = project('restricted', { readable: false });
    expect(saveRelatedProjectIds(current, [current, restricted], 'ordinary', 'add', ['restricted'])).toEqual(['restricted']);
  });

  it('按项目隔离且每次从存储重新读取，不依赖旧内存快照', () => {
    const first = project('first'), second = project('second'), target = project('target');
    const candidates = [first, second, target];
    saveRelatedProjectIds(first, candidates, 'admin', 'add', ['target']);
    saveRelatedProjectIds(second, candidates, 'admin', 'add', ['first']);
    expect(getRelatedProjectIds(first, candidates, 'admin')).toEqual(['target']);
    expect(getRelatedProjectIds(second, candidates, 'admin')).toEqual(['first']);
    sessionStorage.setItem(RELATED_PROJECTS_STORAGE_KEY, JSON.stringify({ version: 1, byProjectId: { first: [] } }));
    expect(getRelatedProjectIds(first, candidates, 'admin')).toEqual([]);
    expect(getRelatedProjectIds(second, candidates, 'admin')).toEqual([]);
  });

  it.each(['{broken', 'null', '[]', '{"version":2,"byProjectId":{"current":[]}}', '{"version":1,"byProjectId":null}', '{"version":1,"byProjectId":[]}', '{"version":1,"byProjectId":{"current":[42]}}'])
    ('损坏的存储数据安全回退，并允许后续重新保存：%s', raw => {
      sessionStorage.setItem(RELATED_PROJECTS_STORAGE_KEY, raw);
      expect(getRelatedProjectIds(CURRENT_PROJECT, PROJECTS, 'admin')).toEqual(['1', '4', '2']);
      expect(saveRelatedProjectIds(CURRENT_PROJECT, PROJECTS, 'admin', 'edit', [])).toEqual([]);
    });

  it('保留其他项目的有效记录，不让单个损坏记录导致全部记录丢失', () => {
    sessionStorage.setItem(RELATED_PROJECTS_STORAGE_KEY, JSON.stringify({
      version: 1, byProjectId: { source: [42], another: ['retained'] },
    }));
    saveRelatedProjectIds(project('source'), [], 'admin', 'edit', []);
    expect(getRelatedProjectIds(project('another'), [], 'admin')).toEqual(['retained']);
  });

  it('保存失败抛出错误，原存储和读取结果不发生假更新', () => {
    const current = project('source'), target = project('target');
    const candidates = [current, target];
    saveRelatedProjectIds(current, candidates, 'admin', 'add', ['target']);
    const before = sessionStorage.getItem(RELATED_PROJECTS_STORAGE_KEY);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('storage full'); });
    expect(() => saveRelatedProjectIds(current, candidates, 'admin', 'edit', [])).toThrow('storage full');
    expect(sessionStorage.getItem(RELATED_PROJECTS_STORAGE_KEY)).toBe(before);
    expect(getRelatedProjectIds(current, candidates, 'admin')).toEqual(['target']);
  });

  it('读取权限失败时展示原有关系，保存时将访问错误交给调用方', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('storage blocked'); });
    expect(getRelatedProjectIds(CURRENT_PROJECT, PROJECTS, 'admin')).toEqual(['1', '4', '2']);
    expect(() => saveRelatedProjectIds(CURRENT_PROJECT, PROJECTS, 'admin', 'edit', [])).toThrow('storage blocked');
  });

  it('读取与保存都不修改传入项目、共享 mapDetails 或候选列表', () => {
    const current = project('source', { mapDetails: { relatedProjectIds: ['old'] } });
    const candidates = [current, project('old'), project('new')];
    const before = JSON.stringify([current, candidates, CURRENT_PROJECT, PROJECTS]);
    getRelatedProjectIds(current, candidates, 'admin');
    saveRelatedProjectIds(current, candidates, 'admin', 'edit', ['new']);
    expect(JSON.stringify([current, candidates, CURRENT_PROJECT, PROJECTS])).toBe(before);
    expect(current.mapDetails?.relatedProjectIds).toEqual(['old']);
    expect(getRelatedProjectIds(current, candidates, 'admin')).toEqual(['new']);
  });
});
