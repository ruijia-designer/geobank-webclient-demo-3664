import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BaselinePage from './BaselinePage';
import { BaselineMultiSelect } from '../components/BaselineFormControls';
import { LanguageProvider, useTranslation } from '../i18n';
import { BASELINE_CONFIGS, demoRows, saveBaselineRows } from '../services/baseline';
import { initialState } from '../services/demo';
import type { AppApi, AppState } from '../types';

function Harness({ section }: { section: string }) {
    const [state, setState] = useState<AppState>(() => ({ ...initialState('admin'), route: { page: 'baseline', section } }));
    const { toggleLocale } = useTranslation();
    const api: AppApi = { state, setState, navigate: route => setState(previous => ({ ...previous, route })), notify: vi.fn(), deny: vi.fn(), openProject: vi.fn() };
    return <><button type="button" onClick={toggleLocale}>切换语言</button><BaselinePage api={api}/></>;
}

beforeEach(() => {
    sessionStorage.removeItem('geobank-demo-locale');
    for (const config of BASELINE_CONFIGS) saveBaselineRows(config.id, config.rows);
});

describe('基准表单多选和文件控件', () => {
    it('工区兼容旧的多值字符串，选择后保存完整值，列表与详情逐项翻译', async () => {
        const user = userEvent.setup();
        render(<LanguageProvider><Harness section="areas"/></LanguageProvider>);
        await user.click(screen.getByRole('button', { name: '编辑大丰次凹' }));
        const modal = screen.getByRole('dialog');
        await user.click(within(modal).getByRole('combobox', { name: '地表类型' }));
        const popup = within(modal).getByRole('dialog', { name: '地表类型' });
        for (const name of ['草原', '水域', '河流']) expect(within(popup).getByRole('checkbox', { name })).toBeChecked();
        await user.click(within(popup).getByRole('checkbox', { name: '水域' }));
        await user.click(within(popup).getByRole('checkbox', { name: '山地' }));
        await user.click(within(popup).getByRole('button', { name: '关闭' }));
        await user.click(within(modal).getByRole('button', { name: '保存' }));
        expect(demoRows.areas.find(row => row.name === '大丰次凹')?.surface).toBe('草原, 河流, 山地');
        const row = screen.getByRole('button', { name: '大丰次凹' }).closest('tr')!;
        expect(within(row).getByText('草原、河流、山地')).toBeVisible();
        await user.click(screen.getByRole('button', { name: '切换语言' }));
        expect(within(row).getByText('Grassland, River, Mountain')).toBeVisible();
        await user.click(screen.getByRole('button', { name: '大丰次凹' }));
        expect(within(screen.getByRole('dialog')).getByText('Grassland, River, Mountain')).toBeVisible();
    });

    it('多选支持键盘切换、Escape只收起下拉、清空和外部点击关闭', async () => {
        const user = userEvent.setup();
        render(<LanguageProvider><Harness section="areas"/></LanguageProvider>);
        await user.click(screen.getByRole('button', { name: '新增工区' }));
        const modal = screen.getByRole('dialog');
        const trigger = within(modal).getByRole('combobox', { name: '地表类型' });
        trigger.focus();
        await user.keyboard('{ArrowDown}');
        const popup = within(modal).getByRole('dialog', { name: '地表类型' });
        expect(within(popup).getByRole('checkbox', { name: '草原' })).toHaveFocus();
        await user.keyboard('[Space]{ArrowDown}[Space]');
        expect(within(popup).getByRole('checkbox', { name: '草原' })).toBeChecked();
        expect(within(popup).getByRole('checkbox', { name: '水域' })).toBeChecked();
        await user.keyboard('{Escape}');
        expect(screen.getAllByRole('dialog')).toHaveLength(1);
        expect(trigger).toHaveFocus();
        expect(trigger).toHaveTextContent('草原、水域');
        await user.click(trigger);
        await user.click(within(modal).getByRole('button', { name: '清空' }));
        expect(within(modal).getAllByRole('checkbox').every(checkbox => !(checkbox as HTMLInputElement).checked)).toBe(true);
        await user.click(within(modal).getByRole('textbox', { name: '名称' }));
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(trigger).toHaveTextContent('请选择');
        expect(modal).toBeVisible();
    });

    it('多选保留旧的未知值，Tab离开关闭且可以统一清空', async () => {
        const user = userEvent.setup();
        function LegacyMultiSelect() {
            const [value, setValue] = useState(' 草原，河流、草原, 沼泽 ');
            return <><BaselineMultiSelect id="legacy-surface" label="地表类型" value={value}
                options={[{ value: '草原', label: '草原' }, { value: '河流', label: '河流' }, { value: '山地', label: '山地' }]}
                onChange={setValue}/><button type="button">下个字段</button><output>{value}</output></>;
        }
        render(<LegacyMultiSelect/>);
        const trigger = screen.getByRole('combobox', { name: '地表类型' });
        await user.click(trigger);
        expect(screen.getByRole('checkbox', { name: '沼泽' })).toBeChecked();
        await user.click(screen.getByRole('checkbox', { name: '山地' }));
        expect(screen.getByRole('status')).toHaveTextContent('草原, 河流, 山地, 沼泽');
        screen.getByRole('button', { name: '关闭' }).focus();
        await user.tab();
        expect(screen.getByRole('button', { name: '下个字段' })).toHaveFocus();
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await user.click(trigger);
        await user.click(screen.getByRole('button', { name: '清空' }));
        expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });

    it('工区上传显示完整文件名的提示并保存，取消文件选择不会清除已有文件', async () => {
        const user = userEvent.setup();
        render(<LanguageProvider><Harness section="areas"/></LanguageProvider>);
        await user.click(screen.getByRole('button', { name: '编辑大丰次凹' }));
        const modal = screen.getByRole('dialog');
        const input = within(modal).getByLabelText('范围（GeoJSON）') as HTMLInputElement;
        expect(input).toHaveAttribute('accept', '.json,.geojson,.grd,.txt');
        expect(input.id).not.toBe('');
        expect(within(modal).getByRole('button', { name: '选择文件' })).toBeEnabled();
        const fileName = '工区范围-较长文件名称用于检查上传后的文件名显示.geojson';
        await user.upload(input, new File(['{}'], fileName, { type: 'application/geo+json' }));
        expect(within(modal).getByText(fileName)).toHaveAttribute('title', fileName);
        fireEvent.change(input, { target: { files: [] } });
        expect(within(modal).getByText(fileName)).toBeVisible();
        await user.click(within(modal).getByRole('button', { name: '保存' }));
        expect(demoRows.areas.find(row => row.name === '大丰次凹')?.range).toBe(fileName);
        await user.click(screen.getByRole('button', { name: '编辑大丰次凹' }));
        expect(within(screen.getByRole('dialog')).getByText(fileName)).toBeVisible();
    });

    it('矿权范围逐行使用独立文件控件，保留accept与文件名存储', async () => {
        const user = userEvent.setup();
        render(<LanguageProvider><Harness section="mining"/></LanguageProvider>);
        await user.click(screen.getByRole('button', { name: '编辑白驹油田开采' }));
        const modal = screen.getByRole('dialog');
        await user.click(within(modal).getByRole('button', { name: '添加行' }));
        const inputs = within(modal).getAllByLabelText('范围（GeoJSON）') as HTMLInputElement[];
        expect(inputs).toHaveLength(2);
        expect(new Set(inputs.map(input => input.id)).size).toBe(2);
        for (const input of inputs) expect(input).toHaveAttribute('accept', '.json,.geojson');
        await user.upload(inputs[0], new File(['{}'], '矿权范围一.json', { type: 'application/json' }));
        await user.upload(inputs[1], new File(['{}'], '矿权范围二.geojson', { type: 'application/geo+json' }));
        expect(within(modal).getByText('矿权范围一.json')).toBeVisible();
        expect(within(modal).getByText('矿权范围二.geojson')).toBeVisible();
        await user.click(within(modal).getByRole('button', { name: '保存' }));
        expect(demoRows.mining[0]).toMatchObject({ rangeFile0: '矿权范围一.json', rangeFile1: '矿权范围二.geojson' });
    });
});
