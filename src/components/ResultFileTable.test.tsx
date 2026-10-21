import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ResultFile } from '../services/results';
import { ResultFileTable } from './ResultFileTable';

function Harness({ count = 121 }: { count?: number }) {
  const [files, setFiles] = useState<ResultFile[]>(() => Array.from({ length: count }, (_, index) => ({
    id: String(index + 1), name: `File-${index + 1}.las`, directory: '测井数据',
    format: 'las', size: '1 KB', uploaded: '2026-10-21', user: 'Demo',
  })));
  const [selected, setSelected] = useState<string[]>([]);
  return <><output aria-label="selected IDs">{selected.join(',')}</output><ResultFileTable files={files} selected={selected} onSelect={setSelected} onView={vi.fn()} onFields={vi.fn()} onUpload={vi.fn()} onDelete={file => setFiles(previous => previous.filter(row => row.id !== file.id))}/></>;
}

const rows = () => within(screen.getByRole('table', { name: '成果文件列表' })).getAllByRole('row').slice(1);

describe('成果文件分页', () => {
  it('默认50行，支持全部页大小、连续序号和最后一页，并在切换页大小时返回第一页', async () => {
    const user = userEvent.setup(); render(<Harness/>);
    const size = screen.getByRole('combobox', { name: '每页行数' });
    expect(size).toHaveValue('50'); expect(rows()).toHaveLength(50);
    expect(within(size).getAllByRole('option').map(option => (option as HTMLOptionElement).value)).toEqual(['20','30','50','100','200']);
    await user.click(screen.getByRole('button', { name: '下一页' }));
    expect(within(rows()[0]).getAllByRole('cell')[1]).toHaveTextContent('51');
    expect(screen.getByText('第 51–100 条，共 121 条')).toBeVisible();
    await user.click(screen.getByRole('button', { name: '下一页' }));
    expect(rows()).toHaveLength(21); expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled();
    for (const count of [20,30,50,100,200]) {
      await user.selectOptions(size, String(count));
      expect(rows()).toHaveLength(Math.min(count, 121));
      expect(within(rows()[0]).getAllByRole('cell')[1]).toHaveTextContent(/^1$/);
      expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled();
    }
  });

  it('全选仅勾选当前页，跨页保留已选文件，取消当前页不会清除其他页', async () => {
    const user = userEvent.setup(); render(<Harness/>);
    await user.click(screen.getByRole('checkbox', { name: '选择File-1.las' }));
    expect(screen.getByRole('checkbox', { name: '全选当前页文件' })).toBePartiallyChecked();
    await user.click(screen.getByRole('button', { name: '下一页' }));
    await user.click(screen.getByRole('checkbox', { name: '全选当前页文件' }));
    expect(screen.getByLabelText('selected IDs').textContent?.split(',')).toHaveLength(51);
    expect(screen.getByLabelText('selected IDs')).not.toHaveTextContent('101');
    await user.click(screen.getByRole('checkbox', { name: '全选当前页文件' }));
    expect(screen.getByLabelText('selected IDs')).toHaveTextContent(/^1$/);
    await user.click(screen.getByRole('button', { name: '上一页' }));
    expect(screen.getByRole('checkbox', { name: '选择File-1.las' })).toBeChecked();
  });

  it('删除末页唯一文件后回到前一页，空目录保持有效分页和上传入口', async () => {
    const user = userEvent.setup(); const { unmount } = render(<Harness count={51}/>);
    await user.click(screen.getByRole('button', { name: '下一页' }));
    await user.click(screen.getByRole('button', { name: '删除File-51.las' }));
    expect(rows()).toHaveLength(50); expect(screen.getByText('第 1 / 1 页')).toBeVisible();
    expect(screen.getByRole('button', { name: '下一页' })).toBeDisabled();
    unmount(); render(<Harness count={0}/>);
    expect(rows()).toHaveLength(0); expect(screen.getByText('第 0–0 条，共 0 条')).toBeVisible();
    expect(screen.getByRole('button', { name: '上传文件' })).toBeVisible();
    expect(screen.getByRole('checkbox', { name: '全选当前页文件' })).toBeDisabled();
  });
});
