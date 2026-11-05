import { useState } from 'react';
import { FolderUp, X } from 'lucide-react';
import { Modal } from './Modal';
import { useTranslation } from '../i18n';
import { bytesLabel } from '../services/results';
import type { ResultDirectory } from '../services/results';
import { matchUploadDirectory } from '../services/projectUpload';

export interface ProjectUploadEntry { file: File; directory: string; path: string }

export function ProjectUploadDialog({ projectName, directories, onClose, onUpload }: {
  projectName: string;
  directories: ResultDirectory[];
  onClose: () => void;
  onUpload: (entries: ProjectUploadEntry[]) => void;
}) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<ProjectUploadEntry[]>([]);
  const groups = directories.filter(group => group.name !== '基本信息');
  const unmatched = entries.filter(entry => !entry.directory).length;
  return <Modal title={t('一键上传')} wide onClose={onClose} footer={<>
    <button className="button" onClick={onClose}>{t('取消')}</button>
    <button className="button primary" disabled={!entries.length || unmatched > 0} onClick={() => onUpload(entries)}>{t('上传全部成果')}</button>
  </>}>
    <div className="upload-context"><p>{t('当前项目')}　<strong>{projectName}</strong></p></div>
    <p>{t('选择项目成果所在文件夹，自动查找子目录并匹配成果目录。')}</p>
    <label className="result-file-picker"><FolderUp size={30}/><strong>{t('选择项目成果文件夹')}</strong>
      <input type="file" multiple {...{ webkitdirectory: '', directory: '' }} aria-label={t('选择项目成果文件夹')} onChange={event => {
        setEntries(Array.from(event.target.files || []).map(file => {
          const path = file.webkitRelativePath || file.name;
          return { file, path, directory: matchUploadDirectory(path, directories) };
        }));
      }}/>
    </label>
    {!!entries.length && <p role="status">{t('共 {count} 个文件，总大小 {size}', { count: entries.length, size: bytesLabel(entries.reduce((sum, entry) => sum + entry.file.size, 0)) })}</p>}
    {unmatched > 0 && <p className="form-error" role="alert">{t('有 {count} 个文件未匹配成果目录，请选择目录或移除文件。', { count: unmatched })}</p>}
    <div className="project-upload-list"><table className="upload-files"><thead><tr>{['文件路径', '大小', '成果目录', '操作'].map(label => <th key={label}>{t(label)}</th>)}</tr></thead>
      <tbody>{entries.map((entry, index) => <tr key={entry.path + index}>
        <td className="project-upload-path" title={entry.path}>{entry.path}</td><td>{bytesLabel(entry.file.size)}</td>
        <td><select aria-label={t('{file}的成果目录', { file: entry.path })} value={entry.directory} onChange={event => setEntries(previous => previous.map((item, i) => i === index ? { ...item, directory: event.target.value } : item))}>
          <option value="">{t('请选择成果目录')}</option>{groups.map(group => <optgroup key={group.name} label={t(group.name)}>{group.items.map(name => <option key={name} value={name}>{t(name)}</option>)}</optgroup>)}
        </select></td>
        <td><button className="icon-button" aria-label={t('移除{file}', { file: entry.path })} onClick={() => setEntries(previous => previous.filter((_, i) => i !== index))}><X size={16}/></button></td>
      </tr>)}{!entries.length && <tr><td colSpan={4} className="muted">{t('尚未选择文件')}</td></tr>}</tbody>
    </table></div>
  </Modal>;
}
