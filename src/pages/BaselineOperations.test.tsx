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

beforeEach(() => {
    vi.clearAllMocks();
    for (const config of BASELINE_CONFIGS) saveBaselineRows(config.id, config.rows);
});

describe('基准同级排序服务', () => {
    it('仅项目类型与指定的五个栏目支持移动，命名规则和其他栏目保持原顺序', () => {
        expect([...SORTABLE_BASELINE_IDS]).toEqual(['types', 'structure', 'areas', 'mining', 'imagery', 'wells']);
        const rows: BaselineRow[] = [{ id: 'a', name: '甲', sort: 8 }, { id: 'b', name: '乙', sort: 2 }];
        expect(moveBaselineRow('naming', rows, 'a', 1)).toBe(rows);
        expect(normalizeBaselineOrder('clients', rows)).toEqual(rows);
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
    it('移动更新现有排序值，手填排序值按同级位置插入，并保留模块缓存', () => {
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
    it('仅一级类型有新增按钮，二三级保持编辑、上下移和删除的列槽位', () => {
        saveBaselineRows('types', [...demoRows.types, { id: 'third', name: '三级类型', parent: '2', level: 3, color: '#277DA8' }]);
        render(<Harness section="types" />);
        const toggle = screen.getByRole('button', { name: '展开三维陆上常规采集' });
        fireEvent.click(toggle);
        const parentActions = nameRow('采集').querySelector('.baseline-row-actions') as HTMLElement;
        expect(within(parentActions).getAllByRole('button').map(button => button.title)).toEqual(['新增下级', '编辑', '上移', '下移', '删除']);
        const secondLevelActions = nameRow('三维陆上常规采集').querySelector('.baseline-row-actions') as HTMLElement;
        expect(within(secondLevelActions).getAllByRole('button').map(button => button.title)).toEqual(['编辑', '上移', '下移', '删除']);
        expect(within(secondLevelActions).getByTitle('编辑')).toHaveClass('action-edit');
        const childActions = nameRow('三级类型').querySelector('.baseline-row-actions') as HTMLElement;
        expect(within(childActions).getAllByRole('button').map(button => button.title)).toEqual(['编辑', '上移', '下移', '删除']);
        expect(within(childActions).getByTitle('编辑')).toHaveClass('action-edit');
        expect(within(childActions).getByTitle('删除')).toHaveClass('action-delete');
        expect(screen.getByRole('columnheader', { name: '操作' })).toHaveClass('baseline-actions-heading');
        expect(screen.queryByRole('button', { name: /^查看/ })).not.toBeInTheDocument();
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
        expect(within(row.querySelector('.row-actions') as HTMLElement).getAllByRole('button').map(button => button.title)).toEqual(['编辑', '扫描', '删除']);
        await user.click(screen.getByRole('button', { name: '57服务器-华北-解释项目' }));
        expect(screen.getByRole('dialog', { name: '查看磁盘挂载' })).toBeInTheDocument();
        expect(within(screen.getByRole('dialog')).getByText('/home/seismic-bank/mnt/diyan_huabei')).toBeInTheDocument();
    });
    it.each(['structure', 'areas', 'mining', 'imagery'])('%s 首尾移动边界按完整列表判断', section => {
        render(<Harness section={section} />);
        const config = BASELINE_CONFIGS.find(candidate => candidate.id === section)!;
        const roots = demoRows[section].filter(row => !config.tree || !row.parent);
        expect(screen.getByRole('button', { name: '上移' + roots[0].name })).toBeDisabled();
        expect(screen.getByRole('button', { name: '下移' + roots.at(-1)!.name })).toBeDisabled();
    });
    it('筛选单条工区仍按真实相邻记录移动，清空后显示新的实际序号', async () => {
        const user = userEvent.setup();
        render(<Harness section="areas" />);
        await user.type(screen.getByRole('textbox', { name: '名称' }), '大安区块');
        await user.click(screen.getByRole('button', { name: '查询' }));
        expect(tableRows()).toHaveLength(1);
        const up = screen.getByRole('button', { name: '上移大安区块' });
        expect(up).toBeEnabled();
        expect(screen.getByRole('button', { name: '下移大安区块' })).toBeEnabled();
        await user.click(up);
        expect(demoRows.areas.map(row => row.name).slice(2, 5)).toEqual(['东台坳陷白驹凹陷大丰次凹海丰构造', '大安区块', '大丰次凹']);
        await user.click(screen.getByRole('button', { name: '重置' }));
        const row = nameRow('大安区块');
        expect(within(row).getAllByRole('cell')[0]).toHaveTextContent('4');
    });
    it('井别移动后排序值和序号同步，并在重新进入栏目时保留', async () => {
        const user = userEvent.setup();
        saveBaselineRows('wells', [{ id: 'a', name: '探井' }, { id: 'b', name: '评价井' }, { id: 'c', name: '开发井' }]);
        render(<Harness section="wells" />);
        await user.click(screen.getByRole('button', { name: '上移评价井' }));
        const row = nameRow('评价井');
        expect(within(row).getAllByRole('cell')[0]).toHaveTextContent('1');
        expect(within(row).getAllByRole('cell')[3]).toHaveTextContent('1');
        await user.click(screen.getByRole('navigation', { name: '基准栏目' }).querySelector('button')!);
        await user.click(within(screen.getByRole('navigation', { name: '基准栏目' })).getByRole('button', { name: '井别' }));
        expect(tableRows()[0]).toHaveTextContent('评价井');
    });
    it('修改遥感影像显示顺序会调整同级行位置并回写连续排序值', async () => {
        const user = userEvent.setup();
        render(<Harness section="imagery" />);
        await user.click(screen.getByRole('button', { name: '编辑中国地质分布图' }));
        const dialog = screen.getByRole('dialog');
        const sort = within(dialog).getByRole('spinbutton', { name: '显示顺序' });
        await user.clear(sort);
        await user.type(sort, '1');
        await user.click(within(dialog).getByRole('button', { name: '保存' }));
        expect(tableRows()[0]).toHaveTextContent('中国地质分布图');
        expect(demoRows.imagery.map(row => row.sort)).toEqual([1, 2]);
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
        await user.click(screen.getByRole('button', { name: 'Move Up 中国地质分布图' }));
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
