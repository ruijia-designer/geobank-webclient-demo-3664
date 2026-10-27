import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BaselinePage from './BaselinePage';
import { initialState } from '../services/demo';
import { RESULT_TYPE_CATEGORIES, loadResultTypes, saveResultTypes } from '../services/resultTypes';
import type { ResultTypeCategoryId, ResultTypeItem } from '../services/resultTypes';
import type { AppApi, AppState, Route } from '../types';

const notify = vi.fn();
const expectedCounts = [37, 30, 27, 25, 36];
const categoryHeaders = ['采集项目', '处理项目', '解释项目', '井筒项目', '非地震项目'];
const headers = ['处理项目', '适用项目', '成果编号', '中文目录', '英文目录', '命名规则', '备注'];

function Harness() {
    const [state, setState] = useState<AppState>({ ...initialState('admin'), route: { page: 'baseline', section: 'naming' } });
    const navigate = (route: Route) => setState(previous => ({ ...previous, route }));
    const api: AppApi = { state, setState, navigate, notify, deny: vi.fn(), openProject: vi.fn() };
    return <BaselinePage api={api} />;
}

function category(id: ResultTypeCategoryId) { return RESULT_TYPE_CATEGORIES.find(item => item.id === id)!; }
function group(id: ResultTypeCategoryId, name: string) { return category(id).groups.find(item => item.name === name)!; }
function seedItem(id: ResultTypeCategoryId, groupName: string, name: string) {
    return group(id, groupName).items.find(item => item.name === name)!;
}
function table() { return screen.getByRole('table'); }
function itemRows() { return table().querySelectorAll<HTMLTableRowElement>('tr[data-item-id]'); }
function row(item: ResultTypeItem) {
    const element = table().querySelector<HTMLTableRowElement>(`tr[data-item-id="${item.id}"]`);
    expect(element).not.toBeNull();
    return element!;
}
function field(element: Element, key: string) {
    const input = element.querySelector<HTMLTextAreaElement>(`[data-field="${key}"]`);
    expect(input).not.toBeNull();
    return input!;
}
function groupRow(id: ResultTypeCategoryId, name: string) {
    const element = table().querySelector<HTMLTableRowElement>(`tr[data-group-id="${group(id, name).id}"]`);
    expect(element).not.toBeNull();
    return element!;
}
function search(value: string) {
    const form = screen.getByRole('button', { name: '查询' }).closest('form')!;
    fireEvent.change(within(form).getByRole('textbox'), { target: { value } });
    fireEvent.click(within(form).getByRole('button', { name: '查询' }));
}

beforeEach(() => {
    vi.clearAllMocks();
    saveResultTypes(RESULT_TYPE_CATEGORIES);
});

describe('成果类型完整数据', () => {
    it('保留五类 155 条源数据、前导零、括号、原始空值和独立标识', () => {
        expect(RESULT_TYPE_CATEGORIES.map(item => item.name)).toEqual(['采集', '处理', '解释', '井筒', '非地震']);
        expect(RESULT_TYPE_CATEGORIES.map(item => item.groups.flatMap(entry => entry.items).length)).toEqual(expectedCounts);
        const items = RESULT_TYPE_CATEGORIES.flatMap(item => item.groups.flatMap(entry => entry.items));
        expect(items).toHaveLength(155);
        expect(new Set(items.map(item => item.id)).size).toBe(155);
        const groups = RESULT_TYPE_CATEGORIES.flatMap(item => item.groups);
        expect(new Set(groups.map(item => item.id)).size).toBe(groups.length);
        expect(items.every(item => item.namingRule === '')).toBe(true);
        expect(items.filter(item => !item.name)).toHaveLength(3);
        for (const groupName of ['环境参数', '井轨迹', '岩性录井']) {
            expect(group('wellbore', groupName).items).toHaveLength(1);
            expect(group('wellbore', groupName).items[0]).toMatchObject({ name: '', chineseDirectory: '' });
        }
        expect(seedItem('acquisition', '基本信息', '项目信息')).toMatchObject({ number: '01', englishDirectory: 'PRO_INFO' });
        expect(seedItem('acquisition', '基本信息', '关联项目')).toMatchObject({ number: '', chineseDirectory: '', englishDirectory: '' });
        expect(seedItem('acquisition', '测量资料', '测量（导航）报告').chineseDirectory).toBe('测量（导航）报告');
        expect(seedItem('nonseismic', '解释成果', '断裂系统（分布）图').chineseDirectory).toBe('断裂系统（分布）图');
        expect(seedItem('nonseismic', '解释成果', '火成岩分布（岩性预测）图').chineseDirectory).toBe('火成岩分布（岩性预测）图');
        expect(group('acquisition', '项目文档').items.at(-1)).toMatchObject({ name: '项目成果文档', number: '', englishDirectory: 'POST_DOC' });
    });
});

describe('成果类型页面操作', () => {
    it('重命名原 tab，默认处理，两级分类共用数据列，五类显示七列且没有新增删除入口', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        expect(screen.getByRole('heading', { name: '成果类型', level: 1 })).toBeVisible();
        expect(screen.getByRole('button', { name: '成果类型' })).toBeVisible();
        expect(screen.getByRole('heading', { name: '项目成果类型' })).toBeVisible();
        expect(screen.queryByRole('button', { name: '命名规则' })).not.toBeInTheDocument();
        expect(screen.getAllByRole('columnheader').map(item => item.textContent)).toEqual(headers);
        const select = screen.getByRole('combobox', { name: '数据类别' });
        expect(select).toHaveValue('processing');
        expect(within(select).getAllByRole('option').map(item => item.textContent)).toEqual(['采集', '处理', '解释', '井筒', '非地震']);
        for (const [index, entry] of RESULT_TYPE_CATEGORIES.entries()) {
            await user.selectOptions(select, entry.id);
            expect(itemRows()).toHaveLength(expectedCounts[index]);
            expect(screen.getAllByRole('columnheader').map(item => item.textContent)).toEqual([categoryHeaders[index], ...headers.slice(1)]);
        }
        expect(screen.queryByRole('button', { name: /新增/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /删除/ })).not.toBeInTheDocument();
    });

    it('八个业务字段均可编辑，修改名称不影响输入焦点，保存后全部字段和组名恢复', async () => {
        const user = userEvent.setup();
        const view = render(<Harness />);
        const item = seedItem('processing', '处理成果', '水平叠加纯波数据');
        const changes = {
            name: '新的成果名称', applicableProjects: '处理项目\n解释项目', number: '002',
            chineseDirectory: '新的中文目录', englishDirectory: 'NEW_DIRECTORY', namingRule: 'line_{name}.sgy',
            notes: '第一行备注\n第二行备注',
        };
        const nameInput = field(row(item), 'name');
        await user.clear(nameInput);
        await user.type(nameInput, changes.name);
        expect(nameInput).toHaveFocus();
        expect(nameInput).toHaveValue(changes.name);
        for (const [key, value] of Object.entries(changes).filter(([key]) => key !== 'name')) {
            fireEvent.change(field(row(item), key), { target: { value } });
        }
        for (const key of Object.keys(changes)) expect(field(row(item), key).tagName).toBe('TEXTAREA');
        expect(field(groupRow('processing', '处理成果'), 'groupName').tagName).toBe('TEXTAREA');
        fireEvent.change(field(groupRow('processing', '处理成果'), 'groupName'), { target: { value: '重命名处理成果' } });
        await user.click(screen.getByRole('button', { name: '保存' }));
        expect(notify).toHaveBeenCalledWith('成果类型已保存');
        const savedGroup = loadResultTypes().find(entry => entry.id === 'processing')!.groups.find(entry => entry.id === group('processing', '处理成果').id)!;
        expect(savedGroup.name).toBe('重命名处理成果');
        expect(savedGroup.items.find(entry => entry.id === item.id)).toMatchObject(changes);
        expect(savedGroup.items.map(entry => entry.id)).toEqual(group('processing', '处理成果').items.map(entry => entry.id));
        view.unmount();
        render(<Harness />);
        for (const [key, value] of Object.entries(changes)) expect(field(row(item), key)).toHaveValue(value);
        expect(screen.getByRole('button', { name: '收起重命名处理成果' })).toHaveAttribute('aria-expanded', 'true');
        expect(seedItem('processing', '处理成果', '水平叠加纯波数据').number).toBe('02');
    });

    it('切换类别保留五类草稿，一次保存全部类别，同名条目跨组和类别互不覆盖', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const select = screen.getByRole('combobox', { name: '数据类别' });
        for (const [index, entry] of RESULT_TYPE_CATEGORIES.entries()) {
            await user.selectOptions(select, entry.id);
            const first = seedItem(entry.id, '基本信息', '项目信息');
            fireEvent.change(field(row(first), 'number'), { target: { value: `00${index + 1}` } });
        }
        const magnetic = seedItem('nonseismic', '磁力', '原始数据');
        const geochemical = seedItem('nonseismic', '化探', '原始数据');
        fireEvent.change(field(row(magnetic), 'namingRule'), { target: { value: 'magnetic.dat' } });
        fireEvent.change(field(row(geochemical), 'namingRule'), { target: { value: 'geochemical.dat' } });
        await user.selectOptions(select, 'processing');
        expect(field(row(seedItem('processing', '基本信息', '项目信息')), 'number')).toHaveValue('002');
        await user.click(screen.getByRole('button', { name: '保存' }));
        const saved = loadResultTypes();
        for (const [index, entry] of saved.entries()) expect(entry.groups[0].items[0].number).toBe(`00${index + 1}`);
        const savedNonseismic = saved.find(entry => entry.id === 'nonseismic')!.groups.flatMap(entry => entry.items);
        expect(savedNonseismic.find(entry => entry.id === magnetic.id)!.namingRule).toBe('magnetic.dat');
        expect(savedNonseismic.find(entry => entry.id === geochemical.id)!.namingRule).toBe('geochemical.dat');
        expect(RESULT_TYPE_CATEGORIES.every(entry => entry.groups[0].items[0].number === '01')).toBe(true);
        saved[0].groups[0].items[0].number = 'changed outside the cache';
        expect(loadResultTypes()[0].groups[0].items[0].number).toBe('001');
    });

    it('三个空二级分类显示占位文字，独立填写且未填项保存仍为空', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.selectOptions(screen.getByRole('combobox', { name: '数据类别' }), 'wellbore');
        const environment = group('wellbore', '环境参数').items[0];
        const trajectory = group('wellbore', '井轨迹').items[0];
        const lithology = group('wellbore', '岩性录井').items[0];
        expect(screen.getAllByPlaceholderText('二级分类名称').filter(input => (input as HTMLTextAreaElement).value === '')).toHaveLength(3);
        expect(field(row(environment), 'name')).toHaveValue('');
        fireEvent.change(field(row(environment), 'name'), { target: { value: '环境参数预留项' } });
        fireEvent.change(field(row(trajectory), 'namingRule'), { target: { value: 'well_path.txt' } });
        expect(field(row(lithology), 'name')).toHaveValue('');
        await user.click(screen.getByRole('button', { name: '保存' }));
        const saved = loadResultTypes().find(entry => entry.id === 'wellbore')!.groups.flatMap(entry => entry.items);
        expect(saved.find(entry => entry.id === environment.id)!.name).toBe('环境参数预留项');
        expect(saved.find(entry => entry.id === trajectory.id)).toMatchObject({ name: '', namingRule: 'well_path.txt' });
        expect(saved.find(entry => entry.id === lithology.id)).toMatchObject({ name: '', namingRule: '' });
    });

    it('小三角折叠状态按组保留，查询展开匹配组，重置恢复折叠且不清除编辑', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const select = screen.getByRole('combobox', { name: '数据类别' });
        const item = seedItem('processing', '处理成果', '叠前时间偏移纯波数据');
        fireEvent.change(field(row(item), 'number'), { target: { value: '006' } });
        await user.click(screen.getByRole('button', { name: '收起处理成果' }));
        expect(screen.getByRole('button', { name: '展开处理成果' })).toHaveAttribute('aria-expanded', 'false');
        expect(table().querySelector(`[data-item-id="${item.id}"]`)).not.toBeInTheDocument();
        await user.selectOptions(select, 'acquisition');
        await user.selectOptions(select, 'processing');
        expect(screen.getByRole('button', { name: '展开处理成果' })).toHaveAttribute('aria-expanded', 'false');
        search('pstm_raw');
        expect(itemRows()).toHaveLength(1);
        expect(field(row(item), 'number')).toHaveValue('006');
        expect(screen.getByRole('button', { name: '收起处理成果' })).toHaveAttribute('aria-expanded', 'true');
        await user.click(screen.getByRole('button', { name: '收起处理成果' }));
        expect(itemRows()).toHaveLength(0);
        await user.click(screen.getByRole('button', { name: '重置' }));
        expect(screen.getByRole('button', { name: '展开处理成果' })).toHaveAttribute('aria-expanded', 'false');
        await user.click(screen.getByRole('button', { name: '展开处理成果' }));
        expect(field(row(item), 'number')).toHaveValue('006');
        expect(itemRows()).toHaveLength(30);
        search('不存在的成果类型');
        expect(itemRows()).toHaveLength(0);
        expect(screen.getByText('未找到匹配记录')).toBeVisible();
        await user.selectOptions(select, 'acquisition');
        expect(itemRows()).toHaveLength(37);
        const form = screen.getByRole('button', { name: '查询' }).closest('form')!;
        expect(within(form).getByRole('textbox')).toHaveValue('');
    });

    it('编辑查询结果时保留当前行和焦点，同关键词重新查询才更新匹配结果', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const item = seedItem('processing', '处理成果', '叠前时间偏移纯波数据');
        search('pstm_raw');
        expect(itemRows()).toHaveLength(1);
        const directory = field(row(item), 'englishDirectory');
        await user.clear(directory);
        expect(directory).toHaveFocus();
        expect(directory).toBeInTheDocument();
        expect(row(item)).toBeVisible();
        await user.type(directory, 'REPLACEMENT_DIRECTORY');
        expect(directory).toHaveFocus();
        expect(directory).toHaveValue('REPLACEMENT_DIRECTORY');
        expect(itemRows()).toHaveLength(1);
        await user.click(screen.getByRole('button', { name: '查询' }));
        expect(itemRows()).toHaveLength(0);
        expect(screen.getByText('未找到匹配记录')).toBeVisible();

        search('处理成果');
        expect(itemRows()).toHaveLength(8);
        const groupName = field(groupRow('processing', '处理成果'), 'groupName');
        await user.clear(groupName);
        expect(groupName).toHaveFocus();
        expect(groupName).toBeInTheDocument();
        expect(itemRows()).toHaveLength(8);
        await user.type(groupName, '重新归类');
        expect(groupName).toHaveFocus();
        expect(groupName).toHaveValue('重新归类');
        expect(itemRows()).toHaveLength(8);
        await user.click(screen.getByRole('button', { name: '查询' }));
        expect(itemRows()).toHaveLength(0);
        expect(screen.getByText('未找到匹配记录')).toBeVisible();

        await user.click(screen.getByRole('button', { name: '重置' }));
        expect(itemRows()).toHaveLength(30);
        expect(field(row(item), 'englishDirectory')).toHaveValue('REPLACEMENT_DIRECTORY');
        expect(field(groupRow('processing', '处理成果'), 'groupName')).toHaveValue('重新归类');
    });

    it('查询覆盖全部八个业务字段及编辑后的值，匹配一级分类时保留整组', () => {
        render(<Harness />);
        const item = seedItem('processing', '处理成果', '水平叠加纯波数据');
        const changes = {
            name: '查找二级名称', applicableProjects: '查找适用项目', number: '12345678',
            chineseDirectory: '查找中文目录', englishDirectory: 'SEARCH_DIRECTORY', namingRule: 'search_rule.sgy', notes: '查找备注',
        };
        for (const [key, value] of Object.entries(changes)) fireEvent.change(field(row(item), key), { target: { value } });
        fireEvent.change(field(groupRow('processing', '处理成果'), 'groupName'), { target: { value: '查找一级名称' } });
        for (const value of Object.values(changes)) {
            search(value.toLowerCase());
            expect(itemRows()).toHaveLength(1);
            expect(row(item)).toBeVisible();
        }
        search('查找一级名称');
        expect(itemRows()).toHaveLength(8);
        expect(screen.getByRole('button', { name: '收起查找一级名称' })).toBeVisible();
    });
});
