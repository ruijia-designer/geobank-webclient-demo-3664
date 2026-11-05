import { useTranslation } from '../i18n';
import './TablePagination.css';

interface Props {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  label?: string;
}

export function TablePagination({ total, page, pageSize, onPageChange, onPageSizeChange, label = '分页' }: Props) {
  const { t } = useTranslation();
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.max(1, Math.min(page, pageCount));
  const offset = (currentPage - 1) * pageSize;
  return <nav className="table-pagination" aria-label={t(label)}>
    <span className="table-page-summary" aria-live="polite">{t('第 {start}–{end} 条，共 {total} 条', { start: total ? offset + 1 : 0, end: Math.min(offset + pageSize, total), total })}</span>
    <label><span className="sr-only">{t('每页行数')}</span><select value={pageSize} onChange={event => { onPageSizeChange(Number(event.target.value)); onPageChange(1); }}>
      {[20, 30, 50, 100, 200].map(count => <option key={count} value={count}>{t('{count} 条/页', { count })}</option>)}
    </select></label>
    <button type="button" className="button small" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}>{t('上一页')}</button>
    <span>{t('第 {page} / {pages} 页', { page: currentPage, pages: pageCount })}</span>
    <button type="button" className="button small" disabled={currentPage === pageCount} onClick={() => onPageChange(currentPage + 1)}>{t('下一页')}</button>
  </nav>;
}
