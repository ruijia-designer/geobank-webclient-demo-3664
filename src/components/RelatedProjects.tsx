import { useId } from 'react';
import { ArrowUpRight, Folder } from 'lucide-react';
import type { Project, Role } from '../types';
import { useTranslation } from '../i18n';
import { canRead, visibleProjects } from '../services/demo';
import { projectCardClassification } from '../services/projectClassification';
import './RelatedProjects.css';

const DEMO_RELATED_IDS = ['1', '4', '2'];

export function RelatedProjects({ project, projects, role, onOpen }: {
  project: Project;
  projects: Project[];
  role: Role;
  onOpen: (project: Project) => void;
}) {
  const { t } = useTranslation();
  const headingId = useId();
  const explicitIds = project.mapDetails?.relatedProjectIds || [];
  const demonstration = project.id === 'current' && explicitIds.length === 0;
  const available = new Map(visibleProjects(projects, role)
    .filter(item => item.id !== project.id).map(item => [item.id, item]));
  // These references belong only to this presentation; never create stored relationships.
  const ids = demonstration
    ? [...new Set([...DEMO_RELATED_IDS, ...available.keys()])].filter(id => available.has(id)).slice(0, 3)
    : [...new Set(explicitIds)];
  const related = ids.map(id => available.get(id)).filter((item): item is Project => !!item);

  return <section className="results-related related-projects" aria-labelledby={headingId}>
    <header className="related-projects-heading">
      <div><h1 id={headingId}>{t('关联项目')}</h1>
        {related.length > 0 && <span className="related-projects-count">{t('{count} 个项目', { count: related.length })}</span>}
      </div>
      {demonstration && related.length > 0 && <span className="related-projects-demo">{t('演示关联')}</span>}
    </header>
    {related.length ? <ul className="related-projects-list">{related.map(item => {
      const classification = projectCardClassification(item);
      const readable = canRead(item, role);
      return <li key={item.id} className="related-project-card">
        <div className="related-project-card-labels">
          <span className="related-project-category" style={{ backgroundColor: classification.primaryColor, color: classification.textColor }}>{t(classification.label)}</span>
          <span className={'badge related-project-access' + (readable ? ' is-readable' : '')}>
            {t(readable ? '可查阅' : '无权限')}
          </span>
        </div>
        <h2>{item.name}</h2>
        <dl className="related-project-facts">
          <div><dt>{t('年度')}</dt><dd>{item.year || '—'}</dd></div>
          <div><dt>{t('所属盆地')}</dt><dd>{item.basin || '—'}</dd></div>
          <div><dt>{t('工区面积（km²）')}</dt><dd>{item.area || '—'}</dd></div>
        </dl>
        <footer><button type="button" className="related-project-open"
          aria-label={t('查看项目成果：{name}', { name: item.name })} onClick={() => onOpen(item)}>
          {t('查看成果')}<ArrowUpRight size={16} aria-hidden="true"/>
        </button></footer>
      </li>;
    })}</ul> : <div className="empty-state related-projects-empty"><Folder size={42} aria-hidden="true"/><h3>{t('暂无关联项目')}</h3></div>}
  </section>;
}
