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
function rowAction(element: Element, name: string) { fireEvent.click(within(element as HTMLElement).getByRole('button', { name })); }
function dragHandle(element: HTMLElement) { return within(element).getByRole('button', { name: /^拖动排序/ }); }
function reorder(element: HTMLElement, direction: 'ArrowUp' | 'ArrowDown', commit = true) {
    const handle = dragHandle(element);
    fireEvent.keyDown(handle, { key: ' ' });
    fireEvent.keyDown(handle, { key: direction });
    fireEvent.keyDown(handle, { key: commit ? ' ' : 'Escape' });
}
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
function search(value: string) {
    const form = screen.getByRole('button', { name: '查询' }).closest('form')!;
    fireEvent.change(within(form).getByRole('textbox'), { target: { value } });
    fireEvent.click(within(form).getByRole('button', { name: '查询' }));
}
function savedCategory(id: ResultTypeCategoryId) { return loadResultTypes().find(category => category.id === id)!; }
function allItemIds() { return Array.from(table().querySelectorAll('tr[data-item-id]'), row => row.getAttribute('data-item-id')); }
function allGroupIds() { return Array.from(table().querySelectorAll('tr[data-group-id]'), row => row.getAttribute('data-group-id')); }
function leaveAndReturn() {
    fireEvent.click(screen.getByRole('button', { name: '项目类型' }));
    fireEvent.click(screen.getByRole('button', { name: '成果类型' }));
}

beforeEach(() => {
    vi.clearAllMocks();
    saveResultTypes(RESULT_TYPE_CATEGORIES);
    saveBaselineRows('types', structuredClone(baselineProjectTypes));
});
afterEach(() => saveBaselineRows('types', structuredClone(baselineProjectTypes)));

describe('成果类型编辑与排序', () => {
    it('五类分组隐藏编码、成果显示稳定编码，只保留编辑和排序，不提供增删或分页', () => {
        render(<Harness />);
        for (const category of RESULT_TYPE_CATEGORIES) {
            fireEvent.change(screen.getByRole('combobox', { name: '数据类别' }), { target: { value: category.id } });
            expect(allItemIds()).toEqual(category.groups.flatMap(group => group.items.map(item => item.id)));
            expect(screen.getByRole('columnheader', { name: '编码' })).toBeVisible();
            expect(screen.getByRole('columnheader', { name: '成果编号' })).toBeVisible();
            expect(screen.queryByRole('button', { name: /^(新增|删除)/ })).not.toBeInTheDocument();
            expect(screen.queryByRole('button', { name: '下一页' })).not.toBeInTheDocument();
            for (const group of category.groups) {
                expect(groupRow(group)).not.toHaveTextContent(group.id);
                for (const item of group.items) {
                    expect(fieldText(itemRow(item), 'id')).toBe(item.id);
                    expect(fieldText(itemRow(item), 'number')).toBe(item.number || '—');
                }
            }
        }
    });

    it('分类名称校验与取消不写缓存，成果字段编辑保存且编码保持不变', () => {
        render(<Harness />);
        const group = seedGroup('processing', '处理成果');
        const item = group.items[0];
        rowAction(groupRow(group), `编辑${group.name}`);
        fillModal('名称', '');
        submitModal();
        expect(modal()).toBeVisible();
        expect(within(modal()).getByText('请输入名称')).toBeVisible();
        expect(savedCategory('processing')).toEqual(seedCategory('processing'));
        fillModal('名称', '取消的分类');
        cancelModal();
        expect(fieldText(groupRow(group), 'groupName')).toBe(group.name);

        rowAction(groupRow(group), `编辑${group.name}`);
        fillModal('名称', '更新的分类');
        submitModal();
        rowAction(itemRow(item), `编辑${item.name}`);
        expect(within(modal()).queryByRole('textbox', { name: '编码' })).not.toBeInTheDocument();
        fillModal('名称', '更新的成果');
        fillModal('成果编号', '0007');
        fillModal('适用项目', '二维处理');
        fillModal('英文目录', 'UPDATED_RESULT');
        submitModal();
        expect(fieldText(itemRow(item), 'id')).toBe(item.id);
        expect(fieldText(itemRow(item), 'number')).toBe('0007');
        leaveAndReturn();
        expect(fieldText(groupRow(group), 'groupName')).toBe('更新的分类');
        expect(fieldText(itemRow(item), 'name')).toBe('更新的成果');
        expect(fieldText(itemRow(item), 'englishDirectory')).toBe('UPDATED_RESULT');
        expect(fieldText(itemRow(item), 'id')).toBe(item.id);
        expect(allItemIds()).toHaveLength(30);
        expect(notify).toHaveBeenCalledWith('成果类型已保存');
    });

    it('已有预留项保留空名称并允许编辑其他字段', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.selectOptions(screen.getByRole('combobox', { name: '数据类别' }), 'wellbore');
        const blank = seedGroup('wellbore', '井轨迹').items[0];
        rowAction(itemRow(blank), '编辑二级分类名称');
        expect(modalField('名称')).toHaveValue('');
        fillModal('备注', '仍然保留空名称');
        submitModal();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(fieldText(itemRow(blank), 'name')).toBe('二级分类名称');
        expect(fieldText(itemRow(blank), 'notes')).toBe('仍然保留空名称');
        expect(savedCategory('wellbore').groups.find(entry => entry.name === '井轨迹')!.items[0].name).toBe('');
    });

    it('一级拖动携带整组且二级仅在本组排序，短点和取消不保存，离开返回保留提交顺序', () => {
        render(<Harness />);
        const original = seedCategory('processing').groups;
        const basic = original[0], results = original[1], lastGroup = original.at(-1)!;
        expect(dragHandle(groupRow(basic))).toBeEnabled();
        expect(dragHandle(groupRow(lastGroup))).toBeEnabled();
        fireEvent.click(dragHandle(groupRow(results)));
        expect(savedCategory('processing').groups).toEqual(original);
        reorder(groupRow(results), 'ArrowUp', false);
        expect(savedCategory('processing').groups).toEqual(original);
        reorder(groupRow(basic), 'ArrowUp');
        reorder(groupRow(lastGroup), 'ArrowDown');
        expect(allGroupIds()).toEqual(original.map(group => group.id));
        reorder(groupRow(results), 'ArrowUp');
        expect(allGroupIds()).toEqual([results.id, basic.id, ...original.slice(2).map(group => group.id)]);
        expect(allItemIds().slice(0, results.items.length)).toEqual(results.items.map(item => item.id));
        const first = results.items[0], second = results.items[1], last = results.items.at(-1)!;
        reorder(itemRow(first), 'ArrowUp');
        reorder(itemRow(last), 'ArrowDown');
        expect(savedCategory('processing').groups[0].items).toEqual(results.items);
        reorder(itemRow(first), 'ArrowDown');
        expect(allItemIds().slice(0, results.items.length)).toEqual([second.id, first.id, ...results.items.slice(2).map(item => item.id)]);
        const saved = savedCategory('processing').groups;
        expect(saved.map(group => group.id)).toEqual([results.id, basic.id, ...original.slice(2).map(group => group.id)]);
        expect(saved[0].items).toEqual([second, first, ...results.items.slice(2)]);
        expect(saved[1].items).toEqual(basic.items);
        leaveAndReturn();
        expect(allGroupIds()).toEqual(saved.map(group => group.id));
        expect(allItemIds()).toEqual(saved.flatMap(group => group.items.map(item => item.id)));
    });

    it('查询编码可定位成果，查询下编辑保持匹配行，排序使用真实相邻项', () => {
        render(<Harness />);
        const group = seedGroup('processing', '处理成果');
        const item = group.items.find(item => item.englishDirectory === 'PSTM_RAW')!;
        const previous = group.items[group.items.indexOf(item) - 1];
        search(item.id);
        expect(allItemIds()).toEqual([item.id]);
        search('pstm_raw');
        reorder(itemRow(item), 'ArrowUp');
        rowAction(itemRow(item), `编辑${item.name}`);
        fillModal('英文目录', 'CHANGED_DIRECTORY');
        submitModal();
        expect(allItemIds()).toEqual([item.id]);
        expect(fieldText(itemRow(item), 'englishDirectory')).toBe('CHANGED_DIRECTORY');
        search('');
        const ids = allItemIds();
        expect(ids.slice(ids.indexOf(item.id), ids.indexOf(item.id) + 2)).toEqual([item.id, previous.id]);
        expect(fieldText(itemRow(item), 'id')).toBe(item.id);
        expect(screen.queryByRole('button', { name: /^(新增|删除)/ })).not.toBeInTheDocument();
    });

    it('空类别显示空状态，没有新增或删除入口', () => {
        const data = loadResultTypes();
        data.find(category => category.id === 'processing')!.groups = [];
        saveResultTypes(data);
        render(<Harness />);
        expect(screen.getByText('暂无数据')).toBeVisible();
        expect(screen.queryByRole('button', { name: /^(新增|删除)/ })).not.toBeInTheDocument();
        expect(screen.queryByText('新增后可在此查看与维护')).not.toBeInTheDocument();
    });
});
