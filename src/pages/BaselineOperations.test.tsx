import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BaselinePage from './BaselinePage';
import { LanguageProvider, useTranslation } from '../i18n';
import { initialState } from '../services/demo';
import {
    BASELINE_CONFIGS, SORTABLE_BASELINE_IDS, baselineSiblings, demoRows,
    moveBaselineRow, normalizeBaselineOrder, placeBaselineRow, saveBaselineRows, projectTypeParentOptions, projectTypeParentError, baselinePath,
} from '../services/baseline';
import type { BaselineRow } from '../services/baseline';
import type { AppApi, AppState, Route } from '../types';

const notify = vi.fn();
function Harness({ section }: { section: string }) {
    const [state, setState] = useState<AppState>({ ...initialState('admin'), route: { page: 'baseline', section } });
    const navigate = (route: Route) => setState(previous => ({ ...previous, route }));
    const api: AppApi = { state, setState, navigate, notify, deny: vi.fn(), openProject: vi.fn() };
    return <BaselinePage api={api} />;
}
function tableRows() { return within(screen.getByRole('table')).getAllByRole('row').slice(1); }
function nameRow(name: string) { return screen.getByRole('button', { name }).closest('tr') as HTMLTableRowElement; }
function reorder(handle: HTMLElement, direction: 'ArrowUp' | 'ArrowDown', commit = true) {
    fireEvent.keyDown(handle, { key: ' ' });
    fireEvent.keyDown(handle, { key: direction });
    fireEvent.keyDown(handle, { key: commit ? ' ' : 'Escape' });
}
function dragHandle(name: string) { return screen.getByRole('button', { name: `拖动排序${name}` }); }

beforeEach(() => {
    vi.clearAllMocks();
    for (const config of BASELINE_CONFIGS) saveBaselineRows(config.id, config.rows);
});

describe('基准同级排序服务', () => {
    it('除成果类型独立排序外，其余基准栏目均支持移动', () => {
        expect([...SORTABLE_BASELINE_IDS].sort()).toEqual(BASELINE_CONFIGS.filter(config => config.id !== 'naming').map(config => config.id).sort());
        const rows: BaselineRow[] = [{ id: 'a', name: '甲', sort: 8 }, { id: 'b', name: '乙', sort: 2 }];
        expect(moveBaselineRow('naming', rows, 'a', 1)).toBe(rows);
        expect(normalizeBaselineOrder('naming', rows)).toEqual(rows);
    });
    it('空字符串与未定义的根节点是同级，首末和不存在的节点不能越界', () => {
        const rows: BaselineRow[] = [{ id: 'a', name: '甲' }, { id: 'b', name: '乙', parent: '' }];
        expect(baselineSiblings(rows, rows[0]).map(row => row.id)).toEqual(['a', 'b']);
        expect(moveBaselineRow('types', rows, 'a', -1)).toBe(rows);
        expect(moveBaselineRow('types', rows, 'b', 1)).toBe(rows);
        expect(moveBaselineRow('types', rows, 'unknown', 1)).toBe(rows);
        expect(moveBaselineRow('types', rows, 'b', -1).map(row => row.id)).toEqual(['b', 'a']);
        expect(rows.map(row => row.id)).toEqual(['a', 'b']);
    });
    it('移动顶级构造单元时携带整棵子树，不丢失父子关系或跨级混排', () => {
        const rows = demoRows.structure;
        const moved = moveBaselineRow('structure', rows, '1', 1);
        expect(moved.map(row => row.id)).toEqual(['10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '1', '2', '3', '4', '5', '6', '7', '8', '9']);
        expect(moved.find(row => row.id === '3')).toMatchObject({ parent: '2', level: 3 });
        expect(moved.filter(row => row.parent === '').map(row => row.sort)).toEqual([1, 2]);
        expect(new Set(moved.map(row => row.id)).size).toBe(rows.length);
    });
    it('同级移动不跨父级；首个凹陷不能向上越过父节点', () => {
        const rows = demoRows.structure;
        expect(moveBaselineRow('structure', rows, '3', -1)).toBe(rows);
        const moved = moveBaselineRow('structure', rows, '3', 1);
        expect(baselineSiblings(moved, moved.find(row => row.id === '3')!).map(row => row.id)).toEqual(['4', '3']);
        expect(moved.find(row => row.id === '3')).toMatchObject({ parent: '2', sort: 2 });
        expect(moved.find(row => row.id === '4')).toMatchObject({ parent: '2', sort: 1 });
    });
    it('三级类型移动只在同父节点内，二级父节点移动携带其三级子节点', () => {
        const rows: BaselineRow[] = [
            { id: 'a', name: '一级甲', level: 1 },
            { id: 'b', name: '二级甲', parent: 'a', level: 2 },
            { id: 'x', name: '三级甲', parent: 'b', level: 3 },
            { id: 'y', name: '三级乙', parent: 'b', level: 3 },
            { id: 'c', name: '二级乙', parent: 'a', level: 2 },
            { id: 'z', name: '三级丙', parent: 'c', level: 3 },
            { id: 'd', name: '一级乙', level: 1 },
        ];
        expect(moveBaselineRow('types', rows, 'x', -1)).toBe(rows);
        expect(moveBaselineRow('types', rows, 'y', 1)).toBe(rows);
        const changed = moveBaselineRow('types', rows, 'x', 1);
        expect(baselineSiblings(changed, changed.find(row => row.id === 'x')!).map(row => row.id)).toEqual(['y', 'x']);
        const movedParent = moveBaselineRow('types', changed, 'b', 1);
        expect(movedParent.map(row => row.id)).toEqual(['a', 'c', 'z', 'b', 'y', 'x', 'd']);
        expect(movedParent.find(row => row.id === 'x')).toMatchObject({ parent: 'b', level: 3 });
        expect(movedParent.find(row => row.id === 'b')).toMatchObject({ parent: 'a', level: 2 });
    });
    it('移动更新内部排序值，指定位置插入保持同级顺序，并保留模块缓存', () => {
        const rows: BaselineRow[] = [{ id: 'a', name: '甲', sort: 9 }, { id: 'b', name: '乙', sort: 20 }, { id: 'c', name: '丙', sort: 50 }];
        const moved = moveBaselineRow('wells', rows, 'b', -1);
        expect(moved.map(row => [row.id, row.sort])).toEqual([['b', 1], ['a', 2], ['c', 3]]);
        const placed = placeBaselineRow('wells', moved, { ...moved[2], sort: 1 }, 1);
        expect(placed.map(row => [row.id, row.sort])).toEqual([['c', 1], ['b', 2], ['a', 3]]);
        saveBaselineRows('wells', placed);
        expect(demoRows.wells).toEqual(placed);
        expect(rows.map(row => row.sort)).toEqual([9, 20, 50]);
    });
});

describe('基准操作列与类型表单', () => {
    it('仅一级类型有新增按钮，二三级保持编辑、拖动排序和删除的列槽位', () => {
        saveBaselineRows('types', [...demoRows.types, { id: 'third', name: '三级类型', parent: '2', level: 3, color: '#277DA8' }]);
        render(<Harness section="types" />);
        const toggle = screen.getByRole('button', { name: '展开三维陆上常规采集' });
        fireEvent.click(toggle);
        const parentActions = nameRow('采集').querySelector('.baseline-row-actions') as HTMLElement;
        expect(within(parentActions).getAllByRole('button').map(button => button.title)).toEqual(['新增下级', '编辑', '长按拖动排序', '删除']);
        const secondLevelActions = nameRow('三维陆上常规采集').querySelector('.baseline-row-actions') as HTMLElement;
        expect(within(secondLevelActions).getAllByRole('button').map(button => button.title)).toEqual(['编辑', '长按拖动排序', '删除']);
        expect(within(secondLevelActions).getByTitle('编辑')).toHaveClass('action-edit');
        const childActions = nameRow('三级类型').querySelector('.baseline-row-actions') as HTMLElement;
        expect(within(childActions).getAllByRole('button').map(button => button.title)).toEqual(['编辑', '长按拖动排序', '删除']);
        expect(within(childActions).getByTitle('编辑')).toHaveClass('action-edit');
        expect(within(childActions).getByTitle('删除')).toHaveClass('action-delete');
        expect(screen.getByRole('columnheader', { name: '操作' })).toHaveClass('baseline-actions-heading');
        expect(screen.queryByRole('button', { name: /^查看/ })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /^(上移|下移)/ })).not.toBeInTheDocument();
    });
    it('排序手柄短点与Escape取消不保存，父项携带子项且子项只能在同父级内排序', () => {
        const original: BaselineRow[] = [
            { id: '1', name: '父分类甲', color: '#112233', level: 1 },
            { id: '2', name: '子分类甲', color: '#224466', parent: '1', level: 2 },
            { id: '3', name: '子分类乙', color: '#335577', parent: '1', level: 2 },
            { id: '5', name: '父分类乙', color: '#446688', level: 1 },
            { id: '6', name: '唯一下级', color: '#557799', parent: '5', level: 2 },
        ];
        saveBaselineRows('types', original);
        const cached = structuredClone(demoRows.types);
        render(<Harness section="types" />);
        fireEvent.click(screen.getByRole('button', { name: '展开父分类乙' }));
        fireEvent.click(dragHandle('父分类甲'));
        expect(demoRows.types).toEqual(cached);
        reorder(dragHandle('父分类甲'), 'ArrowDown', false);
        expect(demoRows.types).toEqual(cached);
        const handle = dragHandle('父分类甲');
        fireEvent.keyDown(handle, { key: 'Enter' });
        expect(handle).toHaveAttribute('aria-pressed', 'true');
        fireEvent.keyDown(handle, { key: 'ArrowDown' });
        expect(demoRows.types).toEqual(cached);
        fireEvent.keyDown(handle, { key: 'Enter' });
        expect(demoRows.types.map(row => row.id)).toEqual(['5', '6', '1', '2', '3']);
        expect(dragHandle('唯一下级')).toBeDisabled();
        reorder(dragHandle('子分类甲'), 'ArrowUp');
        expect(demoRows.types.map(row => row.id)).toEqual(['5', '6', '1', '2', '3']);
        reorder(dragHandle('子分类甲'), 'ArrowDown');
        expect(demoRows.types.map(row => row.id)).toEqual(['5', '6', '1', '3', '2']);
        for (const row of cached) expect(demoRows.types.find(entry => entry.id === row.id)).toEqual(row);
    });
    it('一级项目类型和二级构造单元仍可通过行按钮新增下级', async () => {
        const user = userEvent.setup();
        render(<Harness section="types" />);
        await user.click(screen.getByRole('button', { name: '新增采集下级' }));
        expect(within(screen.getByRole('dialog')).getByRole('combobox', { name: '上级类型' })).toHaveValue('1');
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '取消' }));
        await user.click(within(screen.getByRole('navigation', { name: '基准栏目' })).getByRole('button', { name: '构造单元' }));
        await user.click(screen.getByRole('button', { name: '新增东部坳陷下级' }));
        expect(screen.getByRole('dialog')).toHaveTextContent('上级单元：东部坳陷');
        expect(screen.getByRole('dialog')).toHaveTextContent('等级：3');
    });
    it('名称仍可打开详情，磁盘扫描保留且删除放在末尾', async () => {
        const user = userEvent.setup();
        render(<Harness section="disks" />);
        const row = nameRow('57服务器-华北-解释项目');
        expect(within(row.querySelector('.row-actions') as HTMLElement).getAllByRole('button').map(button => button.title)).toEqual(['编辑', '长按拖动排序', '扫描', '删除']);
        await user.click(screen.getByRole('button', { name: '57服务器-华北-解释项目' }));
        expect(screen.getByRole('dialog', { name: '查看磁盘挂载' })).toBeInTheDocument();
        expect(within(screen.getByRole('dialog')).getByText('/home/seismic-bank/mnt/diyan_huabei')).toBeInTheDocument();
    });
    it.each(['structure', 'areas', 'mining', 'imagery'])('%s 手柄排序不能越过完整列表的首尾边界', section => {
        render(<Harness section={section} />);
        const config = BASELINE_CONFIGS.find(candidate => candidate.id === section)!;
        const roots = demoRows[section].filter(row => !config.tree || !row.parent);
        const original = structuredClone(demoRows[section]);
        expect(dragHandle(roots[0].name)).toBeEnabled();
        expect(dragHandle(roots.at(-1)!.name)).toBeEnabled();
        reorder(dragHandle(roots[0].name), 'ArrowUp');
        reorder(dragHandle(roots.at(-1)!.name), 'ArrowDown');
        expect(demoRows[section]).toEqual(original);
    });
    it('筛选单条工区仍按真实相邻记录移动，清空后显示新的实际序号', async () => {
        const user = userEvent.setup();
        render(<Harness section="areas" />);
        await user.type(screen.getByRole('textbox', { name: '名称' }), '大安区块');
        await user.click(screen.getByRole('button', { name: '查询' }));
        expect(tableRows()).toHaveLength(1);
        expect(dragHandle('大安区块')).toBeEnabled();
        reorder(dragHandle('大安区块'), 'ArrowUp');
        expect(demoRows.areas.map(row => row.name).slice(2, 5)).toEqual(['东台坳陷白驹凹陷大丰次凹海丰构造', '大安区块', '大丰次凹']);
        await user.click(screen.getByRole('button', { name: '重置' }));
        const row = nameRow('大安区块');
        expect(within(row).getAllByRole('cell')[0]).toHaveTextContent('4');
    });
    it('井别移动后排序值和序号同步，并在重新进入栏目时保留', async () => {
        const user = userEvent.setup();
        saveBaselineRows('wells', [{ id: 'a', name: '探井' }, { id: 'b', name: '评价井' }, { id: 'c', name: '开发井' }]);
        render(<Harness section="wells" />);
        reorder(dragHandle('评价井'), 'ArrowUp');
        const row = nameRow('评价井');
        expect(within(row).getAllByRole('cell')[0]).toHaveTextContent('1');
        expect(screen.queryByRole('columnheader', { name: '排序值' })).not.toBeInTheDocument();
        expect(demoRows.wells.map(row => row.sort)).toEqual([1, 2, 3]);
        await user.click(screen.getByRole('navigation', { name: '基准栏目' }).querySelector('button')!);
        await user.click(within(screen.getByRole('navigation', { name: '基准栏目' })).getByRole('button', { name: '井别' }));
        expect(tableRows()[0]).toHaveTextContent('评价井');
    });
    it.each(['closure', 'datum', 'velocity', 'disks', 'servers'])('%s 仅一条记录时排序手柄禁用', section => {
        const config = BASELINE_CONFIGS.find(candidate => candidate.id === section)!;
        saveBaselineRows(section, [config.rows[0]]);
        render(<Harness section={section} />);
        expect(dragHandle(config.rows[0].name)).toBeDisabled();
        expect(demoRows[section]).toEqual([config.rows[0]]);
    });
    it.each(['clients', 'contractors', 'teams', 'closure', 'datum', 'velocity', 'disks', 'servers'])('%s 移动边界与序号正确，查询按真实邻项排序，切换栏目保留顺序和字段', async section => {
        const user = userEvent.setup();
        const config = BASELINE_CONFIGS.find(candidate => candidate.id === section)!;
        const original: BaselineRow[] = Array.from({ length: 4 }, (_, index) => {
            const row = config.rows[index] || { ...config.rows[0], id: `sort-fixture-${index}`, name: `${config.rows[0].name}（${index + 1}）` };
            const contact = { address: `保留地址${index + 1}`, phone: `0100000000${index}`, email: `contact${index}@example.com` };
            const metadata: Record<string, Partial<BaselineRow>> = {
                clients: contact, contractors: contact,
                teams: { contractor: index % 2 ? '东方物探新兴物探经理部' : '东方物探研究院西南分院' },
                closure: { surfaceHeight: 100 + index, datumHeight: 200 + index, static: 3 + index, top: 400 + index, weather: 500 + index, correct: 600 + index, delay: 7 + index, thickness: 8 + index },
                datum: { basin: '四川盆地', type: '浮动基准面', value: String(index), grid: `datum-${index}.grid`, contour: `datum-${index}.contour` },
                velocity: { basin: '北部湾盆地', type: '空变替换速度', value: String(2000 + index), grid: `velocity-${index}.grid`, contour: `velocity-${index}.contour` },
                disks: { server: '昌平G楼', path: `/mnt/sort-test-${index}`, mode: '只读', status: '启用', scanned: `2026-10-2${index + 1} 10:00` },
                servers: { ip: `192.0.2.${index + 1}`, port: String(8000 + index), primary: '非主节点', status: '启用' },
            };
            return { ...row, ...metadata[section], note: `保留备注${index + 1}` };
        });
        saveBaselineRows(section, original);
        render(<Harness section={section} />);
        const [first, second, third, last] = original;
        expect(dragHandle(first.name)).toBeEnabled();
        expect(dragHandle(last.name)).toBeEnabled();
        reorder(dragHandle(first.name), 'ArrowDown');
        expect(demoRows[section]).toEqual([second, first, third, last]);
        expect(within(nameRow(first.name)).getAllByRole('cell')[0]).toHaveTextContent(/^2$/);
        reorder(dragHandle(second.name), 'ArrowUp');
        expect(demoRows[section]).toEqual([second, first, third, last]);

        await user.type(screen.getByRole('textbox', { name: '名称' }), third.name);
        await user.click(screen.getByRole('button', { name: '查询' }));
        expect(tableRows()).toHaveLength(1);
        expect(dragHandle(third.name)).toBeEnabled();
        reorder(dragHandle(third.name), 'ArrowUp');
        const expected = [second, third, first, last];
        expect(demoRows[section]).toEqual(expected);
        await user.click(screen.getByRole('button', { name: '重置' }));
        for (const [index, row] of expected.entries()) {
            expect(tableRows()[index]).toBe(nameRow(row.name));
            expect(within(nameRow(row.name)).getAllByRole('cell')[0]).toHaveTextContent(new RegExp(`^${index + 1}$`));
        }

        const navigation = within(screen.getByRole('navigation', { name: '基准栏目' }));
        await user.click(navigation.getByRole('button', { name: '项目类型' }));
        await user.click(navigation.getByRole('button', { name: config.title }));
        expect(demoRows[section]).toEqual(expected);
        for (const [index, row] of expected.entries()) expect(tableRows()[index]).toBe(nameRow(row.name));
        expect(within(nameRow(third.name)).getAllByRole('cell')[2]).toHaveTextContent(String(third[config.columns[1][0]]));
    });
    it('遥感影像通过手柄排序后编辑其他字段不改变顺序，内部排序值保持连续', async () => {
        const user = userEvent.setup();
        render(<Harness section="imagery" />);
        reorder(dragHandle('中国地质分布图'), 'ArrowUp');
        await user.click(screen.getByRole('button', { name: '编辑中国地质分布图' }));
        const dialog = screen.getByRole('dialog');
        expect(within(dialog).queryByRole('spinbutton', { name: '显示顺序' })).not.toBeInTheDocument();
        await user.type(within(dialog).getByRole('textbox', { name: '图层名称' }), '拖动后的图层');
        await user.click(within(dialog).getByRole('button', { name: '保存' }));
        expect(tableRows()[0]).toHaveTextContent('中国地质分布图');
        expect(demoRows.imagery.map(row => row.sort)).toEqual([1, 2]);
        expect(demoRows.imagery[0].layer).toBe('拖动后的图层');
    });
    it.each(['structure', 'imagery', 'wells'])('%s 新增表单不再提供手填排序值', section => {
        const config = BASELINE_CONFIGS.find(candidate => candidate.id === section)!;
        render(<Harness section={section} />);
        fireEvent.click(screen.getAllByRole('button', { name: section === 'structure' ? '新增盆地' : `新增${config.title}` })[0]);
        const dialog = within(screen.getByRole('dialog'));
        expect(dialog.queryByLabelText(/排序值|显示顺序/)).not.toBeInTheDocument();
    });
    it('新增表单保留三级分类支持，上级下拉显示路径且不包含第三级', async () => {
        const user = userEvent.setup();
        render(<Harness section="types" />);
        expect(screen.queryByRole('button', { name: '新增三维陆上常规采集下级' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: '新增项目类型' }));
        let dialog = screen.getByRole('dialog');
        await user.selectOptions(within(dialog).getByRole('combobox', { name: '上级类型' }), '2');
        expect(within(dialog).getByRole('combobox', { name: '上级类型' })).toHaveValue('2');
        expect(within(dialog).getByRole('option', { name: '采集 / 三维陆上常规采集' })).toBeInTheDocument();
        await user.type(within(dialog).getByRole('textbox', { name: /名称/ }), '三级类型');
        await user.click(within(dialog).getByRole('button', { name: '保存' }));
        expect(screen.getByRole('button', { name: '三级类型' })).toBeInTheDocument();
        const record = demoRows.types.find(row => row.name === '三级类型')!;
        expect(record).toMatchObject({ parent: '2', level: 3 });
        expect(screen.queryByRole('button', { name: '新增三级类型下级' })).not.toBeInTheDocument();
        await user.click(screen.getByRole('button', { name: '编辑三级类型' }));
        dialog = screen.getByRole('dialog');
        expect(within(dialog).queryByRole('option', { name: /三级类型/ })).not.toBeInTheDocument();
    });
    it('父类型可带着下级改为二级，同时将原子类型更新为三级', async () => {
        const user = userEvent.setup();
        render(<Harness section="types" />);
        await user.click(screen.getByRole('button', { name: '编辑采集' }));
        const dialog = screen.getByRole('dialog');
        const parent = within(dialog).getByRole('combobox', { name: '上级类型' });
        expect(within(parent).queryByRole('option', { name: '采集' })).not.toBeInTheDocument();
        expect(within(parent).queryByRole('option', { name: '采集 / 三维陆上常规采集' })).not.toBeInTheDocument();
        await user.selectOptions(parent, '5');
        await user.click(within(dialog).getByRole('button', { name: '保存' }));
        expect(demoRows.types.find(row => row.id === '1')).toMatchObject({ parent: '5', level: 2 });
        expect(demoRows.types.find(row => row.id === '2')).toMatchObject({ parent: '1', level: 3 });
        expect(baselinePath(demoRows.types, '2')).toBe('处理 / 采集 / 三维陆上常规采集');
    });
    it('有三级子孙时更换父级不能生成第四级，父选项排除自己及子孙防环', async () => {
        const user = userEvent.setup();
        saveBaselineRows('types', [...demoRows.types, { id: 'third', name: '三级类型', parent: '2', level: 3, color: '#277DA8' }]);
        expect(projectTypeParentOptions(demoRows.types, '1').map(option => option.value)).not.toContain('1');
        expect(projectTypeParentOptions(demoRows.types, '1').map(option => option.value)).not.toContain('2');
        expect(projectTypeParentOptions(demoRows.types, '1').map(option => option.value)).not.toContain('third');
        expect(projectTypeParentError(demoRows.types, { ...demoRows.types[0], parent: '2' })).toBe('上级类型不能是自身或下级类型');
        render(<Harness section="types" />);
        await user.click(screen.getByRole('button', { name: '编辑采集' }));
        const dialog = screen.getByRole('dialog');
        await user.selectOptions(within(dialog).getByRole('combobox', { name: '上级类型' }), '5');
        await user.click(within(dialog).getByRole('button', { name: '保存' }));
        expect(within(dialog).getByRole('alert')).toHaveTextContent('项目类型最多支持三级');
        expect(demoRows.types.find(row => row.id === '1')?.level).toBe(1);
        expect(demoRows.types.find(row => row.id === 'third')?.level).toBe(3);
    });
    it('类型表单必填标记跟随名称，上级与名称为两列，颜色独占紧凑一行，输入焦点稳定', async () => {
        const user = userEvent.setup();
        render(<Harness section="types" />);
        await user.click(screen.getByRole('button', { name: '新增项目类型' }));
        const dialog = screen.getByRole('dialog');
        const parent = within(dialog).getByRole('combobox', { name: '上级类型' });
        const name = within(dialog).getByRole('textbox', { name: /名称/ });
        const form = dialog.querySelector('.baseline-type-form')!;
        expect(parent.closest('.field')).not.toHaveClass('full');
        expect(name.closest('.field')).not.toHaveClass('full');
        expect(name.closest('.field')?.querySelector('.field-label')).toHaveTextContent('名称 *');
        expect(within(dialog).getByLabelText('选择颜色').closest('.field')).toHaveClass('full');
        expect(form.children).toHaveLength(3);
        await user.type(name, '新的项目类型');
        expect(name).toHaveFocus();
        await user.click(within(dialog).getByRole('button', { name: '保存' }));
        expect(screen.getByRole('button', { name: '新的项目类型' })).toBeInTheDocument();
    });
});

describe('基准页面中英文切换', () => {
    it('切换语言保留弹窗草稿、原始业务名称和颜色值，返回中文可保存', async () => {
        sessionStorage.removeItem('geobank-demo-locale');
        const user = userEvent.setup();
        function Switcher() {
            const { toggleLocale } = useTranslation();
            return <><button onClick={toggleLocale}>Switch language</button><Harness section="types" /></>;
        }
        render(<LanguageProvider><Switcher /></LanguageProvider>);
        await user.click(screen.getByRole('button', { name: '编辑采集' }));
        let dialog = screen.getByRole('dialog');
        const name = within(dialog).getByRole('textbox', { name: /名称/ });
        await user.clear(name);
        await user.type(name, '客户中文分类草稿');
        await user.click(screen.getByRole('button', { name: 'Switch language' }));
        dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAccessibleName(/Edit Project Type/);
        expect(within(dialog).getByRole('textbox', { name: /Name/ })).toHaveValue('客户中文分类草稿');
        expect(within(dialog).getByRole('textbox', { name: 'Color Value' })).toHaveValue('#277DA8');
        expect(screen.getByRole('button', { name: '三维陆上常规采集' })).toBeInTheDocument();
        expect(within(dialog).getByRole('combobox', { name: 'Parent Type' })).toHaveValue('');
        await user.click(screen.getByRole('button', { name: 'Switch language' }));
        await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '保存' }));
        expect(screen.getByRole('button', { name: '客户中文分类草稿' })).toBeInTheDocument();
        sessionStorage.removeItem('geobank-demo-locale');
    });
    it('英文列头和按钮可用，同级移动与计数不改变中文记录和内部值', async () => {
        sessionStorage.setItem('geobank-demo-locale', 'en');
        const user = userEvent.setup();
        render(<LanguageProvider><Harness section="imagery" /></LanguageProvider>);
        expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
        expect(screen.getByText('2 records')).toBeInTheDocument();
        const handle = screen.getByRole('button', { name: 'Drag to reorder 中国地质分布图' });
        expect(handle).toHaveAttribute('title', 'Press and hold to reorder');
        reorder(handle, 'ArrowUp');
        expect(tableRows()[0]).toHaveTextContent('中国地质分布图');
        await user.click(screen.getByRole('button', { name: 'Edit 中国地质分布图' }));
        const dialog = screen.getByRole('dialog');
        await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Status' }), '启用');
        await user.click(within(dialog).getByRole('button', { name: 'Save' }));
        expect(demoRows.imagery[0]).toMatchObject({ name: '中国地质分布图', status: '启用', sort: 1 });
        expect(nameRow('中国地质分布图')).toHaveTextContent('Enabled');
        sessionStorage.removeItem('geobank-demo-locale');
    });
});
