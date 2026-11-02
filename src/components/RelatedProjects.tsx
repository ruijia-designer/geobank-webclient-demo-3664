import { useId } from 'react';
import { ArrowUpRight, Folder } from 'lucide-react';
import type { Project, Role } from '../types';
import { useTranslation } from '../i18n';
import { canRead, visibleProjects } from '../services/demo';
import { projectCardClassification } from '../services/projectClassification';
import { projectBriefSummary } from '../services/projectBriefSummary';
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
    </header>
    {related.length ? <ul className="related-projects-list">{related.map(item => {
      const classification = projectCardClassification(item);
      const summary = projectBriefSummary(item, t);
      const readable = canRead(item, role);
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
                {summary.parameters.map(([label, value]) => <div key={label}><dt>{t(label)}</dt><dd>{value}</dd></div>)}
              </dl>
            </div>}
          </div>
          {readable && <button type="button" className="related-project-open"
            aria-label={t('查阅项目成果：{name}', { name: item.name })} onClick={() => onOpen(item)}>
            {t('查阅成果')}<ArrowUpRight size={16} aria-hidden="true"/>
          </button>}
        </div>
      </li>;
    })}</ul> : <div className="empty-state related-projects-empty"><Folder size={42} aria-hidden="true"/><h3>{t('暂无关联项目')}</h3></div>}
  </section>;
}
