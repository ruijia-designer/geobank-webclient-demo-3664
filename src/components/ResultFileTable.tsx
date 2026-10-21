import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { Eye, FileText, FolderOpen, ListPlus, Trash2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import type { ResultFile } from '../services/results';

interface Props {
  files: ResultFile[];
  selected: string[];
  onSelect: Dispatch<SetStateAction<string[]>>;
  onView: (file: ResultFile) => void;
  onFields: (file: ResultFile) => void;
  onDelete: (file: ResultFile) => void;
  onUpload: () => void;
}

export function ResultFileTable({ files, selected, onSelect, onView, onFields, onDelete, onUpload }: Props) {
  const { t } = useTranslation();
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(files.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const offset = (currentPage - 1) * pageSize;
  const pageFiles = files.slice(offset, offset + pageSize);
  const allSelected = pageFiles.length > 0 && pageFiles.every(file => selected.includes(file.id));
  const someSelected = pageFiles.some(file => selected.includes(file.id));
  const selectAllRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Deleting the last page returns to the last remaining page, including an empty list.
  useEffect(() => { setPage(current => Math.min(current, pageCount)); }, [pageCount]);
  useLayoutEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected && !allSelected;
  }, [someSelected, allSelected]);
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [currentPage, pageSize]);

  const selectPage = (checked: boolean) => {
    const ids = pageFiles.map(file => file.id);
    onSelect(previous => checked ? [...new Set([...previous, ...ids])] : previous.filter(id => !ids.includes(id)));
  };

  return <div className="result-file-list">
    <div className="table-wrap" ref={scrollRef}>
      <table className="result-files-table" aria-label={t('成果文件列表')}>
        <thead><tr>
          <th><input ref={selectAllRef} type="checkbox" aria-label={t('全选当前页文件')} checked={allSelected} disabled={!pageFiles.length} onChange={event => selectPage(event.target.checked)}/></th>
          {['序号', '文件名', '格式', '大小', '上传时间', '上传人', '状态', '操作'].map(label => <th key={label}>{t(label)}</th>)}
        </tr></thead>
        <tbody>{pageFiles.map((file, index) => <tr key={file.id}>
          <td><input type="checkbox" aria-label={t('选择{file}', { file: file.name })} checked={selected.includes(file.id)} onChange={event => onSelect(previous => event.target.checked ? [...new Set([...previous, file.id])] : previous.filter(id => id !== file.id))}/></td>
          <td>{offset + index + 1}</td>
          <td><button className="file-name" onClick={() => onView(file)}><FileText size={19}/>{file.name}</button></td>
          <td>{file.format}</td><td>{file.size}</td><td>{file.uploaded}</td><td>{file.user}</td>
          <td><span className="badge success">{t('• 上传完成')}</span></td>
          <td><div className="row-actions">
            <button className="icon-button" title={t('查看')} aria-label={t('查看{file}', { file: file.name })} onClick={() => onView(file)}><Eye size={18}/></button>
            <button className="icon-button" title={t('扩展字段')} aria-label={t('扩展字段{file}', { file: file.name })} onClick={() => onFields(file)}><ListPlus size={18}/></button>
            <button className="icon-button danger" title={t('删除')} aria-label={t('删除{file}', { file: file.name })} onClick={() => onDelete(file)}><Trash2 size={18}/></button>
          </div></td>
        </tr>)}</tbody>
      </table>
      {!files.length && <div className="empty-state"><FolderOpen size={44}/><h3>{t('暂无文件')}</h3><p>{t('上传后可在当前成果目录查看')}</p><button className="button primary" onClick={onUpload}>{t('上传文件')}</button></div>}
    </div>
    <nav className="result-file-pagination" aria-label={t('文件分页')}>
      <span className="file-page-summary" aria-live="polite">{t('第 {start}–{end} 条，共 {total} 条', { start: files.length ? offset + 1 : 0, end: Math.min(offset + pageSize, files.length), total: files.length })}</span>
      <label><span className="sr-only">{t('每页行数')}</span><select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}>
        {[20, 30, 50, 100, 200].map(count => <option key={count} value={count}>{t('{count} 条/页', { count })}</option>)}
      </select></label>
      <button className="button small" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>{t('上一页')}</button>
      <span>{t('第 {page} / {pages} 页', { page: currentPage, pages: pageCount })}</span>
      <button className="button small" disabled={currentPage === pageCount} onClick={() => setPage(currentPage + 1)}>{t('下一页')}</button>
    </nav>
  </div>;
}
