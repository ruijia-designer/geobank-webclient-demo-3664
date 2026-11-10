import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Folder, FolderUp, Link2, Search } from 'lucide-react';
import type { Project, Role } from '../types';
import { useTranslation } from '../i18n';
import { canRead, visibleProjects } from '../services/demo';
import { projectCardClassification } from '../services/projectClassification';
import { projectBriefSummary } from '../services/projectBriefSummary';
import { Modal } from './Modal';
import { RelatedProjectTypeFilter } from './RelatedProjectTypeFilter';
import { getRelatedProjectIds, saveRelatedProjectIds } from '../services/relatedProjects';
import './RelatedProjects.css';

type RelatedProjectsProps = {
  project: Project;
  projects: Project[];
  role: Role;
  onOpen: (project: Project) => void;
  onNotify: (message: string) => void;
};
const RELATED_CATEGORIES = ['采集', '处理', '解释', '井筒', '非地震'];

export function RelatedProjects(props: RelatedProjectsProps) {
  // A project/role change discards the previous project's unsaved selection.
  return <RelatedProjectsContent key={props.project.id + ':' + props.role} {...props}/>;
}

function RelatedProjectsContent({ project, projects, role, onOpen, onNotify }: RelatedProjectsProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const [, refresh] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [selection, setSelection] = useState<string[]>([]);
  const [initialSelection, setInitialSelection] = useState<string[]>([]);
  const [error, setError] = useState('');
  const available = new Map(visibleProjects(projects, role)
    .filter(item => item.id !== project.id).map(item => [item.id, item]));
  const ids = getRelatedProjectIds(project, projects, role);
  const linked = new Set(ids);
  const related = ids.map(id => available.get(id)).filter((item): item is Project => !!item);
  const categories = [...new Set([...RELATED_CATEGORIES, ...[...available.values()].map(item => projectCardClassification(item).label)])];
  const term = query.trim().toLocaleLowerCase();
  const matches = [...available.values()].filter(item =>
    (!category || projectCardClassification(item).label === category)
    && (!term || item.name.toLocaleLowerCase().includes(term)));
  const selected = selection.filter(id => available.has(id));
  const changed = selected.length !== initialSelection.length || selected.some(id => !initialSelection.includes(id));
  const openEditor = () => {
    const initial = related.map(item => item.id);
    setEditorOpen(true);
    setSelection(initial);
    setInitialSelection(initial);
    setQuery('');
    setCategory('');
    setError('');
  };
  const closeEditor = () => { setEditorOpen(false); setSelection([]); setError(''); };
  const save = () => {
    if (!editorOpen || !changed) return;
    try {
      saveRelatedProjectIds(project, projects, role, 'edit', selected);
    } catch {
      setError('关联保存失败，请重试');
      return;
    }
    refresh(value => value + 1);
    closeEditor();
    onNotify(t('关联关系已保存'));
  };

  return <section className="results-related related-projects" aria-labelledby={headingId}>
    <header className="related-projects-heading">
      <div><h1 id={headingId}>{t('关联项目')}</h1>
        {related.length > 0 && <span className="related-projects-count">{t('{count} 个项目', { count: related.length })}</span>}
      </div>
      <div className="related-projects-actions">
        <button type="button" className="button related-projects-manage" onClick={openEditor}
          aria-haspopup="dialog">
          {/* Match the upload button's intrinsic width in every language. */}
          <span className="related-projects-manage-sizer" aria-hidden="true"><FolderUp size={18}/>{t('一键上传')}</span>
          <span className="related-projects-manage-label"><Link2 size={18} aria-hidden="true"/>{t('管理关联')}</span>
        </button>
      </div>
    </header>
    {related.length ? <ul className="related-projects-list">{related.map(item => {
      const classification = projectCardClassification(item);
      const summary = projectBriefSummary(item, t);
      const readable = canRead(item, role);
      const compactAction = readable && summary.parameters.length === 5;
      const openAction = readable && <button type="button" className="related-project-open"
        aria-label={t('查阅项目成果：{name}', { name: item.name })} onClick={() => onOpen(item)}>
        {t('查阅成果')}<ArrowUpRight size={16} aria-hidden="true"/>
      </button>;
      return <li key={item.id} className="related-project-card">
        <div className="related-project-card-labels">
          <span className="related-project-category" style={{ backgroundColor: classification.primaryColor, color: classification.textColor }}>{t(classification.label)}</span>
          <h2 title={item.name}>{item.name}</h2>
          <span className={'badge related-project-access' + (readable ? ' is-readable' : '')}>
            {t(readable ? '可查阅' : '无权限')}
          </span>
        </div>
        <div className="related-project-card-details">
          <div className="related-project-summary">
            <dl className="related-project-facts">
              {summary.overview.map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>)}
            </dl>
            {summary.parameterTitle && <div className="related-project-parameters">
              <h3>{t(summary.parameterTitle)}</h3>
              <dl className="related-project-facts">
                {summary.parameters.slice(0, compactAction ? -1 : undefined).map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>)}
              </dl>
              {compactAction && <div className="related-project-parameter-tail">
                <dl className="related-project-facts">
                  {summary.parameters.slice(-1).map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>)}
                </dl>
                {openAction}
              </div>}
            </div>}
          </div>
          {!compactAction && openAction}
        </div>
      </li>;
    })}</ul> : <div className="empty-state related-projects-empty"><Folder size={42} aria-hidden="true"/><h3>{t('暂无关联项目')}</h3></div>}
    {editorOpen && createPortal(<Modal title="管理关联" onClose={closeEditor}
      wide className="related-projects-dialog" footer={<>
        <div className="related-projects-selection">
          <span aria-live="polite">{t('已选 {count} 个项目', { count: selected.length })}</span>
          <button type="button" className="related-projects-text-button" disabled={!selected.length}
            onClick={() => { setSelection([]); setError(''); }}>{t('清空选择')}</button>
        </div>
        <button type="button" className="button" onClick={closeEditor}>{t('取消')}</button>
        <button type="button" className="button primary" disabled={!changed}
          onClick={save}>{t('保存')}</button>
      </>}>
      <div className="related-projects-toolbar">
        <RelatedProjectTypeFilter categories={categories} value={category} onChange={setCategory}/>
        <label className="related-projects-filter"><span>{t('项目名称')}</span>
          <div className="related-projects-search"><Search size={17} aria-hidden="true"/>
            <input type="search" className="control" aria-label={t('搜索项目名称')} placeholder={t('搜索项目名称…')}
              value={query} onChange={event => setQuery(event.target.value)}/>
          </div>
        </label>
      </div>
      <div className="related-projects-candidates table-wrap">
        <table aria-label={t('关联项目候选列表')}>
          <thead><tr><th scope="col"><span className="sr-only">{t('选择项目')}</span></th>
            {['项目名称', '项目类型', '年度', '地区'].map(label => <th key={label} scope="col">{t(label)}</th>)}
          </tr></thead>
          <tbody>{matches.map((item, index) => {
            const existing = linked.has(item.id);
            const checked = selected.includes(item.id);
            const checkboxId = headingId + '-candidate-' + index;
            return <tr key={item.id} className={checked ? 'is-selected' : ''}>
              <td><input id={checkboxId} type="checkbox" aria-label={t('选择项目：{name}', { name: item.name })}
                checked={checked} onChange={event => {
                  setSelection(previous => event.target.checked ? [...new Set([...previous, item.id])] : previous.filter(id => id !== item.id));
                  setError('');
                }}/></td>
              <td><label className="related-projects-candidate-name" htmlFor={checkboxId} title={item.name}>{item.name}</label>
                {existing && <span className="related-projects-linked">{t('已关联')}</span>}
              </td>
              <td>{item.type || '—'}</td><td>{item.year || '—'}</td><td>{item.basin || '—'}</td>
            </tr>;
          })}</tbody>
        </table>
        {!matches.length && <div className="related-projects-no-matches">
          <Search size={30} aria-hidden="true"/><p>{t('未找到匹配项目')}</p>
          {(query || category) && <button type="button" className="related-projects-text-button"
            onClick={() => { setQuery(''); setCategory(''); }}>{t('清空筛选')}</button>}
        </div>}
      </div>
      {error && <p className="related-projects-error" role="alert">{t(error)}</p>}
    </Modal>, document.body)}
  </section>;
}
