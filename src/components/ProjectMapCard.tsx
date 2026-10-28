import { useId, useLayoutEffect, useRef, useState } from 'react';
import { ArrowUpRight, ChevronRight, X } from 'lucide-react';
import type { Project, Role } from '../types';
import { useTranslation } from '../i18n';
import { canRead, visibleProjects } from '../services/demo';
import { projectCardClassification } from '../services/projectClassification';
import { projectMapDetailSamples } from '../data/projectMapDetails';
import { positionMapCard } from '../services/mapCardPosition';
import type { MapProjectAnchor } from '../services/mapCardPosition';
import './ProjectMapCard.css';

function numberLabel(value: number | undefined, unit = '') {
  return value === undefined || !Number.isFinite(value) ? '—' : `${value.toLocaleString('en-US', { maximumFractionDigits: 6 })}${unit}`;
}

export function ProjectMapCard({ project, projects, role, anchor, onClose, onOpen }: {
  project: Project;
  projects: Project[];
  role: Role;
  anchor?: MapProjectAnchor;
  onClose: () => void;
  onOpen: (project: Project) => void;
}) {
  const { t } = useTranslation();
  const headingId = useId();
  const cardRef = useRef<HTMLElement>(null);
  const [cardHeight, setCardHeight] = useState(560);
  const measureHeight = () => {
    const height = cardRef.current?.getBoundingClientRect().height;
    if (height && height > 0) setCardHeight(current => current === height ? current : height);
  };
  // Reposition after content or available width changes, before the browser paints.
  useLayoutEffect(measureHeight);
  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measureHeight);
    observer?.observe(card);
    window.addEventListener('resize', measureHeight);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measureHeight); };
  }, []);
  const position = anchor ? positionMapCard(anchor, cardHeight) : undefined;
  const previousLayout = useRef<{ anchor: MapProjectAnchor; position: ReturnType<typeof positionMapCard>; height: number } | null>(null);
  const previous = previousLayout.current;
  const followsMarker = !!(previous && anchor && position &&
    previous.position.placement === position.placement && previous.position.width === position.width &&
    previous.position.maxHeight === position.maxHeight && previous.height === cardHeight &&
    previous.anchor.viewportWidth === anchor.viewportWidth && previous.anchor.viewportHeight === anchor.viewportHeight &&
    Math.abs((position.left - previous.position.left) - (anchor.x - previous.anchor.x)) < .01 &&
    Math.abs((position.top - previous.position.top) - (anchor.y - previous.anchor.y)) < .01);
  useLayoutEffect(() => {
    previousLayout.current = anchor && position ? { anchor, position, height: cardHeight } : null;
  });
  const details = { ...projectMapDetailSamples[project.id], ...project.mapDetails };
  const parameters = details.processing;
  const binSize = parameters?.binSizeMeters;
  const classification = projectCardClassification(project);
  const availableProjects = new Map(visibleProjects(projects, role).map(item => [item.id, item]));
  const relatedProjects = [...new Set(details.relatedProjectIds || [])]
    .filter(id => id !== project.id)
    .map(id => availableProjects.get(id))
    .filter((item): item is Project => !!item);
  const overview = [
    ['年度', project.year || '—'],
    ['地区', project.basin || '—'],
    ['项目类型', project.type ? t(project.type) : '—'],
    ['满覆盖面积', numberLabel(details.fullFoldAreaKm2, ' km²')],
  ];
  const processing = [
    ['总炮数', numberLabel(parameters?.shotCount)],
    ['面元', binSize?.length === 2 && binSize.every(Number.isFinite) ? `${numberLabel(binSize[0])} m × ${numberLabel(binSize[1])} m` : '—'],
    ['纵横比', numberLabel(parameters?.aspectRatio)],
    ['最大炮检距', numberLabel(parameters?.maxOffsetKm, ' km')],
  ];
  const facts = (rows: string[][]) => <dl className="map-project-facts">{rows.map(([label, value]) => <div key={label}>
    <dt>{t(label)}</dt><dd>{value}</dd>
  </div>)}</dl>;

  return <section ref={cardRef} className={'floating-project' + (followsMarker ? ' follows-marker' : '')} aria-labelledby={headingId}
    data-placement={position?.placement} style={position && { left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }}>
    <header className="map-project-header"><span id={headingId}>{t('项目详情')}</span>
      <button className="icon-button" aria-label={t('关闭项目详情')} onClick={onClose}><X size={19} aria-hidden="true"/></button>
    </header>
    <div className="map-project-body">
      <div className="map-project-identity">
        <span className="map-project-stripe" style={{ backgroundColor: classification.secondaryColor }} aria-hidden="true"/>
        <h3>{project.name}</h3>
        <span className="map-project-category" style={{ backgroundColor: classification.primaryColor, color: classification.textColor }}>{t(classification.label)}</span>
      </div>
      <div className="map-project-section">{facts(overview)}</div>
      <section className="map-project-section"><h4>{t('处理参数')}</h4>{facts(processing)}</section>
      <section className="map-project-section map-project-related"><h4>{t('关联项目')}</h4>
        {relatedProjects.length ? <ul>{relatedProjects.map(item => <li key={item.id}>
          <button type="button" title={item.name} aria-label={t('查阅关联项目：{name}', { name: item.name })} onClick={() => onOpen(item)}>
            <span>{item.name}</span><ChevronRight size={16} aria-hidden="true"/>
          </button>
        </li>)}</ul> : <p className="map-project-empty">{t('暂无关联项目')}</p>}
      </section>
    </div>
    <footer className="map-project-footer"><button className="button primary" onClick={() => onOpen(project)}>
      {t('查阅成果')}<ArrowUpRight size={16} aria-hidden="true"/>
    </button>{!canRead(project, role) && <span className="sr-only">{t('当前项目无查阅权限')}</span>}</footer>
  </section>;
}
