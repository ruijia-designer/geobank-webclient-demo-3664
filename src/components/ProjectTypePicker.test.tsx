import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectTypePicker } from './ProjectTypePicker';
import type { ProjectTypeOption } from '../services/projectClassification';

const branches: [string, string[]][] = [
  ['采集', ['陆上采集', '过渡带采集', 'OBN采集', '拖缆采集']],
  ['处理', []], ['解释', []], ['井筒', []],
  ['非地震', ['重力勘探', '磁力勘探', '电法勘探', '化探', '综合物化探']],
];
const options: ProjectTypeOption[] = branches.flatMap(([name, names], index) => {
  const id = `root-${index}`;
  return [{ id, name, path: [name], color: '#277DA8', level: 1, leaf: !names.length },
    ...names.map((child, childIndex) => ({ id: `${id}-${childIndex}`, name: child, path: [name, child],
      parentId: id, color: '#4C92B5', level: 2, leaf: true }))];
});

function Harness({ initial = '', entries = options }: { initial?: string; entries?: ProjectTypeOption[] }) {
  const [value, setValue] = useState(initial);
  return <><ProjectTypePicker label="类型" options={entries} value={value} onChange={setValue}/>
    <output aria-label="已选类型ID">{value}</output></>;
}

describe('新建项目类型选择样式', () => {
  it('默认级联只显示一级，三个无子级分类可直接完成选择且重开不展开第二列', async () => {
    const user = userEvent.setup();
    render(<Harness/>);
    const trigger = screen.getByRole('button', { name: '类型' });
    expect(screen.getByRole('button', { name: '切换为分级单选' })).toBeVisible();
    await user.click(trigger);
    expect(screen.getAllByRole('option')).toHaveLength(5);
    expect(screen.queryByRole('option', { name: '采集 / 陆上采集' })).not.toBeInTheDocument();
    for (const name of ['处理', '解释', '井筒']) {
      await user.click(screen.getByRole('option', { name }));
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      expect(trigger).toHaveTextContent(name);
      expect(screen.getByLabelText('已选类型ID')).toHaveTextContent(options.find(option => option.name === name)!.id);
      await user.click(trigger);
      expect(screen.getAllByRole('option')).toHaveLength(5);
    }
  });

  it('两种有子级的一级只展开，九个二级均可选择，跨一级切换清空原值', async () => {
    const user = userEvent.setup();
    render(<Harness/>);
    const trigger = screen.getByRole('button', { name: '类型' });
    for (const [root, children] of branches.filter(([, children]) => children.length)) {
      await user.click(trigger);
      await user.click(screen.getByRole('option', { name: root }));
      expect(screen.getByLabelText('已选类型ID')).toBeEmptyDOMElement();
      expect(trigger).toHaveTextContent('请选择项目类型');
      for (const child of children) {
        await user.click(screen.getByRole('option', { name: `${root} / ${child}` }));
        expect(trigger).toHaveTextContent(`${root} / ${child}`);
        if (child !== children.at(-1)) await user.click(trigger);
      }
    }
  });

  it('分级单选点击选择框才展开，一级显示下级，末级选定后收起并保留选择', async () => {
    const user = userEvent.setup();
    render(<Harness/>);
    await user.click(screen.getByRole('button', { name: '切换为分级单选' }));
    const trigger = screen.getByRole('button', { name: '类型' });
    expect(trigger).toHaveTextContent('请选择项目类型');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: '项目类型选项' })).toBeVisible();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
    expect(screen.getByRole('group', { name: '一级分类' })).toBeVisible();
    expect(screen.queryByText('一级分类', { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox', { name: '搜索项目类型' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '二级分类' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '采集' }));
    expect(within(screen.getByRole('group', { name: '二级分类' })).getAllByRole('radio')).toHaveLength(4);
    expect(screen.queryByText('二级分类', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByLabelText('已选类型ID')).toBeEmptyDOMElement();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('radio', { name: 'OBN采集' }));
    expect(screen.getByLabelText('已选类型ID')).toHaveTextContent('root-0-2');
    expect(trigger).toHaveTextContent('采集 / OBN采集');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('group', { name: '项目类型选项' })).not.toBeInTheDocument();
    await user.click(trigger);
    expect(screen.getByRole('radio', { name: '采集' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'OBN采集' })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: '非地震' }));
    expect(screen.queryByRole('radio', { name: 'OBN采集' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('已选类型ID')).toBeEmptyDOMElement();
    await user.click(screen.getByRole('radio', { name: '化探' }));
    expect(screen.getByLabelText('已选类型ID')).toHaveTextContent('root-4-3');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    await user.click(screen.getByRole('radio', { name: '处理' }));
    expect(screen.getByLabelText('已选类型ID')).toHaveTextContent('root-1');
    expect(trigger).toHaveTextContent('处理');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('radio', { name: '非地震' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();
    expect(screen.queryByRole('group', { name: '项目类型选项' })).not.toBeInTheDocument();
    expect(screen.getByLabelText('已选类型ID')).toHaveTextContent('root-1');
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('radio', { name: '采集' })).toHaveFocus();
  });

  it('切换样式保留完整选择和未完成分支，新挂载恢复级联默认样式', async () => {
    const user = userEvent.setup();
    const view = render(<Harness initial="root-4-3"/>);
    const trigger = screen.getByRole('button', { name: '类型' });
    await user.click(screen.getByRole('button', { name: '切换为分级单选' }));
    expect(trigger).toHaveTextContent('非地震 / 化探');
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    await user.click(trigger);
    expect(screen.getByRole('radio', { name: '非地震' })).toBeChecked();
    expect(screen.getByRole('radio', { name: '化探' })).toBeChecked();
    await user.click(screen.getByRole('button', { name: '切换为级联选择' }));
    expect(trigger).toHaveTextContent('非地震 / 化探');
    await user.click(trigger);
    await user.click(screen.getByRole('option', { name: '采集' }));
    await user.click(screen.getByRole('button', { name: '切换为分级单选' }));
    await user.click(trigger);
    expect(screen.getByRole('radio', { name: '采集' })).toBeChecked();
    expect(within(screen.getByRole('group', { name: '二级分类' })).getAllByRole('radio').every(option => !(option as HTMLInputElement).checked)).toBe(true);
    expect(screen.getByLabelText('已选类型ID')).toBeEmptyDOMElement();
    await user.click(screen.getByRole('button', { name: '切换为级联选择' }));
    await user.click(screen.getByRole('button', { name: '类型' }));
    expect(screen.getByRole('option', { name: '采集' })).toHaveAttribute('aria-expanded', 'true');
    await user.click(screen.getByRole('button', { name: '切换为分级单选' }));
    view.unmount();
    render(<Harness/>);
    expect(screen.getByRole('button', { name: '切换为分级单选' })).toBeVisible();
  });

  it('级联不显示搜索栏，完整路径选择与 Escape 保留当前值', async () => {
    const user = userEvent.setup();
    render(<Harness/>);
    const trigger = screen.getByRole('button', { name: '类型' });
    await user.click(trigger);
    expect(screen.queryByRole('searchbox', { name: '搜索项目类型' })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('option', { name: '非地震' })).toHaveFocus();
    await user.click(screen.getByRole('option', { name: '非地震' }));
    await user.click(screen.getByRole('option', { name: '非地震 / 电法勘探' }));
    expect(trigger).toHaveTextContent('非地震 / 电法勘探');
    await user.click(trigger);
    expect(screen.getByRole('option', { name: '非地震 / 电法勘探' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(screen.getByLabelText('已选类型ID')).toHaveTextContent('root-4-2');
  });

  it('级联支持键盘逐层展开、回到父项及末级确认', async () => {
    const user = userEvent.setup();
    const entries = options.map(option => option.id === 'root-0-0' ? { ...option, leaf: false } : option);
    entries.push({ id: 'third', name: '子项', parentId: 'root-0-0', path: ['采集', '陆上采集', '子项'], level: 3, leaf: true, color: '#123456' });
    render(<Harness entries={entries}/>);
    const trigger = screen.getByRole('button', { name: '类型' });
    await user.click(trigger);
    await user.keyboard('{ArrowDown}{ArrowRight}');
    const second = screen.getByRole('option', { name: '采集 / 陆上采集' });
    expect(second).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('option', { name: '采集 / 陆上采集 / 子项' })).toHaveFocus();
    expect(screen.getByLabelText('已选类型ID')).toBeEmptyDOMElement();
    await user.keyboard('{ArrowLeft}');
    expect(second).toHaveFocus();
    await user.keyboard('{ArrowRight}{Enter}');
    expect(screen.getByLabelText('已选类型ID')).toHaveTextContent('third');
    expect(trigger).toHaveFocus();
  });
});
