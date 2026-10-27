import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, FileText, Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '../i18n';
import { Modal } from './Modal';
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
type ItemField = typeof fields[number][0];
type ItemValues = Omit<ResultTypeItem, 'id'>;
type EditorTarget = { kind: 'group'; group?: ResultTypeGroup }
    | { kind: 'item'; groupId: string; item?: ResultTypeItem };
type DialogTarget = EditorTarget | { kind: 'delete'; group: ResultTypeGroup; item?: ResultTypeItem };

const emptyItem: ItemValues = { name: '', applicableProjects: '', number: '', chineseDirectory: '', englishDirectory: '', namingRule: '', notes: '' };

function moveSibling<T extends { id: string }>(siblings: T[], id: string, direction: -1 | 1): T[] {
    const index = siblings.findIndex(entry => entry.id === id);
    const destination = index + direction;
    if (index < 0 || destination < 0 || destination >= siblings.length) return siblings;
    const next = [...siblings];
    [next[index], next[destination]] = [next[destination], next[index]];
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
        ? { ...emptyItem, name: target.group?.name ?? '' }
        : scopeApplicableProjects({ ...emptyItem, ...target.item }, categoryProjectTypes, projectTypes));
    const [nameError, setNameError] = useState(false);
    const isEdit = target.kind === 'group' ? !!target.group : !!target.item;
    const nameRequired = target.kind === 'group' || !isEdit;
    const title = target.kind === 'group' ? (isEdit ? '编辑分类' : '新增分类') : (isEdit ? '编辑成果项' : '新增成果项');
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
    const [dialog, setDialog] = useState<DialogTarget | null>(null);
    const [focusRowId, setFocusRowId] = useState<string | null>(null);
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
        setMatchedGroupIds(new Set(category.groups.filter(group => group.name.toLocaleLowerCase().includes(term)).map(group => group.id)));
        setMatchedIds(new Set(category.groups.flatMap(group =>
            !term || group.name.toLocaleLowerCase().includes(term) ? group.items.map(item => item.id)
                : group.items.filter(item => fields.some(([field]) => fieldValue(item, field).toLocaleLowerCase().includes(term))).map(item => item.id))));
    }, [query, queryVersion, categoryId]);

    const groups = category.groups.map(group => ({
        ...group,
        items: !term ? group.items : group.items.filter(item => matchedIds.has(item.id)),
    })).filter(group => !term || group.items.length > 0 || matchedGroupIds.has(group.id));
    const count = groups.reduce((total, group) => total + group.items.length, 0);
    const visibleRows = groups.flatMap(group => [group.id,
        ...(!(term ? searchCollapsed[group.id] : collapsed[group.id]) ? group.items.map(item => item.id) : []),
    ]).join('|');

    useEffect(() => {
        if (!focusRowId || term) return;
        const row = Array.from(tableRef.current?.querySelectorAll<HTMLTableRowElement>('tbody tr') ?? [])
            .find(element => (element.dataset.itemId ?? element.dataset.groupId) === focusRowId);
        if (!row) return;
        row.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        row.querySelector<HTMLButtonElement>('.action-edit')?.focus({ preventScroll: true });
        if (tableRef.current?.parentElement) tableRef.current.parentElement.scrollLeft = 0;
        setFocusRowId(null);
    }, [focusRowId, term, visibleRows]);

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
        if (!dialog || dialog.kind === 'delete') return;
        if (dialog.kind === 'group') {
            if (dialog.group) updateGroups(previous => previous.map(group => group.id === dialog.group!.id ? { ...group, name: values.name } : group));
            else {
                const id = `${categoryId}-group-${crypto.randomUUID()}`;
                updateGroups(previous => [...previous, { id, name: values.name, items: [] }]);
                onCategoryChange();
                setFocusRowId(id);
            }
        } else {
            const item = { ...values, id: dialog.item?.id ?? `${categoryId}-item-${crypto.randomUUID()}` };
            updateGroups(previous => previous.map(group => {
                if (group.id !== dialog.groupId) return group;
                if (dialog.item) return { ...group, items: group.items.map(entry => entry.id === item.id ? item : entry) };
                return { ...group, items: [...group.items, item] };
            }));
            if (!dialog.item) {
                setCollapsed(previous => ({ ...previous, [dialog.groupId]: false }));
                onCategoryChange();
                setFocusRowId(item.id);
            }
        }
        setDialog(null);
        onSave();
    };
    const move = (groupId: string, direction: -1 | 1, itemId?: string) => updateGroups(previous => itemId
        ? previous.map(group => group.id === groupId ? { ...group, items: moveSibling(group.items, itemId, direction) } : group)
        : moveSibling(previous, groupId, direction));
    const remove = () => {
        if (!dialog || dialog.kind !== 'delete') return;
        updateGroups(previous => dialog.item
            ? previous.map(group => group.id === dialog.group.id ? { ...group, items: group.items.filter(item => item.id !== dialog.item!.id) } : group)
            : previous.filter(group => group.id !== dialog.group.id));
        setDialog(null);
    };
    const renderActions = (group: ResultTypeGroup, item?: ResultTypeItem) => {
        const fullGroup = category.groups.find(entry => entry.id === group.id)!;
        const siblings = item ? fullGroup.items : category.groups;
        const index = siblings.findIndex(entry => entry.id === (item?.id ?? group.id));
        const name = item ? item.name || t('二级分类名称') : group.name || t('分类名称');
        return <td className="baseline-actions-cell result-types-actions"><div className="row-actions baseline-row-actions">
            {!item && <button className="icon-button action-add" type="button" title={t('新增下级')}
                aria-label={t('新增{name}下级', { name })}
                onClick={() => setDialog({ kind: 'item', groupId: group.id })}><Plus size={18}/></button>}
            <button className="icon-button action-edit" type="button" title={t('编辑')} aria-label={t('编辑{name}', { name })}
                onClick={() => setDialog(item ? { kind: 'item', groupId: group.id, item } : { kind: 'group', group: fullGroup })}><Pencil size={18}/></button>
            <button className="icon-button action-up" type="button" title={t('上移')} aria-label={t('上移{name}', { name })}
                disabled={index === 0} onClick={() => move(group.id, -1, item?.id)}><ArrowUp size={18}/></button>
            <button className="icon-button action-down" type="button" title={t('下移')} aria-label={t('下移{name}', { name })}
                disabled={index === siblings.length - 1} onClick={() => move(group.id, 1, item?.id)}><ArrowDown size={18}/></button>
            <button className="icon-button danger action-delete" type="button" title={t('删除')} aria-label={t('删除{name}', { name })}
                onClick={() => setDialog({ kind: 'delete', group: fullGroup, item })}><Trash2 size={18}/></button>
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
                <button className="button" onClick={() => setDialog({ kind: 'group' })}><Plus size={16}/>{t('新增分类')}</button>
            </div>
        </header>
        <div className="table-wrap result-types-scroll" role="region" aria-label={t('成果类型列表')} tabIndex={0}
            data-scrolled-left={scrolledLeft} onScroll={event => setScrolledLeft(event.currentTarget.scrollLeft > 0)}>
            <table ref={tableRef} className="result-types-table">
                <colgroup>
                    {fields.map(([field]) => <col key={field} className={`result-types-column-${field}`}/>)}
                    <col className="result-types-column-actions"/>
                </colgroup>
                <thead><tr>{fields.map(([field, label]) => <th scope="col" key={field}>{t(field === 'name' ? `${category.name}项目` : label)}</th>)}
                    <th scope="col" className="baseline-actions-heading result-types-actions">{t('操作')}</th>
                </tr></thead>
                <tbody>
                    {groups.map(group => {
                        const isExpanded = !(term ? searchCollapsed[group.id] : collapsed[group.id]);
                        const action = t(isExpanded ? '收起' : '展开');
                        return <Fragment key={group.id}>
                            <tr className="result-types-group" data-group-id={group.id}>
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
                                <td colSpan={6}/>
                                {renderActions(group)}
                            </tr>
                            {isExpanded && group.items.map(item => <tr key={item.id} data-item-id={item.id}>
                                {fields.map(([field]) => <td key={field} className={field === 'name' ? 'result-types-name-cell' : undefined}>
                                    {renderField(item, field)}
                                </td>)}
                                {renderActions(group, item)}
                            </tr>)}
                        </Fragment>;
                    })}
                </tbody>
            </table>
            {!groups.length && <div className="empty-state"><FileText size={42}/><h3>{t(term ? '未找到匹配记录' : '暂无数据')}</h3><p>{t(term ? '调整查询条件后重新查询' : '新增后可在此查看与维护')}</p></div>}
        </div>
        <footer><span>{t('共 {count} 条', { count })}</span><span>{t('修改即时生效，刷新页面恢复初始数据')}</span></footer>
        {dialog && (dialog.kind === 'delete' ? <Modal title={t(dialog.item ? '删除成果项' : '删除分类')} onClose={() => setDialog(null)} footer={<>
            <button className="button" onClick={() => setDialog(null)}>{t('取消')}</button>
            <button className="button danger-primary" onClick={remove}>{t('确认删除')}</button>
        </>}>
            <p>{t('确定删除“{name}”吗？', { name: dialog.item ? dialog.item.name || t('二级分类名称') : dialog.group.name || t('分类名称') })}
                {!dialog.item && dialog.group.items.length > 0 && t('其下级记录也将删除。')}</p>
        </Modal> : <ResultTypeEditor target={dialog} projectTypes={projectTypes} categoryProjectTypes={getCategoryProjectTypes(categoryId, projectTypes)} onClose={() => setDialog(null)} onSubmit={saveEditor}/>)}
    </section>;
}
