import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BaselinePage from './BaselinePage';
import { initialState } from '../services/demo';
import { RESULT_TYPE_CATEGORIES, loadResultTypes, saveResultTypes } from '../services/resultTypes';
import { BASELINE_CONFIGS, saveBaselineRows } from '../services/baseline';
import { getProjectTypeOptions } from '../services/projectClassification';
import type { ResultTypeCategoryId, ResultTypeGroup, ResultTypeItem } from '../services/resultTypes';
import type { AppApi, AppState, Route } from '../types';

const notify = vi.fn();
const baselineProjectTypes = structuredClone(BASELINE_CONFIGS.find(config => config.id === 'types')!.rows);
function Harness() {
    const [state, setState] = useState<AppState>({ ...initialState('admin'), route: { page: 'baseline', section: 'naming' } });
    const navigate = (route: Route) => setState(previous => ({ ...previous, route }));
    const api: AppApi = { state, setState, navigate, notify, deny: vi.fn(), openProject: vi.fn() };
    return <BaselinePage api={api} />;
}
function seedCategory(id: ResultTypeCategoryId) { return RESULT_TYPE_CATEGORIES.find(category => category.id === id)!; }
function seedGroup(id: ResultTypeCategoryId, name: string) { return seedCategory(id).groups.find(group => group.name === name)!; }
function table() { return screen.getByRole('table'); }
function groupRow(group: ResultTypeGroup) { return table().querySelector<HTMLTableRowElement>(`[data-group-id="${group.id}"]`)!; }
function itemRow(item: ResultTypeItem) { return table().querySelector<HTMLTableRowElement>(`[data-item-id="${item.id}"]`)!; }
function fieldText(element: Element, key: string) { return element.querySelector<HTMLElement>(`[data-field="${key}"]`)!.textContent; }
function namedRow(name: string) { return screen.getByRole('button', { name: `编辑${name}` }).closest('tr')!; }
function rowAction(element: Element, name: string) { fireEvent.click(within(element as HTMLElement).getByRole('button', { name })); }
function modal() { return screen.getByRole('dialog'); }
function modalField(label: string) { return within(modal()).getByRole('textbox', { name: new RegExp(`^${label}(?:\\s|$)`) }); }
function fillModal(label: string, value: string) {
    if (label !== '适用项目') { fireEvent.change(modalField(label), { target: { value } }); return; }
    fireEvent.click(within(modal()).getByRole('button', { name: '适用项目' }));
    fireEvent.click(within(modal()).getByRole('button', { name: '清空选择' }));
    const options = within(within(modal()).getByRole('group', { name: '适用项目选项' }));
    for (const name of value.split('\n').filter(Boolean)) {
        const option = getProjectTypeOptions().find(option => option.leaf && option.name === name)!;
        expect(option).toBeDefined();
        fireEvent.click(options.getByRole('checkbox', { name: option.path.join(' / ') }));
    }
}
function submitModal() { fireEvent.click(within(modal()).getByRole('button', { name: '保存' })); }
function cancelModal() { fireEvent.click(within(modal()).getByRole('button', { name: '取消' })); }
function createGroup(name: string) {
    fireEvent.click(screen.getByRole('button', { name: '新增分类' }));
    fillModal('名称', name);
    submitModal();
    return namedRow(name);
}
function search(value: string) {
    const form = screen.getByRole('button', { name: '查询' }).closest('form')!;
    fireEvent.change(within(form).getByRole('textbox'), { target: { value } });
    fireEvent.click(within(form).getByRole('button', { name: '查询' }));
}
function queryValue() {
    const form = screen.getByRole('button', { name: '查询' }).closest('form')!;
    return within(form).getByRole('textbox');
}
function savedCategory(id: ResultTypeCategoryId) { return loadResultTypes().find(category => category.id === id)!; }
function allItemIds() { return Array.from(table().querySelectorAll('tr[data-item-id]'), row => row.getAttribute('data-item-id')); }
function allGroupIds() { return Array.from(table().querySelectorAll('tr[data-group-id]'), row => row.getAttribute('data-group-id')); }

beforeEach(() => {
    vi.clearAllMocks();
    saveResultTypes(RESULT_TYPE_CATEGORIES);
    saveBaselineRows('types', structuredClone(baselineProjectTypes));
});
afterEach(() => saveBaselineRows('types', structuredClone(baselineProjectTypes)));

describe('成果类型新增、编辑与排序', () => {
    it('一级和二级表单验证必填、取消不改草稿，空分类可添加首项，顶部保存才写缓存', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const groupCount = seedCategory('processing').groups.length;
        fireEvent.click(screen.getByRole('button', { name: '新增分类' }));
        expect(modal()).toHaveAccessibleName('新增分类');
        submitModal();
        expect(modal()).toBeVisible();
        expect(allGroupIds()).toHaveLength(groupCount);
        fillModal('名称', '取消的新分类');
        cancelModal();
        expect(screen.queryByRole('button', { name: '编辑取消的新分类' })).not.toBeInTheDocument();

        const newGroup = createGroup('新成果分类');
        expect(newGroup).toBeVisible();
        expect(allGroupIds()).toHaveLength(groupCount + 1);
        expect(allItemIds()).toHaveLength(30);
        expect(savedCategory('processing').groups).toHaveLength(groupCount);
        rowAction(newGroup, '新增新成果分类下级');
        expect(modal()).toHaveAccessibleName('新增成果项');
        expect(modalField('成果编号')).toHaveValue('');
        submitModal();
        expect(modal()).toBeVisible();
        fillModal('名称', '取消的新成果');
        cancelModal();
        expect(allItemIds()).toHaveLength(30);

        rowAction(newGroup, '新增新成果分类下级');
        const values = {
            '名称': '首个新成果', '适用项目': '井中地震\n常规测井', '成果编号': '0007',
            '中文目录': '成果目录', '英文目录': 'NEW_RESULT', '命名规则': '{name}.sgy', '备注': '新增备注',
        };
        for (const [label, value] of Object.entries(values)) fillModal(label, value);
        submitModal();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        const newItem = namedRow('首个新成果');
        const id = newItem.getAttribute('data-item-id');
        expect(fieldText(newItem, 'number')).toBe('0007');
        expect(allItemIds()).toHaveLength(31);

        rowAction(newGroup, '编辑新成果分类');
        expect(modal()).toHaveAccessibleName('编辑分类');
        fillModal('名称', '');
        submitModal();
        expect(modal()).toBeVisible();
        expect(fieldText(newGroup, 'groupName')).toBe('新成果分类');
        fillModal('名称', '取消的组名');
        cancelModal();
        expect(fieldText(newGroup, 'groupName')).toBe('新成果分类');
        rowAction(newGroup, '编辑新成果分类');
        fillModal('名称', '改名后的分类');
        submitModal();
        expect(fieldText(newGroup, 'groupName')).toBe('改名后的分类');

        rowAction(newItem, '编辑首个新成果');
        expect(modal()).toHaveAccessibleName('编辑成果项');
        expect(modalField('成果编号')).toHaveValue('0007');
        fillModal('名称', '取消的条目名');
        fillModal('成果编号', '999');
        cancelModal();
        expect(fieldText(newItem, 'name')).toBe('首个新成果');
        expect(fieldText(newItem, 'number')).toBe('0007');
        rowAction(newItem, '编辑首个新成果');
        fillModal('名称', '改名后的成果');
        fillModal('备注', '修改后的备注');
        submitModal();
        expect(namedRow('改名后的成果').getAttribute('data-item-id')).toBe(id);
        expect(savedCategory('processing').groups).toHaveLength(groupCount);
        await user.click(screen.getByRole('button', { name: '保存' }));
        const saved = savedCategory('processing').groups.find(group => group.name === '改名后的分类')!;
        expect(saved.items).toHaveLength(1);
        expect(saved.items[0]).toMatchObject({
            id, name: '改名后的成果', applicableProjects: '井中地震\n常规测井', number: '0007', chineseDirectory: '成果目录',
            englishDirectory: 'NEW_RESULT', namingRule: '{name}.sgy', notes: '修改后的备注',
        });
        expect(notify).toHaveBeenCalledWith('成果类型已保存');
    });

    it('一级行新增下级追加到本组末尾，成果编号保持空值，已有预留项允许空名称编辑', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const group = seedGroup('processing', '处理成果');
        rowAction(groupRow(group), `新增${group.name}下级`);
        expect(modal()).toHaveAccessibleName('新增成果项');
        fillModal('名称', '追加的下级成果');
        submitModal();
        const inserted = namedRow('追加的下级成果');
        const newId = inserted.getAttribute('data-item-id');
        const ids = allItemIds();
        const start = ids.indexOf(group.items[0].id);
        expect(ids.slice(start, start + group.items.length + 1)).toEqual([...group.items.map(item => item.id), newId]);
        expect(fieldText(inserted, 'number')).toBe('—');
        expect(allGroupIds()).toHaveLength(seedCategory('processing').groups.length);
        await user.selectOptions(screen.getByRole('combobox', { name: '数据类别' }), 'wellbore');
        const blank = seedGroup('wellbore', '井轨迹').items[0];
        rowAction(itemRow(blank), '编辑二级分类名称');
        expect(modalField('名称')).toHaveValue('');
        fillModal('备注', '仍然保留空名称');
        submitModal();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(fieldText(itemRow(blank), 'name')).toBe('二级分类名称');
        expect(fieldText(itemRow(blank), 'notes')).toBe('仍然保留空名称');
        fireEvent.click(screen.getByRole('button', { name: '保存' }));
        expect(savedCategory('processing').groups.find(entry => entry.id === group.id)!.items.map(item => item.id)).toEqual([
            ...group.items.map(item => item.id), newId,
        ]);
        expect(savedCategory('wellbore').groups.find(entry => entry.name === '井轨迹')!.items[0].name).toBe('');
    });

    it('一级移动携带整组且二级仅在本组移动，边界禁用，保存后恢复实际顺序', () => {
        const view = render(<Harness />);
        const original = seedCategory('processing').groups;
        const basic = original[0], results = original[1], lastGroup = original.at(-1)!;
        expect(within(groupRow(basic)).getByRole('button', { name: `上移${basic.name}` })).toBeDisabled();
        expect(within(groupRow(lastGroup)).getByRole('button', { name: `下移${lastGroup.name}` })).toBeDisabled();
        rowAction(groupRow(results), `上移${results.name}`);
        expect(allGroupIds()).toEqual([results.id, basic.id, ...original.slice(2).map(group => group.id)]);
        expect(allItemIds().slice(0, results.items.length)).toEqual(results.items.map(item => item.id));
        expect(within(groupRow(results)).getByRole('button', { name: `上移${results.name}` })).toBeDisabled();
        const first = results.items[0], second = results.items[1], last = results.items.at(-1)!;
        expect(within(itemRow(first)).getByRole('button', { name: `上移${first.name}` })).toBeDisabled();
        expect(within(itemRow(last)).getByRole('button', { name: `下移${last.name}` })).toBeDisabled();
        rowAction(itemRow(first), `下移${first.name}`);
        expect(allItemIds().slice(0, results.items.length)).toEqual([second.id, first.id, ...results.items.slice(2).map(item => item.id)]);
        expect(within(itemRow(second)).getByRole('button', { name: `上移${second.name}` })).toBeDisabled();
        expect(within(itemRow(first)).getByRole('button', { name: `上移${first.name}` })).toBeEnabled();
        expect(savedCategory('processing').groups[0].id).toBe(basic.id);
        fireEvent.click(screen.getByRole('button', { name: '保存' }));
        const saved = savedCategory('processing').groups;
        expect(saved.map(group => group.id)).toEqual([results.id, basic.id, ...original.slice(2).map(group => group.id)]);
        expect(saved[0].items.map(item => item.id)).toEqual([second.id, first.id, ...results.items.slice(2).map(item => item.id)]);
        expect(saved[1].items).toEqual(basic.items);
        view.unmount();
        render(<Harness />);
        expect(allGroupIds()).toEqual(saved.map(group => group.id));
        expect(allItemIds()).toEqual(saved.flatMap(group => group.items.map(item => item.id)));
    });
});

describe('成果类型删除与查询下操作', () => {
    it('删除最后一项保留空父组，取消不删除，空类别可从新增分类恢复', () => {
        const sparse = loadResultTypes();
        const processing = sparse.find(category => category.id === 'processing')!;
        processing.groups = [processing.groups[0]];
        processing.groups[0].items = [processing.groups[0].items[0]];
        const originalGroup = processing.groups[0], originalItem = originalGroup.items[0];
        saveResultTypes(sparse);
        render(<Harness />);
        rowAction(itemRow(originalItem), `删除${originalItem.name}`);
        expect(modal()).toHaveAccessibleName('删除成果项');
        cancelModal();
        expect(itemRow(originalItem)).toBeVisible();
        rowAction(itemRow(originalItem), `删除${originalItem.name}`);
        fireEvent.click(within(modal()).getByRole('button', { name: '确认删除' }));
        expect(allItemIds()).toHaveLength(0);
        expect(groupRow(originalGroup)).toBeVisible();
        expect(savedCategory('processing').groups[0].items).toHaveLength(1);

        rowAction(groupRow(originalGroup), `新增${originalGroup.name}下级`);
        fillModal('名称', '恢复的首条成果');
        submitModal();
        expect(namedRow('恢复的首条成果')).toBeVisible();
        rowAction(groupRow(originalGroup), `删除${originalGroup.name}`);
        expect(modal()).toHaveAccessibleName('删除分类');
        expect(modal()).toHaveTextContent(/其下.*删除/);
        cancelModal();
        expect(namedRow('恢复的首条成果')).toBeVisible();
        rowAction(groupRow(originalGroup), `删除${originalGroup.name}`);
        fireEvent.click(within(modal()).getByRole('button', { name: '确认删除' }));
        expect(allGroupIds()).toHaveLength(0);
        expect(allItemIds()).toHaveLength(0);
        expect(screen.getByRole('button', { name: '新增分类' })).toBeVisible();
        const emptyGroup = createGroup('待删除空分类');
        rowAction(emptyGroup, '删除待删除空分类');
        fireEvent.click(within(modal()).getByRole('button', { name: '确认删除' }));
        expect(allGroupIds()).toHaveLength(0);
        const restored = createGroup('空类别恢复分类');
        expect(restored).toBeVisible();
        rowAction(restored, '新增空类别恢复分类下级');
        fillModal('名称', '空类别恢复成果');
        submitModal();
        fireEvent.click(screen.getByRole('button', { name: '保存' }));
        expect(savedCategory('processing').groups).toHaveLength(1);
        expect(savedCategory('processing').groups[0]).toMatchObject({ name: '空类别恢复分类', items: [{ name: '空类别恢复成果' }] });
    });

    it('删除按稳定ID隔离同名成果，一级删除只级联本组，不影响其他类别同名组', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const processingBasic = seedGroup('processing', '基本信息');
        rowAction(groupRow(processingBasic), '删除基本信息');
        fireEvent.click(within(modal()).getByRole('button', { name: '确认删除' }));
        expect(allGroupIds()).not.toContain(processingBasic.id);
        for (const item of processingBasic.items) expect(allItemIds()).not.toContain(item.id);
        expect(allItemIds()).toHaveLength(28);
        await user.selectOptions(screen.getByRole('combobox', { name: '数据类别' }), 'acquisition');
        expect(groupRow(seedGroup('acquisition', '基本信息'))).toBeVisible();
        expect(allItemIds()).toHaveLength(37);
        await user.selectOptions(screen.getByRole('combobox', { name: '数据类别' }), 'nonseismic');
        const magnetic = seedGroup('nonseismic', '磁力').items[0];
        const geochemical = seedGroup('nonseismic', '化探').items[0];
        expect(magnetic.name).toBe(geochemical.name);
        rowAction(itemRow(magnetic), '删除原始数据');
        fireEvent.click(within(modal()).getByRole('button', { name: '确认删除' }));
        expect(allItemIds()).not.toContain(magnetic.id);
        expect(itemRow(geochemical)).toBeVisible();
        fireEvent.click(screen.getByRole('button', { name: '保存' }));
        expect(savedCategory('processing').groups.some(group => group.id === processingBasic.id)).toBe(false);
        expect(savedCategory('acquisition').groups).toEqual(seedCategory('acquisition').groups);
        expect(savedCategory('nonseismic').groups.find(group => group.name === '化探')!.items[0]).toEqual(geochemical);
        expect(savedCategory('nonseismic').groups.flatMap(group => group.items).some(item => item.id === magnetic.id)).toBe(false);
    });

    it('查询下移动按真实相邻项，编辑保持匹配行，新增清查询并展开父组，删除立即移除匹配ID', () => {
        render(<Harness />);
        const results = seedGroup('processing', '处理成果');
        const item = results.items.find(item => item.englishDirectory === 'PSTM_RAW')!;
        const previous = results.items[results.items.indexOf(item) - 1];
        search('pstm_raw');
        expect(allItemIds()).toEqual([item.id]);
        expect(within(itemRow(item)).getByRole('button', { name: `上移${item.name}` })).toBeEnabled();
        expect(within(itemRow(item)).getByRole('button', { name: `下移${item.name}` })).toBeEnabled();
        rowAction(itemRow(item), `上移${item.name}`);
        expect(allItemIds()).toEqual([item.id]);
        rowAction(itemRow(item), `编辑${item.name}`);
        fillModal('英文目录', 'CHANGED_DIRECTORY');
        submitModal();
        expect(allItemIds()).toEqual([item.id]);
        expect(fieldText(itemRow(item), 'englishDirectory')).toBe('CHANGED_DIRECTORY');
        rowAction(groupRow(results), `新增${results.name}下级`);
        fillModal('名称', '检索中新建成果');
        submitModal();
        expect(queryValue()).toHaveValue('');
        expect(screen.getByRole('button', { name: '收起处理成果' })).toHaveAttribute('aria-expanded', 'true');
        expect(allItemIds()).toHaveLength(31);
        const created = namedRow('检索中新建成果');
        const createdId = created.getAttribute('data-item-id');
        const ids = allItemIds();
        expect(ids.slice(ids.indexOf(item.id), ids.indexOf(item.id) + 2)).toEqual([item.id, previous.id]);
        expect(ids[ids.indexOf(results.items.at(-1)!.id) + 1]).toBe(createdId);
        search('检索中新建成果');
        expect(allItemIds()).toEqual([createdId]);
        rowAction(created, '删除检索中新建成果');
        fireEvent.click(within(modal()).getByRole('button', { name: '确认删除' }));
        expect(allItemIds()).toHaveLength(0);
        expect(screen.getByText('未找到匹配记录')).toBeVisible();

        const newGroup = createGroup('检索中新建分类');
        expect(queryValue()).toHaveValue('');
        expect(newGroup).toBeVisible();
        expect(allItemIds()).toHaveLength(30);
        fireEvent.click(screen.getByRole('button', { name: '保存' }));
        const saved = savedCategory('processing').groups.find(group => group.id === results.id)!;
        expect(saved.items[saved.items.findIndex(entry => entry.id === item.id) + 1].id).toBe(previous.id);
        expect(saved.items.find(entry => entry.id === item.id)!.englishDirectory).toBe('CHANGED_DIRECTORY');
        expect(savedCategory('processing').groups.at(-1)).toMatchObject({ name: '检索中新建分类', items: [] });
    });
});
