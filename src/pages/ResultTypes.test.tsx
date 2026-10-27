import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BaselinePage from './BaselinePage';
import { initialState } from '../services/demo';
import { RESULT_TYPE_CATEGORIES, loadResultTypes, saveResultTypes } from '../services/resultTypes';
import { BASELINE_CONFIGS, demoRows, saveBaselineRows } from '../services/baseline';
import { getProjectTypeOptions } from '../services/projectClassification';
import type { ResultTypeCategoryId, ResultTypeItem } from '../services/resultTypes';
import type { AppApi, AppState, Route } from '../types';

const notify = vi.fn();
const baselineProjectTypes = structuredClone(BASELINE_CONFIGS.find(config => config.id === 'types')!.rows);
const expectedCounts = [37, 30, 27, 25, 36];
const categoryHeaders = ['采集项目', '处理项目', '解释项目', '井筒项目', '非地震项目'];
const headers = ['处理项目', '适用项目', '成果编号', '中文目录', '英文目录', '命名规则', '备注', '操作'];
const fieldLabels: Record<string, string> = {
    groupName: '名称', name: '名称', applicableProjects: '适用项目', number: '成果编号',
    chineseDirectory: '中文目录', englishDirectory: '英文目录', namingRule: '命名规则', notes: '备注',
};

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
    const value = element.querySelector<HTMLElement>(`[data-field="${key}"]`);
    expect(value).not.toBeNull();
    return value!;
}
function openEditor(element: HTMLElement) { fireEvent.click(within(element).getByRole('button', { name: /^编辑/ })); }
function modalField(key: string) { return within(screen.getByRole('dialog')).getByRole('textbox', { name: fieldLabels[key] }); }
function submitEditor() { fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '保存' })); }
function projectOptions() {
    const dialog = within(screen.getByRole('dialog'));
    if (!dialog.queryByRole('group', { name: '适用项目选项' })) fireEvent.click(dialog.getByRole('button', { name: '适用项目' }));
    return dialog.getByRole('group', { name: '适用项目选项' });
}
function chooseProjects(names: string[]) {
    projectOptions();
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '清空选择' }));
    for (const name of names) {
        const option = getProjectTypeOptions().find(option => option.leaf && option.name === name)!;
        expect(option).toBeDefined();
        fireEvent.click(within(projectOptions()).getByRole('checkbox', { name: option.path.join(' / ') }));
    }
}
function setModalValue(key: string, value: string) {
    if (key === 'applicableProjects') chooseProjects(value ? value.split('\n') : []);
    else fireEvent.change(modalField(key), { target: { value } });
}
function editFields(element: HTMLElement, values: Record<string, string>) {
    openEditor(element);
    for (const [key, value] of Object.entries(values)) setModalValue(key, value);
    submitEditor();
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
    it('重命名原 tab，默认处理，两级分类共用数据列，五类均显示操作列和新增分类入口', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        expect(screen.getByRole('heading', { name: '成果类型', level: 1 })).toBeVisible();
        expect(screen.getByRole('button', { name: '成果类型' })).toBeVisible();
        expect(screen.getByRole('heading', { name: '项目成果类型' })).toBeVisible();
        expect(screen.queryByRole('button', { name: '保存' })).not.toBeInTheDocument();
        expect(screen.getByText('修改即时生效，刷新页面恢复初始数据')).toBeVisible();
        expect(screen.queryByRole('button', { name: '命名规则' })).not.toBeInTheDocument();
        expect(screen.getAllByRole('columnheader').map(item => item.textContent)).toEqual(headers);
        const select = screen.getByRole('combobox', { name: '数据类别' });
        expect(select).toHaveValue('processing');
        expect(within(select).getAllByRole('option').map(item => item.textContent)).toEqual(['采集', '处理', '解释', '井筒', '非地震']);
        for (const [index, entry] of RESULT_TYPE_CATEGORIES.entries()) {
            await user.selectOptions(select, entry.id);
            expect(itemRows()).toHaveLength(expectedCounts[index]);
            expect(screen.getAllByRole('columnheader').map(item => item.textContent)).toEqual([categoryHeaders[index], ...headers.slice(1)]);
            expect(within(table()).queryAllByRole('textbox')).toHaveLength(0);
            expect(table().querySelectorAll('input,textarea')).toHaveLength(0);
        }
        expect(screen.getByRole('button', { name: '新增分类' })).toBeVisible();
        const firstGroup = groupRow('nonseismic', '基本信息');
        for (const label of ['新增基本信息下级', '编辑基本信息', '上移基本信息', '下移基本信息', '删除基本信息']) {
            expect(within(firstGroup).getByRole('button', { name: label })).toBeVisible();
        }
        expect(within(within(firstGroup).getAllByRole('cell').at(-1)!).getAllByRole('button')).toHaveLength(5);
        const firstItem = row(seedItem('nonseismic', '基本信息', '项目信息'));
        for (const label of ['编辑项目信息', '上移项目信息', '下移项目信息', '删除项目信息']) {
            expect(within(firstItem).getByRole('button', { name: label })).toBeVisible();
        }
        expect(within(firstItem).getAllByRole('button')).toHaveLength(4);
        expect(within(firstItem).queryByRole('button', { name: /^新增/ })).not.toBeInTheDocument();
    });

    it('八个业务字段仅通过弹窗编辑，修改名称焦点稳定，弹窗保存后离开返回保留全部字段', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const item = seedItem('processing', '处理成果', '水平叠加纯波数据');
        const changes = {
            name: '新的成果名称', applicableProjects: '二维处理\n三维处理', number: '002',
            chineseDirectory: '新的中文目录', englishDirectory: 'NEW_DIRECTORY', namingRule: 'line_{name}.sgy',
            notes: '第一条备注，第二条备注',
        };
        openEditor(row(item));
        const nameInput = modalField('name');
        await user.clear(nameInput);
        await user.type(nameInput, changes.name);
        expect(nameInput).toHaveFocus();
        expect(nameInput).toHaveValue(changes.name);
        expect(field(row(item), 'name').textContent).toBe(item.name);
        for (const [key, value] of Object.entries(changes).filter(([key]) => key !== 'name')) {
            setModalValue(key, value);
        }
        submitEditor();
        for (const [key, value] of Object.entries(changes)) expect(field(row(item), key).textContent).toBe(value);
        editFields(groupRow('processing', '处理成果'), { groupName: '重命名处理成果' });
        expect(notify).toHaveBeenCalledWith('成果类型已保存');
        const savedGroup = loadResultTypes().find(entry => entry.id === 'processing')!.groups.find(entry => entry.id === group('processing', '处理成果').id)!;
        expect(savedGroup.name).toBe('重命名处理成果');
        expect(savedGroup.items.find(entry => entry.id === item.id)).toMatchObject(changes);
        expect(savedGroup.items.map(entry => entry.id)).toEqual(group('processing', '处理成果').items.map(entry => entry.id));
        leaveAndReturn();
        for (const [key, value] of Object.entries(changes)) expect(field(row(item), key).textContent).toBe(value);
        expect(table().querySelectorAll('input,textarea')).toHaveLength(0);
        expect(screen.getByRole('button', { name: '收起重命名处理成果' })).toHaveAttribute('aria-expanded', 'true');
        expect(seedItem('processing', '处理成果', '水平叠加纯波数据').number).toBe('02');
    });

    it('五类编辑即时保存，切换类别保留修改，同名条目跨组和类别互不覆盖', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const select = screen.getByRole('combobox', { name: '数据类别' });
        const selections = ['三维陆上常规采集', '二维处理', '二维解释', '井中地震', '重力'];
        for (const [index, entry] of RESULT_TYPE_CATEGORIES.entries()) {
            await user.selectOptions(select, entry.id);
            const first = seedItem(entry.id, '基本信息', '项目信息');
            editFields(row(first), { number: `00${index + 1}`, applicableProjects: selections[index] });
        }
        const magnetic = seedItem('nonseismic', '磁力', '原始数据');
        const geochemical = seedItem('nonseismic', '化探', '原始数据');
        editFields(row(magnetic), { namingRule: 'magnetic.dat' });
        editFields(row(geochemical), { namingRule: 'geochemical.dat' });
        await user.selectOptions(select, 'processing');
        expect(field(row(seedItem('processing', '基本信息', '项目信息')), 'number').textContent).toBe('002');
        const saved = loadResultTypes();
        for (const [index, entry] of saved.entries()) {
            expect(entry.groups[0].items[0].number).toBe(`00${index + 1}`);
            expect(entry.groups[0].items[0].applicableProjects).toBe(selections[index]);
            expect(entry.groups[0].items[0].applicableProjectTypes).toEqual([
                { id: getProjectTypeOptions().find(option => option.name === selections[index])!.id, name: selections[index] },
            ]);
        }
        const savedNonseismic = saved.find(entry => entry.id === 'nonseismic')!.groups.flatMap(entry => entry.items);
        expect(savedNonseismic.find(entry => entry.id === magnetic.id)!.namingRule).toBe('magnetic.dat');
        expect(savedNonseismic.find(entry => entry.id === geochemical.id)!.namingRule).toBe('geochemical.dat');
        expect(RESULT_TYPE_CATEGORIES.every(entry => entry.groups[0].items[0].number === '01')).toBe(true);
        saved[0].groups[0].items[0].number = 'changed outside the cache';
        expect(loadResultTypes()[0].groups[0].items[0].number).toBe('001');
        leaveAndReturn();
        expect(field(row(seedItem('processing', '基本信息', '项目信息')), 'number').textContent).toBe('002');
    });

    it('三个空二级分类显示占位文字，独立填写且未填项保存仍为空', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        await user.selectOptions(screen.getByRole('combobox', { name: '数据类别' }), 'wellbore');
        const environment = group('wellbore', '环境参数').items[0];
        const trajectory = group('wellbore', '井轨迹').items[0];
        const lithology = group('wellbore', '岩性录井').items[0];
        expect(screen.getAllByText('二级分类名称', { exact: true })).toHaveLength(3);
        expect(field(row(environment), 'name').textContent).toBe('二级分类名称');
        expect(field(row(environment), 'chineseDirectory').textContent).toBe('—');
        openEditor(row(environment));
        expect(modalField('name')).toHaveValue('');
        expect(modalField('chineseDirectory')).toHaveValue('');
        fireEvent.change(modalField('name'), { target: { value: '环境参数预留项' } });
        submitEditor();
        editFields(row(trajectory), { namingRule: 'well_path.txt' });
        expect(field(row(lithology), 'name').textContent).toBe('二级分类名称');
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
        editFields(row(item), { number: '006' });
        await user.click(screen.getByRole('button', { name: '收起处理成果' }));
        expect(screen.getByRole('button', { name: '展开处理成果' })).toHaveAttribute('aria-expanded', 'false');
        expect(table().querySelector(`[data-item-id="${item.id}"]`)).not.toBeInTheDocument();
        await user.selectOptions(select, 'acquisition');
        await user.selectOptions(select, 'processing');
        expect(screen.getByRole('button', { name: '展开处理成果' })).toHaveAttribute('aria-expanded', 'false');
        search('pstm_raw');
        expect(itemRows()).toHaveLength(1);
        expect(field(row(item), 'number').textContent).toBe('006');
        expect(screen.getByRole('button', { name: '收起处理成果' })).toHaveAttribute('aria-expanded', 'true');
        await user.click(screen.getByRole('button', { name: '收起处理成果' }));
        expect(itemRows()).toHaveLength(0);
        await user.click(screen.getByRole('button', { name: '重置' }));
        expect(screen.getByRole('button', { name: '展开处理成果' })).toHaveAttribute('aria-expanded', 'false');
        await user.click(screen.getByRole('button', { name: '展开处理成果' }));
        expect(field(row(item), 'number').textContent).toBe('006');
        expect(itemRows()).toHaveLength(30);
        search('不存在的成果类型');
        expect(itemRows()).toHaveLength(0);
        expect(screen.getByText('未找到匹配记录')).toBeVisible();
        await user.selectOptions(select, 'acquisition');
        expect(itemRows()).toHaveLength(37);
        const form = screen.getByRole('button', { name: '查询' }).closest('form')!;
        expect(within(form).getByRole('textbox')).toHaveValue('');
    });

    it('弹窗修改查询结果后保留匹配行，同关键词重新查询才更新匹配结果', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const item = seedItem('processing', '处理成果', '叠前时间偏移纯波数据');
        search('pstm_raw');
        expect(itemRows()).toHaveLength(1);
        openEditor(row(item));
        const directory = modalField('englishDirectory');
        await user.clear(directory);
        expect(directory).toHaveFocus();
        expect(directory).toBeInTheDocument();
        expect(row(item)).toBeVisible();
        await user.type(directory, 'REPLACEMENT_DIRECTORY');
        expect(directory).toHaveFocus();
        expect(directory).toHaveValue('REPLACEMENT_DIRECTORY');
        submitEditor();
        expect(field(row(item), 'englishDirectory').textContent).toBe('REPLACEMENT_DIRECTORY');
        expect(itemRows()).toHaveLength(1);
        await user.click(screen.getByRole('button', { name: '查询' }));
        expect(itemRows()).toHaveLength(0);
        expect(screen.getByText('未找到匹配记录')).toBeVisible();

        search('处理成果');
        expect(itemRows()).toHaveLength(8);
        openEditor(groupRow('processing', '处理成果'));
        const groupName = modalField('groupName');
        await user.clear(groupName);
        expect(groupName).toHaveFocus();
        expect(groupName).toBeInTheDocument();
        expect(itemRows()).toHaveLength(8);
        await user.type(groupName, '重新归类');
        expect(groupName).toHaveFocus();
        expect(groupName).toHaveValue('重新归类');
        submitEditor();
        expect(field(groupRow('processing', '处理成果'), 'groupName').textContent).toBe('重新归类');
        expect(itemRows()).toHaveLength(8);
        await user.click(screen.getByRole('button', { name: '查询' }));
        expect(itemRows()).toHaveLength(0);
        expect(screen.getByText('未找到匹配记录')).toBeVisible();

        await user.click(screen.getByRole('button', { name: '重置' }));
        expect(itemRows()).toHaveLength(30);
        expect(field(row(item), 'englishDirectory').textContent).toBe('REPLACEMENT_DIRECTORY');
        expect(field(groupRow('processing', '处理成果'), 'groupName').textContent).toBe('重新归类');
    });

    it('查询覆盖全部八个业务字段及编辑后的值，匹配一级分类时保留整组', () => {
        render(<Harness />);
        const item = seedItem('processing', '处理成果', '水平叠加纯波数据');
        const changes = {
            name: '查找二级名称', applicableProjects: '二维处理', number: '12345678',
            chineseDirectory: '查找中文目录', englishDirectory: 'SEARCH_DIRECTORY', namingRule: 'search_rule.sgy', notes: '查找备注',
        };
        editFields(row(item), changes);
        editFields(groupRow('processing', '处理成果'), { groupName: '查找一级名称' });
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

describe('成果类型适用项目选择', () => {
    it('五类新增和编辑均只提供本类别末级选项，选择及保存相互隔离', async () => {
        const user = userEvent.setup();
        render(<Harness />);
        const scenarios: Array<{ id: ResultTypeCategoryId; paths: string[] }> = [
            { id: 'acquisition', paths: ['采集 / 三维陆上常规采集', '采集 / 三维陆上混叠采集', '采集 / 二维陆上采集'] },
            { id: 'processing', paths: ['处理 / 二维处理', '处理 / 三维处理'] },
            { id: 'interpretation', paths: ['解释 / 二维解释', '解释 / 三维解释'] },
            { id: 'wellbore', paths: ['井筒 / 井中地震', '井筒 / 常规测井'] },
            { id: 'nonseismic', paths: ['非地震 / 重力', '非地震 / 磁法'] },
        ];
        for (const { id, paths } of scenarios) {
            await user.selectOptions(screen.getByRole('combobox', { name: '数据类别' }), id);
            fireEvent.click(within(groupRow(id, '基本信息')).getByRole('button', { name: '新增基本信息下级' }));
            let options = within(projectOptions());
            expect(options.getAllByRole('checkbox')).toHaveLength(paths.length);
            for (const path of paths) expect(options.getByRole('checkbox', { name: path })).toBeEnabled();
            fireEvent.click(options.getByRole('checkbox', { name: paths[0] }));
            fireEvent.change(options.getByLabelText('搜索项目类型'), { target: { value: id === 'processing' ? '井中地震' : '二维处理' } });
            expect(options.queryAllByRole('checkbox')).toHaveLength(0);
            expect(options.getByText('无匹配项目类型')).toBeVisible();
            const name = `${category(id).name}限定成果项`;
            fireEvent.change(modalField('name'), { target: { value: name } });
            submitEditor();
            const created = screen.getByRole('button', { name: `编辑${name}` }).closest('tr')!;
            expect(field(created, 'applicableProjects').textContent).toBe(paths[0].split(' / ').at(-1));
            openEditor(created);
            options = within(projectOptions());
            expect(options.getAllByRole('checkbox')).toHaveLength(paths.length);
            for (const path of paths) expect(options.getByRole('checkbox', { name: path })).toBeEnabled();
            expect(options.getByRole('checkbox', { name: paths[0] })).toBeChecked();
            chooseProjects([paths.at(-1)!.split(' / ').at(-1)!]);
            submitEditor();
            expect(field(created, 'applicableProjects').textContent).toBe(paths.at(-1)!.split(' / ').at(-1));
        }
        const saved = loadResultTypes();
        for (const { id, paths } of scenarios) {
            const name = paths.at(-1)!.split(' / ').at(-1)!;
            const option = getProjectTypeOptions().find(option => option.path.join(' / ') === paths.at(-1))!;
            const item = saved.find(entry => entry.id === id)!.groups.flatMap(group => group.items).find(item => item.name === `${category(id).name}限定成果项`)!;
            expect(item.applicableProjects).toBe(name);
            expect(item.applicableProjectTypes).toEqual([{ id: option.id, name }]);
        }
    });

    it('已知跨类旧关联只从编辑草稿剔除，取消保留原值，保存清理跨类但保留未知与已删快照', () => {
        const initial = loadResultTypes();
        const items = initial.find(category => category.id === 'processing')!.groups.find(group => group.name === '处理成果')!.items;
        const item = items[0], legacyTextItem = items[1];
        const allowed = getProjectTypeOptions().find(option => option.name === '二维处理')!;
        const other = getProjectTypeOptions().find(option => option.name === '井中地震')!;
        const retained = [{ name: '历史自由类型' }, { id: 'deleted-project-type', name: '已删除类型快照' }];
        item.applicableProjectTypes = [{ id: allowed.id, name: allowed.name }, { id: other.id, name: other.name }, ...retained];
        item.applicableProjects = '二维处理\n井中地震\n历史自由类型\n已删除类型快照';
        legacyTextItem.applicableProjects = '井中地震';
        saveResultTypes(initial);
        render(<Harness />);
        openEditor(row(item));
        let options = within(projectOptions());
        expect(options.queryByRole('checkbox', { name: /井中地震/ })).not.toBeInTheDocument();
        for (const name of ['处理 / 二维处理', '历史自由类型', '已删除类型快照']) {
            expect(options.getByRole('checkbox', { name })).toBeChecked();
        }
        expect(field(row(item), 'applicableProjects').textContent).toBe(item.applicableProjects);
        fireEvent.click(options.getByRole('checkbox', { name: '处理 / 三维处理' }));
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '取消' }));
        expect(field(row(item), 'applicableProjects').textContent).toBe(item.applicableProjects);
        expect(loadResultTypes().find(category => category.id === 'processing')!.groups.flatMap(group => group.items).find(entry => entry.id === item.id)).toEqual(item);
        openEditor(row(item));
        options = within(projectOptions());
        expect(options.getByRole('checkbox', { name: '处理 / 三维处理' })).not.toBeChecked();
        expect(options.queryByRole('checkbox', { name: /井中地震/ })).not.toBeInTheDocument();
        submitEditor();
        expect(field(row(item), 'applicableProjects').textContent).toBe('二维处理\n历史自由类型\n已删除类型快照');
        expect(field(row(legacyTextItem), 'applicableProjects').textContent).toBe('井中地震');
        openEditor(row(legacyTextItem));
        expect(within(projectOptions()).queryByRole('checkbox', { name: /井中地震/ })).not.toBeInTheDocument();
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '取消' }));
        expect(field(row(legacyTextItem), 'applicableProjects').textContent).toBe('井中地震');
        openEditor(row(legacyTextItem));
        submitEditor();
        expect(field(row(legacyTextItem), 'applicableProjects').textContent).toBe('—');
        const saved = loadResultTypes().find(category => category.id === 'processing')!.groups.flatMap(group => group.items);
        expect(saved.find(entry => entry.id === item.id)!.applicableProjectTypes).toEqual([{ id: allowed.id, name: allowed.name }, ...retained]);
        expect(saved.find(entry => entry.id === legacyTextItem.id)).toMatchObject({ applicableProjects: '', applicableProjectTypes: [] });
    });

    it('只选择当前处理类别的末级类型，筛选保留多选，其他类别无结果，取消和清空按弹窗保存生效', () => {
        render(<Harness />);
        const item = seedItem('processing', '处理成果', '水平叠加纯波数据');
        openEditor(row(item));
        expect(within(screen.getByRole('dialog')).queryByRole('textbox', { name: '适用项目' })).not.toBeInTheDocument();
        const options = within(projectOptions());
        for (const path of ['处理 / 二维处理', '处理 / 三维处理']) {
            expect(options.getByRole('checkbox', { name: path })).toBeEnabled();
        }
        expect(options.getAllByRole('checkbox')).toHaveLength(2);
        for (const parent of ['采集', '处理', '井筒', '非地震']) {
            const checkbox = options.queryByRole('checkbox', { name: parent });
            if (checkbox) expect(checkbox).toBeDisabled();
        }
        fireEvent.click(options.getByRole('checkbox', { name: '处理 / 二维处理' }));
        fireEvent.click(options.getByRole('checkbox', { name: '处理 / 三维处理' }));
        fireEvent.change(options.getByLabelText('搜索项目类型'), { target: { value: '二维' } });
        expect(options.queryByRole('checkbox', { name: '处理 / 三维处理' })).not.toBeInTheDocument();
        expect(options.getByRole('checkbox', { name: '处理 / 二维处理' })).toBeChecked();
        fireEvent.change(options.getByLabelText('搜索项目类型'), { target: { value: '井中地震' } });
        expect(options.queryAllByRole('checkbox')).toHaveLength(0);
        expect(options.getByText('无匹配项目类型')).toBeVisible();
        fireEvent.change(options.getByLabelText('搜索项目类型'), { target: { value: '' } });
        for (const path of ['处理 / 二维处理', '处理 / 三维处理']) {
            expect(options.getByRole('checkbox', { name: path })).toBeChecked();
        }
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '取消' }));
        expect(field(row(item), 'applicableProjects').textContent).toBe('—');

        editFields(row(item), { applicableProjects: '二维处理\n三维处理' });
        expect(field(row(item), 'applicableProjects').textContent).toBe('二维处理\n三维处理');
        expect(loadResultTypes().find(category => category.id === 'processing')!.groups.flatMap(group => group.items).find(entry => entry.id === item.id)!.applicableProjects).toBe('二维处理\n三维处理');
        search('二维处理');
        expect(itemRows()).toHaveLength(1);
        expect(row(item)).toBeVisible();
        openEditor(row(item));
        chooseProjects([]);
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '取消' }));
        expect(field(row(item), 'applicableProjects').textContent).toBe('二维处理\n三维处理');
        editFields(row(item), { applicableProjects: '' });
        expect(field(row(item), 'applicableProjects').textContent).toBe('—');
        const saved = loadResultTypes().find(category => category.id === 'processing')!.groups.flatMap(group => group.items).find(entry => entry.id === item.id)!;
        expect(saved).toMatchObject({ applicableProjects: '', applicableProjectTypes: [] });
        search('二维处理');
        expect(itemRows()).toHaveLength(0);
    });

    it('读取动态新增类型，根和末级改名仍按ID归属，删除类型后保留快照并可取消关联', () => {
        const view = render(<Harness />);
        const item = seedItem('processing', '处理成果', '水平叠加纯波数据');
        const parent = demoRows.types.find(type => type.name === '处理' && !type.parent)!;
        const addedType = { id: 'test-dynamic-project-type', name: '动态处理类型', parent: parent.id, level: 2, color: '#224466' };
        saveBaselineRows('types', [...demoRows.types, addedType]);
        openEditor(row(item));
        expect(within(projectOptions()).getByRole('checkbox', { name: '处理 / 动态处理类型' })).toBeEnabled();
        fireEvent.click(within(projectOptions()).getByRole('checkbox', { name: '处理 / 动态处理类型' }));
        submitEditor();
        const saved = loadResultTypes().find(category => category.id === 'processing')!.groups.flatMap(group => group.items).find(entry => entry.id === item.id)!;
        expect(saved.applicableProjectTypes).toEqual([{ id: addedType.id, name: '动态处理类型' }]);
        expect(saved.applicableProjects).toBe('动态处理类型');

        saveBaselineRows('types', demoRows.types.map(type => type.id === addedType.id ? { ...type, name: '改名后的动态类型' }
            : type.id === parent.id ? { ...type, name: '处理根节点新名称' } : type));
        view.rerender(<Harness />);
        expect(field(row(item), 'applicableProjects').textContent).toBe('改名后的动态类型');
        openEditor(row(item));
        expect(within(projectOptions()).getByRole('checkbox', { name: '处理根节点新名称 / 改名后的动态类型' })).toBeChecked();
        expect(within(projectOptions()).queryByRole('checkbox', { name: '井筒 / 井中地震' })).not.toBeInTheDocument();
        fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '取消' }));
        search('改名后的动态类型');
        expect(itemRows()).toHaveLength(1);
        fireEvent.click(screen.getByRole('button', { name: '重置' }));

        saveBaselineRows('types', demoRows.types.filter(type => type.id !== addedType.id));
        view.rerender(<Harness />);
        expect(field(row(item), 'applicableProjects').textContent).toBe('动态处理类型');
        openEditor(row(item));
        const retained = within(projectOptions()).getByRole('checkbox', { name: '动态处理类型' });
        expect(retained).toBeChecked();
        fireEvent.click(retained);
        submitEditor();
        expect(field(row(item), 'applicableProjects').textContent).toBe('—');
        expect(loadResultTypes().find(category => category.id === 'processing')!.groups.flatMap(group => group.items).find(entry => entry.id === item.id)!.applicableProjectTypes).toEqual([]);
    });

    it('遗留自由文本保持已选状态，可与基准类型并存且单独取消，不把显示占位写入数据', () => {
        const initial = loadResultTypes();
        const item = initial.find(category => category.id === 'processing')!.groups.find(group => group.name === '处理成果')!.items[0];
        item.applicableProjects = '历史自由类型';
        saveResultTypes(initial);
        render(<Harness />);
        expect(field(row(item), 'applicableProjects').textContent).toBe('历史自由类型');
        openEditor(row(item));
        expect(within(projectOptions()).getByRole('checkbox', { name: '历史自由类型' })).toBeChecked();
        fireEvent.click(within(projectOptions()).getByRole('checkbox', { name: '处理 / 三维处理' }));
        submitEditor();
        expect(field(row(item), 'applicableProjects').textContent).toBe('历史自由类型\n三维处理');
        const savedItem = () => loadResultTypes().find(category => category.id === 'processing')!.groups.flatMap(group => group.items).find(entry => entry.id === item.id)!;
        expect(savedItem().applicableProjectTypes).toEqual([
            { name: '历史自由类型' },
            { id: getProjectTypeOptions().find(option => option.name === '三维处理')!.id, name: '三维处理' },
        ]);
        openEditor(row(item));
        fireEvent.click(within(projectOptions()).getByRole('checkbox', { name: '历史自由类型' }));
        expect(within(projectOptions()).getByRole('checkbox', { name: '处理 / 三维处理' })).toBeChecked();
        submitEditor();
        expect(savedItem().applicableProjects).toBe('三维处理');
        expect(savedItem().applicableProjectTypes).toEqual([
            { id: getProjectTypeOptions().find(option => option.name === '三维处理')!.id, name: '三维处理' },
        ]);
    });
});
