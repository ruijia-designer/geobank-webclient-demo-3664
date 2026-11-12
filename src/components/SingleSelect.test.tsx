import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';
import { SingleSelect } from './SingleSelect';

function DiskForm({ onChange, onClose }: { onChange: (value: string) => void; onClose: () => void }) {
  const [server, setServer] = useState('a');
  return <Modal title="编辑磁盘挂载" onClose={onClose}>
    <label>所属服务器
      <SingleSelect value={server} onChange={event => {
        setServer(event.currentTarget.value);
        onChange(event.currentTarget.value);
      }}>
        <option value="a">服务器 A</option>
        <option value="b" disabled>服务器 B</option>
        <option value="c">服务器 C</option>
      </SingleSelect>
    </label>
  </Modal>;
}

describe('单选下拉', () => {
  it('在弹窗中点击网页选项后只提交一次对应值', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DiskForm onChange={onChange} onClose={vi.fn()}/>);
    const field = screen.getByRole('combobox', { name: /所属服务器/ });
    await user.click(field);
    const menu = screen.getByRole('listbox');
    await user.click(within(menu).getByRole('option', { name: '服务器 C' }));
    expect(field).toHaveValue('c');
    expect(onChange.mock.calls).toEqual([['c']]);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('Esc 放弃当前高亮项后仍可继续编辑；键盘可确认其他可用选项', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn(), onClose = vi.fn();
    render(<DiskForm onChange={onChange} onClose={onClose}/>);
    const field = screen.getByRole('combobox', { name: /所属服务器/ });
    await user.click(field);
    await user.keyboard('{End}{Escape}');
    expect(field).toHaveValue('a');
    expect(field).toHaveFocus();
    expect(onChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    await user.click(field);
    await user.keyboard('{ArrowDown}{Enter}');
    expect(field).toHaveValue('c');
    expect(onChange.mock.calls).toEqual([['c']]);
  });
});
