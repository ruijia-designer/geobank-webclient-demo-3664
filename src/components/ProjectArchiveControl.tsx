import { useEffect, useId, useRef, useState } from 'react';
import { ArrowRight, ChevronDown, Pencil } from 'lucide-react';
import type { AppApi, Project, ProjectArchiveRequest } from '../types';
import { APPROVAL_RECORDS } from '../services/demo';
import { bytesLabel } from '../services/results';
import { useTranslation } from '../i18n';
import { Modal } from './Modal';
import './ProjectArchiveControl.css';

const approvalSteps = [
  { role: '室长审批', people: '张室' },
  { role: '科长审批', people: '李科、张室' },
  { role: '处长审批', people: '王处、张室' },
];

export function ProjectArchiveControl({ api, project, fileCount, totalBytes }: {
  api: AppApi; project: Project; fileCount: number; totalBytes: number;
}) {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const formId = useId();
  const request = api.state.archiveRequests?.[project.id];
  const status = project.archived ? '已归档' : request ? '归档审批中' : '未归档';
  const applicant = request?.applicant || APPROVAL_RECORDS.approved.initiator;

  useEffect(() => {
    if (!menuOpen) return;
    itemRef.current?.focus();
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('click', closeOutside);
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('click', closeOutside);
      document.removeEventListener('keydown', key);
    };
  }, [menuOpen]);

  const closeDialog = () => {
    setDialogOpen(false);
    triggerRef.current?.focus();
  };
  const openDialog = () => {
    setMenuOpen(false);
    setReason(request?.reason || '');
    setError(false);
    triggerRef.current?.focus();
    setDialogOpen(true);
  };
  const submit = () => {
    if (project.archived || request) return;
    if (!reason.trim()) {
      setError(true);
      reasonRef.current?.focus();
      return;
    }
    const next: ProjectArchiveRequest = {
      projectId: project.id, projectName: project.name, fileCount, totalBytes,
      applicant, reason: reason.trim(), submittedAt: new Date().toISOString(), status: 'pending',
    };
    api.setState(state => state.archiveRequests?.[project.id] ? state : {
      ...state, archiveRequests: { ...state.archiveRequests, [project.id]: next },
    });
    closeDialog();
    api.notify(t('归档申请已提交（本地演示）'));
  };

  return <>
    <div className="project-archive-control" ref={rootRef}>
      {project.archived ? <span className="result-archive-status archived">{t(status)}</span> : <>
        <button ref={triggerRef} type="button" className="result-archive-status" aria-haspopup="menu" aria-expanded={menuOpen}
          onClick={() => setMenuOpen(open => !open)} onKeyDown={event => {
            if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setMenuOpen(true); }
          }}>{t(status)}<ChevronDown size={16} aria-hidden="true"/></button>
        {menuOpen && <div className="project-archive-menu" role="menu" aria-label={t('归档操作')} onBlur={event => {
          if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setMenuOpen(false);
        }}><button ref={itemRef} role="menuitem" type="button" onClick={openDialog}>{t(request ? '查看归档申请' : '申请归档')}</button></div>}
      </>}
    </div>
    {dialogOpen && <Modal title={t(request ? '项目归档申请详情' : '提交项目归档审批')} className="project-archive-modal"
      icon={<span className="archive-title-icon"><Pencil size={24} aria-hidden="true"/></span>} onClose={closeDialog}
      footer={request ? <button className="button" onClick={closeDialog}>{t('关闭')}</button> : <>
        <button className="button" onClick={closeDialog}>{t('取消')}</button>
        <button className="button primary" type="submit" form={formId}>{t('提交审批')}</button>
      </>}>
      <form id={formId} onSubmit={event => { event.preventDefault(); submit(); }}>
        <dl className="archive-project-summary">
          <dt>{t('项目名称')}</dt><dd>{request?.projectName || project.name}</dd>
          <dt>{t('文件总大小')}</dt><dd>{bytesLabel(request?.totalBytes ?? totalBytes)}</dd>
          <dt>{t('文件个数')}</dt><dd>{t('共 {count} 个文件', { count: request?.fileCount ?? fileCount })}</dd>
          <dt>{t('申请人')}</dt><dd>{applicant}</dd>
        </dl>
        <label className="archive-reason" htmlFor={formId + '-reason'}>{t('理由')}</label>
        <textarea ref={reasonRef} id={formId + '-reason'} className="archive-reason-input" placeholder={t('请输入理由…')}
          value={reason} readOnly={!!request} aria-required={!request} aria-invalid={error}
          aria-describedby={error ? formId + '-error' : undefined} onChange={event => { setReason(event.target.value); setError(false); }}/>
        {error && <p id={formId + '-error'} className="form-error" role="alert">{t('请输入申请理由')}</p>}
        <h3 className="archive-flow-heading">{t('审批流程')}</h3>
        <ol className="archive-approval-flow">{approvalSteps.map((step, index) => <li key={step.role}>
          <span className="archive-step-number">{index + 1}</span><span>{t(step.role)}（{step.people}）</span>
          {index < approvalSteps.length - 1 && <ArrowRight className="archive-step-arrow" size={16} aria-hidden="true"/>}
        </li>)}</ol>
      </form>
    </Modal>}
  </>;
}
