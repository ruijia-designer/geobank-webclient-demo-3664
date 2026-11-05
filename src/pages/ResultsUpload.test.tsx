import { useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResultsPage from './ResultsPage';
import { initialState } from '../services/demo';
import { RESULT_DIRECTORIES, resultFilesCache } from '../services/results';
import { matchUploadDirectory } from '../services/projectUpload';
import type { AppState } from '../types';

function Harness() {
  const [state,setState] = useState<AppState>(() => ({...initialState('admin'),route:{page:'results',section:'wells'}}));
  return <ResultsPage api={{state,setState,navigate:vi.fn(),notify:vi.fn(),deny:vi.fn(),openProject:vi.fn()}}/>;
}
function fileAt(path: string) {
  const file = new File(['sample'], path.split('/').at(-1)!, {type:'text/plain'});
  Object.defineProperty(file,'webkitRelativePath',{value:path});
  return file;
}
beforeEach(() => {
  delete resultFilesCache.current;
  localStorage.clear();
});
describe('项目文件夹与分类上传', () => {
  it('按深层目录、中文名和配置英文目录归类，不凭文件名或不相关目录猜测', () => {
    expect(matchUploadDirectory('项目/井筒数据/02_测井数据/井A/a.las',RESULT_DIRECTORIES)).toBe('测井数据');
    expect(matchUploadDirectory('项目/WELL_LOG/井B/b.las',RESULT_DIRECTORIES)).toBe('测井数据');
    expect(matchUploadDirectory('项目/地层厚度图/底图/a.GDB',RESULT_DIRECTORIES)).toBe('地层厚度图');
    expect(matchUploadDirectory('项目/测井数据.txt',RESULT_DIRECTORIES)).toBe('');
    expect(matchUploadDirectory('项目/未分类/a.las',RESULT_DIRECTORIES)).toBe('');
  });
  it('分类上传接受多个文件，文件标识唯一且全部加入当前成果目录', async () => {
    const user=userEvent.setup();render(<Harness/>);
    await user.click(screen.getByRole('button',{name:'上传成果'}));
    await user.click(screen.getByRole('button',{name:'本地上传'}));
    const dialog=within(screen.getByRole('dialog'));
    await user.upload(dialog.getByLabelText('选择本地文件'),[fileAt('a.las'),fileAt('b.las')]);
    expect(dialog.getByText('a.las')).toBeVisible();expect(dialog.getByText('b.las')).toBeVisible();
    await user.click(dialog.getByRole('button',{name:'上传'}));
    const uploaded=resultFilesCache.current.filter(file=>['a.las','b.las'].includes(file.name));
    expect(uploaded).toHaveLength(2);expect(new Set(uploaded.map(file=>file.id)).size).toBe(2);
    expect(uploaded.every(file=>file.directory==='测井数据')).toBe(true);
  });
  it('一键上传递归文件夹并分配不同成果目录，未匹配项可指定目录后整体上传', async () => {
    const user=userEvent.setup();render(<Harness/>);
    await user.click(screen.getByRole('button',{name:'一键上传'}));
    const dialog=within(screen.getByRole('dialog'));
    expect(dialog.getByRole('button',{name:'上传全部成果'})).toBeDisabled();
    const picker=dialog.getByLabelText('选择项目成果文件夹');
    expect(picker).toHaveAttribute('webkitdirectory');
    await user.upload(picker,[fileAt('项目/WELL_LOG/a.las'),fileAt('项目/地层厚度图/子目录/b.GDB'),fileAt('项目/其他/readme.txt')]);
    expect(dialog.getByRole('alert')).toHaveTextContent('1 个文件未匹配');
    expect(dialog.getByRole('button',{name:'上传全部成果'})).toBeDisabled();
    await user.selectOptions(dialog.getByLabelText('项目/其他/readme.txt的成果目录'),'项目成果文档');
    await user.click(dialog.getByRole('button',{name:'上传全部成果'}));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const uploaded=resultFilesCache.current.slice(-3);
    expect(uploaded.map(file=>[file.name,file.directory])).toEqual([['a.las','测井数据'],['b.GDB','地层厚度图'],['readme.txt','项目成果文档']]);
    expect(new Set(uploaded.map(file=>file.id)).size).toBe(3);
  });
});
