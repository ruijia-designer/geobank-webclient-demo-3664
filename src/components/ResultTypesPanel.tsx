import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ChevronDown, ChevronRight, FileText, Pencil } from 'lucide-react';
import { useTranslation } from '../i18n';
import { Modal } from './Modal';
import { RowReorderHandle, useRowReorder } from './RowReorder';
import { ApplicableProjectsPicker } from './ApplicableProjectsPicker';
import { getProjectTypeOptions } from '../services/projectClassification';
import type { ProjectTypeOption } from '../services/projectClassification';
import { applicableProjectSelections, applicableProjectsLabel, getCategoryProjectTypes, scopeApplicableProjects } from '../services/resultTypeProjects';
import { loadResultTypes, saveResultTypes } from '../services/resultTypes';
import type { ResultTypeCategoryId, ResultTypeGroup, ResultTypeItem } from '../services/resultTypes';
import './ResultTypesPanel.css';

const fields = [
    ['name', '数据'],
    ['applicableProjects', '适用项目'],
    ['number', '成果编号'],
    ['chineseDirectory', '中文目录'],
    ['englishDirectory', '英文目录'],
    ['namingRule', '命名规则'],
    ['notes', '备注'],
] as const;
const tableFields = [fields[0], ['id', '编码'], ...fields.slice(1)] as const;
type ItemField = typeof tableFields[number][0];
type ItemValues = Omit<ResultTypeItem, 'id'>;
type EditorTarget = { kind: 'group'; group: ResultTypeGroup }
    | { kind: 'item'; groupId: string; item: ResultTypeItem };

const emptyItem: ItemValues = { name: '', applicableProjects: '', number: '', chineseDirectory: '', englishDirectory: '', namingRule: '', notes: '' };

function reorderSibling<T extends { id: string }>(siblings: T[], sourceId: string, targetId: string, placement: 'before' | 'after'): T[] {
    const source = siblings.find(entry => entry.id === sourceId);
    if (!source || sourceId === targetId || !siblings.some(entry => entry.id === targetId)) return siblings;
    const next = siblings.filter(entry => entry.id !== sourceId);
    const destination = next.findIndex(entry => entry.id === targetId) + (placement === 'after' ? 1 : 0);
    next.splice(destination, 0, source);
    return next;
}

function ResultTypeEditor({ target, projectTypes, categoryProjectTypes, onClose, onSubmit }: {
    target: EditorTarget;
    projectTypes: ProjectTypeOption[];
    categoryProjectTypes: ProjectTypeOption[];
    onClose: () => void;
    onSubmit: (values: ItemValues) => void;
}) {
    const { t } = useTranslation();
    const formId = useId();
    const formRef = useRef<HTMLFormElement>(null);
    const [values, setValues] = useState<ItemValues>(() => target.kind === 'group'
        ? { ...emptyItem, name: target.group.name }
        : scopeApplicableProjects({ ...emptyItem, ...target.item }, categoryProjectTypes, projectTypes));
    const [nameError, setNameError] = useState(false);
    const nameRequired = target.kind === 'group';
    const title = target.kind === 'group' ? '编辑分类' : '编辑成果项';
    const editorFields = target.kind === 'group' ? fields.slice(0, 1) : fields;
    return <Modal title={t(title)} onClose={onClose} className="result-types-dialog" footer={<>
        <button className="button" onClick={onClose}>{t('取消')}</button>
        <button className="button primary" type="submit" form={formId}>{t('保存')}</button>
    </>}>
        <form id={formId} ref={formRef} className="form-grid" noValidate onSubmit={event => {
            event.preventDefault();
            if (nameRequired && !values.name.trim()) {
                setNameError(true);
                formRef.current?.querySelector<HTMLInputElement>('input')?.focus();
                return;
            }
            const scopedValues = scopeApplicableProjects(values, categoryProjectTypes, projectTypes);
            onSubmit(scopedValues.applicableProjectTypes ? {
                ...scopedValues,
                applicableProjectTypes: applicableProjectSelections(scopedValues, projectTypes),
                applicableProjects: applicableProjectsLabel(scopedValues, projectTypes),
            } : scopedValues);
        }}>
            {editorFields.map(([field, label]) => field === 'applicableProjects' ? <div className="field" key={field}>
                <span>{t(label)}</span>
                <ApplicableProjectsPicker options={categoryProjectTypes} value={applicableProjectSelections(values, projectTypes)} onChange={selected => setValues(previous => ({
                    ...previous, applicableProjectTypes: selected, applicableProjects: selected.map(value => value.name).join('\n'),
                }))}/>
            </div> : <label key={field} className={`field${field === 'name' || field === 'notes' ? ' full' : ''}`} htmlFor={`${formId}-${field}`}>
                <span>{t(field === 'name' ? '名称' : label)}{field === 'name' && nameRequired && <span className="required"> *</span>}</span>
                <input id={`${formId}-${field}`} type="text" aria-label={t(field === 'name' ? '名称' : label)} title={values[field] || undefined}
                    required={field === 'name' && nameRequired} aria-invalid={field === 'name' && nameError || undefined}
                    aria-describedby={field === 'name' && nameError ? `${formId}-name-error` : undefined}
                    value={values[field]} onChange={event => {
                        setValues(previous => ({ ...previous, [field]: event.target.value }));
                        if (field === 'name') setNameError(false);
                    }}/>
                {field === 'name' && nameError && <span id={`${formId}-name-error`} className="field-error" role="alert">{t('请输入名称')}</span>}
            </label>)}
        </form>
    </Modal>;
}

export function ResultTypesPanel({ query, queryVersion, onCategoryChange, onSave }: {
    query: string;
    queryVersion: number;
    onCategoryChange: () => void;
    onSave: () => void;
}) {
    const { t } = useTranslation();
    const [categories, setCategories] = useState(loadResultTypes);
    const [categoryId, setCategoryId] = useState<ResultTypeCategoryId>('processing');
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
    const [searchCollapsed, setSearchCollapsed] = useState<Record<string, boolean>>({});
    const [matchedIds, setMatchedIds] = useState<Set<string>>(() => new Set());
    const [matchedGroupIds, setMatchedGroupIds] = useState<Set<string>>(() => new Set());
    const [dialog, setDialog] = useState<EditorTarget | null>(null);
    const [scrolledLeft, setScrolledLeft] = useState(false);
    const [nameColumnWidth, setNameColumnWidth] = useState(180);
    const tableRef = useRef<HTMLTableElement>(null);
    const term = query.trim().toLocaleLowerCase();
    const category = categories.find(entry => entry.id === categoryId)!;
    const projectTypes = getProjectTypeOptions();
    const fieldValue = (item: ResultTypeItem, field: ItemField) => field === 'applicableProjects' ? applicableProjectsLabel(item, projectTypes) : item[field];

    // Measure the whole category, including collapsed and filtered-out rows, so
    // searching does not resize the fixed name column beneath the user.
    useLayoutEffect(() => {
        let disposed = false;
        const measure = () => {
            const table = tableRef.current;
            if (disposed || !table) return;
            const header = table.querySelector('th');
            const textStyle = getComputedStyle(table);
            const headerStyle = getComputedStyle(header ?? table);
            const probe = document.createElement('span');
            Object.assign(probe.style, { position: 'absolute', visibility: 'hidden', pointerEvents: 'none', whiteSpace: 'pre', width: 'max-content' });
            table.parentElement?.append(probe);
            const textWidth = (text: string, weight = '400', size = textStyle.fontSize) => {
                probe.style.font = `${weight} ${size} ${textStyle.fontFamily}`;
                probe.style.letterSpacing = textStyle.letterSpacing;
                probe.textContent = text;
                return probe.getBoundingClientRect().width;
            };
            // Match the first-cell padding, child indent and disclosure width.
            let width = Math.max(180, textWidth(header?.textContent ?? '', headerStyle.fontWeight, headerStyle.fontSize)
                + parseFloat(headerStyle.paddingLeft || '0') + parseFloat(headerStyle.paddingRight || '0'));
            for (const group of category.groups) {
                width = Math.max(width, textWidth(group.name || t('分类名称'), '600') + 14 + 28 + 2 + 14);
                for (const item of group.items) width = Math.max(width, textWidth(item.name || t('二级分类名称')) + 76 + 14);
            }
            probe.remove();
            setNameColumnWidth(Math.ceil(width) + 2);
        };
        measure();
        document.fonts?.ready.then(measure);
        document.fonts?.addEventListener('loadingdone', measure);
        window.addEventListener('resize', measure);
        return () => {
            disposed = true;
            document.fonts?.removeEventListener('loadingdone', measure);
            window.removeEventListener('resize', measure);
        };
    }, [category, t]);

    // Keep the submitted result set stable while its fields are edited. A new
    // submission (including the same keyword) searches the latest draft values.
    useEffect(() => {
        setSearchCollapsed({});
        setMatchedGroupIds(new Set(category.groups.filter(group => [group.name, group.id].some(value => value.toLocaleLowerCase().includes(term))).map(group => group.id)));
        setMatchedIds(new Set(category.groups.flatMap(group =>
            !term || [group.name, group.id].some(value => value.toLocaleLowerCase().includes(term)) ? group.items.map(item => item.id)
                : group.items.filter(item => tableFields.some(([field]) => fieldValue(item, field).toLocaleLowerCase().includes(term))).map(item => item.id))));
    }, [query, queryVersion, categoryId]);

    const groups = category.groups.map(group => ({
        ...group,
        items: !term ? group.items : group.items.filter(item => matchedIds.has(item.id)),
    })).filter(group => !term || group.items.length > 0 || matchedGroupIds.has(group.id));
    const count = groups.reduce((total, group) => total + group.items.length, 0);
    const visibleRows = groups.flatMap(group => [group.id,
        ...(!(term ? searchCollapsed[group.id] : collapsed[group.id]) ? group.items.map(item => item.id) : []),
    ]).join('|');

    const toggleGroup = (groupId: string) => {
        const update = term ? setSearchCollapsed : setCollapsed;
        update(previous => ({ ...previous, [groupId]: !previous[groupId] }));
    };
    const updateGroups = (update: (groups: ResultTypeGroup[]) => ResultTypeGroup[]) => {
        const next = categories.map(entry => entry.id === categoryId ? { ...entry, groups: update(entry.groups) } : entry);
        saveResultTypes(next);
        setCategories(next);
    };
    const saveEditor = (values: ItemValues) => {
        if (!dialog) return;
        if (dialog.kind === 'group') {
            updateGroups(previous => previous.map(group => group.id === dialog.group.id ? { ...group, name: values.name } : group));
        } else {
            const item = { ...values, id: dialog.item.id };
            updateGroups(previous => previous.map(group => group.id === dialog.groupId
                ? { ...group, items: group.items.map(entry => entry.id === item.id ? item : entry) } : group));
        }
        setDialog(null);
        onSave();
    };
    const reorder = useRowReorder({
        items: category.groups.flatMap(group => [
            { id: group.id, label: group.name || t('分类名称'), parentId: undefined as string | undefined },
            ...group.items.map(item => ({ id: item.id, parentId: group.id, label: item.name || t('二级分类名称') })),
        ]),
        scopeKey: `${categoryId}:${term}:${visibleRows}:${dialog?.kind || ''}`,
        onReorder: (sourceId, targetId, placement) => updateGroups(previous => {
            if (previous.some(group => group.id === sourceId)) return reorderSibling(previous, sourceId, targetId, placement);
            return previous.map(group => group.items.some(item => item.id === sourceId)
                ? { ...group, items: reorderSibling(group.items, sourceId, targetId, placement) } : group);
        }),
    });
    const renderActions = (group: ResultTypeGroup, item?: ResultTypeItem) => {
        const fullGroup = category.groups.find(entry => entry.id === group.id)!;
        const name = item ? item.name || t('二级分类名称') : group.name || t('分类名称');
        return <td className="baseline-actions-cell result-types-actions"><div className="row-actions baseline-row-actions">
            <button className="icon-button action-edit" type="button" title={t('编辑')} aria-label={t('编辑{name}', { name })}
                onClick={() => setDialog(item ? { kind: 'item', groupId: group.id, item } : { kind: 'group', group: fullGroup })}><Pencil size={18}/></button>
            <RowReorderHandle {...reorder.handleProps(item?.id ?? group.id)}/>
        </div></td>;
    };
    const renderField = (item: ResultTypeItem, field: ItemField) => {
        const value = fieldValue(item, field);
        return <span className={`result-types-text${value ? '' : ' result-types-empty'}`} data-field={field} title={value || undefined}>
            {value || (field === 'name' ? t('二级分类名称') : '—')}
        </span>;
    };

    return <section className="card baseline-list result-types-panel" data-baseline="naming"
        style={{ '--result-types-name-width': `${nameColumnWidth}px` } as CSSProperties}>
        <header>
            <h2>{t('项目成果类型')}</h2>
            <div>
                <select aria-label={t('数据类别')} value={categoryId} onChange={event => {
                    setCategoryId(event.target.value as ResultTypeCategoryId);
                    onCategoryChange();
                }}>
                    {categories.map(entry => <option key={entry.id} value={entry.id}>{t(entry.name)}</option>)}
                </select>
            </div>
        </header>
        <div className="table-wrap result-types-scroll" role="region" aria-label={t('成果类型列表')} tabIndex={0}
            data-scrolled-left={scrolledLeft} onScroll={event => setScrolledLeft(event.currentTarget.scrollLeft > 0)}>
            <table {...reorder.tableProps} ref={element => { tableRef.current = element; reorder.tableProps.ref(element); }} className="result-types-table">
                <colgroup>
                    {tableFields.map(([field]) => <col key={field} className={`result-types-column-${field}`}/>)}
                    <col className="result-types-column-actions"/>
                </colgroup>
                <thead><tr>{tableFields.map(([field, label]) => <th scope="col" key={field}>{t(field === 'name' ? `${category.name}项目` : label)}</th>)}
                    <th scope="col" className="baseline-actions-heading result-types-actions">{t('操作')}</th>
                </tr></thead>
                <tbody>
                    {groups.map(group => {
                        const isExpanded = !(term ? searchCollapsed[group.id] : collapsed[group.id]);
                        const action = t(isExpanded ? '收起' : '展开');
                        return <Fragment key={group.id}>
                            <tr {...reorder.rowProps(group.id)} className={`result-types-group ${reorder.rowProps(group.id).className || ''}`} data-group-id={group.id}>
                                <td>
                                    <div className="result-types-group-name">
                                        <button className="icon-button" type="button" aria-expanded={isExpanded}
                                            aria-label={`${action}${action === '收起' || action === '展开' ? '' : ' '}${group.name}`}
                                            onClick={() => toggleGroup(group.id)}>
                                            {isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                        </button>
                                        <span className="result-types-text" data-field="groupName" title={group.name || undefined}>{group.name || t('分类名称')}</span>
                                    </div>
                                </td>
                                <td><span className="result-types-text" data-field="id" title={group.id}>{group.id}</span></td>
                                <td colSpan={6}/>
                                {renderActions(group)}
                            </tr>
                            {isExpanded && group.items.map(item => <tr key={item.id} {...reorder.rowProps(item.id)} data-item-id={item.id}>
                                {tableFields.map(([field]) => <td key={field} className={field === 'name' ? 'result-types-name-cell' : undefined}>
                                    {renderField(item, field)}
                                </td>)}
                                {renderActions(group, item)}
                            </tr>)}
                        </Fragment>;
                    })}
                </tbody>
            </table>
            {!groups.length && <div className="empty-state"><FileText size={42}/><h3>{t(term ? '未找到匹配记录' : '暂无数据')}</h3>{term && <p>{t('调整查询条件后重新查询')}</p>}</div>}
        </div>
        <span className="sr-only" role="status" aria-live="polite">{reorder.announcement}</span>
        <footer><span>{t('共 {count} 条', { count })}</span></footer>
        {dialog && <ResultTypeEditor target={dialog} projectTypes={projectTypes} categoryProjectTypes={getCategoryProjectTypes(categoryId, projectTypes)} onClose={() => setDialog(null)} onSubmit={saveEditor}/>}
    </section>;
}
