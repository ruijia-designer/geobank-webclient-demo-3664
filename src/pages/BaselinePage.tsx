import { Fragment, useEffect, useId, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, FileText, FolderTree, Grid2X2, HardDrive, Image, Layers, MapPinned, Pencil, Plus, ScanLine, Server, Trash2, Users } from 'lucide-react';
import type { AppApi } from '../types';
import { Modal } from '../components/Modal';
import { BASELINE_CONFIGS, NAMING_GROUPS, baselineFilter, demoRows, namingCache, saveBaselineRows, SORTABLE_BASELINE_IDS, baselineSiblings, moveBaselineRow, placeBaselineRow, projectTypeParentOptions, projectTypeParentError, baselinePath } from '../services/baseline';
import type { BaselineRow } from '../services/baseline';
import { useTranslation } from '../i18n';
import './BaselinePage.css';
const icons = [Grid2X2, FileText, FolderTree, MapPinned, Layers, Image, Grid2X2, Layers, Layers, Layers, Users, Users, Users, HardDrive, Server];
const navigationGroupStarts = new Set(['structure', 'closure', 'clients', 'disks']);
type Dialog = {
    mode: 'new' | 'edit' | 'detail' | 'delete' | 'scan';
    row: BaselineRow;
};
export default function BaselinePage({ api }: {
    api: AppApi;
}) {
    const { t } = useTranslation();
    const rowActionLabel = (action: string, name: string) => t(action) === action
        ? action === '新增下级' ? '新增' + name + '下级' : action + name
        : t(action) + ' ' + name;
    const section = api.state.route.section || 'types';
    const config = BASELINE_CONFIGS.find(c => c.id === section || c.title === section) || BASELINE_CONFIGS[0];
    const displayFieldValue = (key: string, raw: string | number | undefined) => {
        const value = String(raw ?? '');
        const field = config.fields.find(candidate => candidate.key === key);
        return field?.kind === 'select' && key !== 'parent' ? t(value || '—') : value || '—';
    };
    const [rows, setRows] = useState(demoRows[config.id]);
    const [query, setQuery] = useState('');
    const [draft, setDraft] = useState('');
    const [codeDraft, setCodeDraft] = useState('');
    const [codeQuery, setCodeQuery] = useState('');
    const [extra, setExtra] = useState('');
    const [extraQuery, setExtraQuery] = useState('');
    const [expanded, setExpanded] = useState<string[]>(['1', '2', '5', '7', '10', '11', '15', '18']);
    const [dialog, setDialog] = useState<Dialog | null>(null);
    const [form, setForm] = useState<BaselineRow>({ id: '', name: '' });
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
    const formRef = useRef<HTMLDivElement>(null);
    const errorFocus = useRef<string | null>(null);
    const formId = useId();
    useEffect(() => {
        const key = errorFocus.current;
        if (!key) return;
        errorFocus.current = null;
        const field = formRef.current?.querySelector<HTMLElement>(`[data-field-key="${key}"]`);
        field?.focus({ preventScroll: true });
        field?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    }, [fieldErrors]);
    const validateForm = (values: BaselineRow) => {
        const errors: Record<string, string> = {};
        if (!values.name.trim()) errors.name = '请输入名称';
        if (config.id === 'types') {
            if (!/^#[0-9a-f]{6}$/i.test(String(values.color || ''))) errors.color = '请输入有效的六位颜色值';
            const parentError = projectTypeParentError(rows, values);
            if (parentError) errors.parent = parentError;
        }
        return errors;
    };
    const updateField = (key: string, value: string) => {
        const next = { ...form, [key]: value };
        setForm(next);
        if (fieldErrors[key]) {
            const message = validateForm(next)[key];
            setFieldErrors(previous => {
                const nextErrors = { ...previous };
                if (message) nextErrors[key] = message;
                else delete nextErrors[key];
                return nextErrors;
            });
        }
    };
    const fieldAttributes = (key: string) => ({
        'data-field-key': key,
        'aria-invalid': fieldErrors[key] ? true : undefined,
        'aria-describedby': fieldErrors[key] ? `${formId}-${key}-error` : undefined,
    });
    const [rangeCount, setRangeCount] = useState(1);
    const [names, setNames] = useState({ ...namingCache });
    useEffect(() => { setRows(demoRows[config.id]); setDraft(''); setQuery(''); setCodeDraft(''); setCodeQuery(''); setExtra(''); setExtraQuery(''); setDialog(null); setExpanded(config.id === 'types' ? ['1'] : ['1', '2', '5', '7', '10', '11', '15', '18']); }, [config.id]);
    const update = (next: BaselineRow[]) => { setRows(saveBaselineRows(config.id, next)); };
    const sortable = SORTABLE_BASELINE_IDS.has(config.id);
    const filtered = baselineFilter(rows, query, codeQuery, config.tree).filter(r => !extraQuery || Object.values(r).includes(extraQuery));
    const visible = filtered.filter(r => { if (query || codeQuery)
        return true; let parent = r.parent; while (parent) {
        if (!expanded.includes(parent))
            return false;
        parent = rows.find(x => x.id === parent)?.parent;
    } return true; });
    const open = (mode: Dialog['mode'], row?: BaselineRow, parent?: BaselineRow) => { const initial = row ? { ...row } : { id: 'new-' + Date.now(), name: '', ...(config.id === 'types' ? { color: '#277DA8' } : {}), ...(parent ? { parent: parent.id, level: (parent.level || 1) + 1, ...(config.id === 'structure' ? { type: parent.level === 1 ? '坳陷' : '凹陷' } : {}) } : config.tree ? { level: 1, ...(config.id === 'structure' ? { type: '盆地' } : {}) } : {}) }; setForm(initial); setDialog({ mode, row: initial }); setFieldErrors({}); errorFocus.current = null; setRangeCount(1); };
    const close = () => { setDialog(null); setFieldErrors({}); errorFocus.current = null; };
    const save = () => {
    const errors = validateForm(form);
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
        errorFocus.current = config.fields.find(field => errors[field.key])?.key || null;
        return;
    }
    const saved = { ...form, name: form.name.trim() };
    const hasSortField = config.fields.some(field => field.key === 'sort');
    const position = hasSortField && form.sort !== undefined && String(form.sort).trim() !== '' ? Number(form.sort) : undefined;
    update(placeBaselineRow(config.id, rows, saved, position));
    if (config.tree && saved.parent) {
        const ancestors: string[] = [];
        let parent = saved.parent;
        while (parent && !ancestors.includes(parent)) { ancestors.push(parent); parent = rows.find(row => row.id === parent)?.parent || ''; }
        setExpanded(previous => [...new Set([...previous, ...ancestors])]);
    }
    close(); api.notify(t('已保存到本地演示数据')); };
    const remove = () => { const ids = new Set([form.id]); let previous = 0; while (ids.size !== previous) {
        previous = ids.size;
        rows.forEach(r => { if (r.parent && ids.has(r.parent))
            ids.add(r.id); });
    } update(rows.filter(r => !ids.has(r.id))); close(); api.notify(t('已删除本地演示记录')); };
    const move = (row: BaselineRow, direction: -1 | 1) => update(moveBaselineRow(config.id, rows, row.id, direction));
    const toggle = (id: string) => setExpanded(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
    const bodyRows = (() => { if (!config.tree)
        return visible; const sorted: BaselineRow[] = []; const visit = (parent = '') => { for (const r of visible.filter(x => (x.parent || '') === parent)) {
        sorted.push(r);
        visit(r.id);
    } }; visit(); return sorted; })();
    const nameUpdate = (item: string, key: 'number' | 'suffix', value: string) => { const next = { ...names, [item]: { number: names[item]?.number || '', suffix: names[item]?.suffix || '', [key]: value } }; setNames(next); };
    const secondary = ['areas', 'mining', 'imagery', 'datum', 'velocity', 'servers'].includes(config.id);
    const secondaryKey = config.id === 'mining' ? 'type' : config.id === 'imagery' ? 'service' : config.id === 'servers' ? 'primary' : 'basin';
    const secondaryLabel = config.id === 'mining' ? '类型' : config.id === 'imagery' ? '服务类型' : config.id === 'servers' ? '是否主节点' : '盆地';
    return <div className="baseline-layout"><aside className="baseline-sidebar"><h2>{t('基准')}</h2><nav aria-label={t('基准栏目')}>{BASELINE_CONFIGS.map((c, i) => { const Icon = icons[i]; return <Fragment key={c.id}>{navigationGroupStarts.has(c.id) && <hr className="baseline-nav-divider" aria-hidden="true"/>}<button className={c.id === config.id ? 'active' : ''} onClick={() => api.navigate({ page: 'baseline', section: c.id })}><Icon size={19}/>{t(c.title)}</button></Fragment>; })}</nav></aside><main className="baseline-main"><div className="page-heading"><h1>{t(config.title)}</h1><p>{t(config.description)}</p></div><form className="card baseline-filters" onSubmit={e => { e.preventDefault(); setQuery(draft); setCodeQuery(codeDraft); setExtraQuery(extra); }}>{secondary && <label className="field">{t(secondaryLabel)}<select value={extra} onChange={e => setExtra(e.target.value)}><option value="">{t('全部')}</option>{[...new Set(rows.map(r => String(r[secondaryKey] || '')).filter(Boolean))].map(x => <option key={x} value={x}>{t(x)}</option>)}</select></label>}<label className="field">{t(config.id === 'naming' ? '搜索' : '名称')}<input placeholder={t('请输入')} value={draft} onChange={e => setDraft(e.target.value)}/></label>{config.id === 'structure' && <label className="field">{t('编码')}<input placeholder={t('请输入')} value={codeDraft} onChange={e => setCodeDraft(e.target.value)}/></label>}<div className="filter-actions"><button type="button" className="button" onClick={() => { setDraft(''); setQuery(''); setCodeDraft(''); setCodeQuery(''); setExtra(''); setExtraQuery(''); }}>{t('重置')}</button><button className="button primary">{t('查询')}</button></div></form>
 <section className="card baseline-list" data-baseline={config.id}><header><h2>{t(config.id === 'naming' ? '项目成果数据命名规则' : config.title + '列表')}</h2><div>{config.tree && config.id === 'structure' && <button className="button" onClick={() => setExpanded(expanded.length ? [] : rows.map(r => r.id))}>{t(expanded.length ? '收起全部' : '展开全部')}</button>}{config.id === 'naming' ? <><select aria-label={t('数据类别')} defaultValue="处理数据"><option value="处理数据">{t('处理数据')}</option></select><button className="button primary" onClick={() => { Object.assign(namingCache, names); api.notify(t('命名规则已保存')); }}>{t('保存')}</button></> : <button className="button primary" onClick={() => open('new')}><Plus size={16}/>{t(config.id === 'structure' ? '新增盆地' : '新增' + config.title)}</button>}</div></header>
 {config.id === 'naming' ? <div className="table-wrap"><table className="naming-table"><thead><tr><th>{t('数据')}</th><th>{t('编号')}</th><th>{t('目录名称')}</th><th>{t('命名规则')}</th></tr></thead><tbody>{NAMING_GROUPS.map(g => [<tr key={g.name} className="group-row"><td><ChevronDown size={14}/>{g.name}</td><td>—</td><td>{g.name}</td><td>—</td></tr>, ...g.items.filter(n => !query || n.includes(query)).map(item => <tr key={item}><td className="naming-name">{item}</td><td><input aria-label={item + (t('编号') === '编号' ? '' : ' ') + t('编号')} placeholder={t('请输入序号')} value={names[item]?.number || ''} onChange={e => nameUpdate(item, 'number', e.target.value)}/></td><td>{item}</td><td><input aria-label={item + (t('命名规则') === '命名规则' ? '' : ' ') + t('命名规则')} placeholder={t('请输入后缀')} value={names[item]?.suffix || ''} onChange={e => nameUpdate(item, 'suffix', e.target.value)}/></td></tr>)])}</tbody></table></div> : <div className="table-wrap"><table><thead><tr>{config.id !== 'types' && <th>#</th>}{config.columns.map(([key, label]) => <th key={key}>{t(label)}</th>)}<th className="baseline-actions-heading">{t('操作')}</th></tr></thead><tbody>{bodyRows.map((r, index) => { const children = rows.some(x => x.parent === r.id), siblings = baselineSiblings(rows, r), at = siblings.findIndex(x => x.id === r.id); return <tr key={r.id}>{config.id !== 'types' && <td>{index + 1}</td>}{config.columns.map(([key]) => <td key={key}>{key === 'name' ? <div className="tree-name" style={{ paddingLeft: ((r.level || 1) - 1) * 24 }}>{config.tree && (children ? <button className="icon-button tree-toggle" aria-label={rowActionLabel(expanded.includes(r.id) ? '收起' : '展开', r.name)} onClick={() => toggle(r.id)}>{expanded.includes(r.id) ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button> : <span className="tree-spacer"/>)}<button className="link-button" onClick={() => open('detail', r)}>{r.name}</button></div> : key === 'color' ? <span className="color-swatch" style={{ backgroundColor: String(r.color) }}>{r.color}</span> : displayFieldValue(key, r[key])}</td>)}<td className="baseline-actions-cell"><div className="row-actions baseline-row-actions">
 {config.tree && (r.level || 1) < (config.id === 'types' ? 2 : 3) && <button className="icon-button action-add" title={t('新增下级')} aria-label={rowActionLabel('新增下级', r.name)} onClick={() => open('new', undefined, r)}><Plus size={18}/></button>}
 <button className="icon-button action-edit" title={t('编辑')} aria-label={rowActionLabel('编辑', r.name)} onClick={() => open('edit', r)}><Pencil size={18}/></button>
 {sortable && <><button className="icon-button action-up" title={t('上移')} aria-label={rowActionLabel('上移', r.name)} disabled={at === 0} onClick={() => move(r, -1)}><ArrowUp size={18}/></button><button className="icon-button action-down" title={t('下移')} aria-label={rowActionLabel('下移', r.name)} disabled={at === siblings.length - 1} onClick={() => move(r, 1)}><ArrowDown size={18}/></button></>}
 {config.scan && <button className="icon-button action-scan" title={t('扫描')} aria-label={rowActionLabel('扫描', r.name)} onClick={() => open('scan', r)}><ScanLine size={18}/></button>}
 <button className="icon-button danger action-delete" title={t('删除')} aria-label={rowActionLabel('删除', r.name)} onClick={() => open('delete', r)}><Trash2 size={18}/></button>
 </div></td></tr>; })}</tbody></table>{!bodyRows.length && <div className="empty-state"><FileText size={42}/><h3>{t(query || extraQuery ? '未找到匹配记录' : '暂无数据')}</h3><p>{t(query ? '调整查询条件后重新查询' : '新增后可在此查看与维护')}</p>{!query && <button className="button primary" onClick={() => open('new')}>{t('新增' + config.title)}</button>}</div>}</div>}
 <footer>{config.id === 'naming' ? <span>{t('固定成果目录，仅编辑编号及文件后缀')}</span> : <><span>{bodyRows.length ? t('共 {count} 条', { count: bodyRows.length }) : '—'}</span><span>{t('10 条 / 页')} <button className="button" disabled>{t('上一页')}</button><button className="button primary">1</button><button className="button" disabled>{t('下一页')}</button></span></>}</footer></section></main>
 {dialog && <Modal title={t(dialog.mode === 'delete' ? '删除' + config.title : dialog.mode === 'scan' ? '扫描磁盘' : (dialog.mode === 'detail' ? '查看' : dialog.mode === 'edit' ? '编辑' : '新增') + config.title)} onClose={close} wide={config.id === 'mining' || config.id === 'closure'} footer={<><button className="button" onClick={close}>{t(dialog.mode === 'detail' ? '关闭' : '取消')}</button>{dialog.mode === 'delete' ? <button className="button danger-primary" onClick={remove}>{t('确认删除')}</button> : dialog.mode === 'scan' ? <button className="button primary" onClick={() => { update(rows.map(r => r.id === form.id ? { ...r, scanned: new Date().toLocaleString('sv-SE') } : r)); close(); api.notify(t('本地演示扫描完成')); }}>{t('开始扫描')}</button> : dialog.mode !== 'detail' && <button className="button primary" onClick={save}>{t('保存')}</button>}</>}>
 {dialog.mode === 'delete' ? <p>{t('确定删除“{name}”吗？', { name: form.name })}{rows.some(r => r.parent === form.id) && t('其下级记录也将删除。')}</p> : dialog.mode === 'scan' ? <div><p>{t('磁盘：')}{form.name}</p><p>{t('挂载路径：')}{form.path}</p><p className="muted">{t('扫描演示将更新扫描时间。')}</p></div> : <><div ref={formRef} className={'form-grid baseline-form' + (config.id === 'types' ? ' baseline-type-form' : '')}>{config.id === 'structure' && <div className="baseline-tree-note">{t('上级单元：')}{rows.find(r => r.id === form.parent)?.name || t('无（顶级盆地）')}　{t('单元类型：')}{t(String(form.type || '盆地'))}　{t('等级：')}{form.level || 1}</div>}{config.fields.filter(f => { if (config.id === 'datum') {
            if (f.key === 'value')
                return form.type !== '浮动基准面';
            if (f.kind === 'file')
                return form.type === '浮动基准面';
        } if (config.id === 'velocity') {
            if (f.key === 'value')
                return form.type !== '空变替换速度';
            if (f.kind === 'file')
                return form.type === '空变替换速度';
        } return true;  }).map(f => {
        const options = f.key === 'parent' ? projectTypeParentOptions(rows, form.id) : (f.options || []).map(x => ({ value: x, label: x }));
        const fieldId = `${formId}-${f.key}`;
        const attributes = { id: fieldId, 'aria-label': t(f.label), ...fieldAttributes(f.key) };
        const change = (value: string) => updateField(f.key, value);
        return <label key={f.key} htmlFor={fieldId} className={'field' + (f.kind === 'textarea' || (config.id === 'types' && f.kind === 'color') ? ' full' : '')}>
            <span className="field-label">{t(f.label)}{f.required && <span className="required"> *</span>}</span>
            {dialog.mode === 'detail' ? <div className="detail-value">{f.key === 'parent' ? baselinePath(rows, form.parent || '') || '—' : displayFieldValue(f.key, form[f.key])}</div>
            : f.kind === 'select' ? <select {...attributes} value={String(form[f.key] || '')} onChange={e => change(e.target.value)}><option value="">{t('请选择')}</option>{options.map(o => <option key={o.value} value={o.value}>{f.key === 'parent' ? o.label : t(o.label)}</option>)}</select>
            : f.kind === 'textarea' ? <textarea {...attributes} value={String(form[f.key] || '')} placeholder={t('请输入')} onChange={e => change(e.target.value)}/>
            : f.kind === 'file' ? <input {...attributes} type="file" accept=".json,.geojson,.grd,.txt" onChange={e => change(e.target.files?.[0]?.name || '')}/>
            : f.kind === 'color' ? <div className="color-input"><input type="color" aria-label={t('选择颜色')} value={/^#[0-9a-f]{6}$/i.test(String(form.color)) ? String(form.color) : '#277DA8'} onChange={e => change(e.target.value.toUpperCase())}/><input {...attributes} aria-label={t('颜色值')} value={String(form.color || '')} onChange={e => change(e.target.value)}/></div>
            : <input {...attributes} type={f.kind === 'date' ? 'date' : f.kind === 'number' ? 'number' : 'text'} min={f.key === 'sort' ? 1 : undefined} step={f.key === 'sort' ? 1 : undefined} placeholder={t('请输入')} value={String(form[f.key] ?? '')} onChange={e => change(e.target.value)}/>}
            {dialog.mode !== 'detail' && fieldErrors[f.key] && <span id={`${formId}-${f.key}-error`} className="field-error" role="alert">{t(fieldErrors[f.key])}</span>}
        </label>;
    })}</div>{config.id === 'mining' && <section className="baseline-ranges"><header><h3>{t('矿权范围记录')}</h3>{dialog.mode !== 'detail' && <button className="button" onClick={() => setRangeCount(n => n + 1)}><Plus size={14}/>{t('添加行')}</button>}</header>{Array.from({ length: rangeCount }, (_, i) => <div className="form-grid" key={i}><label className="field">{t('日期')}<input type="date" disabled={dialog.mode === 'detail'} value={String(form['rangeDate' + i] || '')} onChange={e => setForm({ ...form, ['rangeDate' + i]: e.target.value })}/></label><label className="field">{t('登记面积（km²）')}<input type="number" disabled={dialog.mode === 'detail'} value={String(form[i === 0 ? 'area' : 'area' + i] || '')} onChange={e => setForm({ ...form, [i === 0 ? 'area' : 'area' + i]: e.target.value })}/></label><label className="field full">{t('范围（GeoJSON）')}<input type="file" disabled={dialog.mode === 'detail'} accept=".json,.geojson" onChange={e => setForm({ ...form, ['rangeFile' + i]: e.target.files?.[0]?.name || '' })}/></label></div>)}</section>}</>}
 </Modal>}</div>;
}
