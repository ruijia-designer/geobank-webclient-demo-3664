import { Fragment, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, FileText } from 'lucide-react';
import { useTranslation } from '../i18n';
import { loadResultTypes, saveResultTypes } from '../services/resultTypes';
import type { ResultTypeCategoryId, ResultTypeItem } from '../services/resultTypes';
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

const defaultEditorHeight = 50;

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
    const [editorHeights, setEditorHeights] = useState<Record<string, number>>({});
    const tableRef = useRef<HTMLTableElement>(null);
    const term = query.trim().toLocaleLowerCase();
    const category = categories.find(entry => entry.id === categoryId)!;

    // Keep the submitted result set stable while its fields are edited. A new
    // submission (including the same keyword) searches the latest draft values.
    useEffect(() => {
        setSearchCollapsed({});
        setMatchedIds(new Set(category.groups.flatMap(group =>
            !term || group.name.toLocaleLowerCase().includes(term) ? group.items.map(item => item.id)
                : group.items.filter(item => fields.some(([field]) => item[field].toLocaleLowerCase().includes(term))).map(item => item.id))));
    }, [query, queryVersion, categoryId]);

    const groups = category.groups.map(group => ({
        ...group,
        items: !term ? group.items : group.items.filter(item => matchedIds.has(item.id)),
    })).filter(group => group.items.length > 0);
    const count = groups.reduce((total, group) => total + group.items.length, 0);
    const visibleEditorRows = groups.flatMap(group => [group.id,
        ...(!(term ? searchCollapsed[group.id] : collapsed[group.id]) ? group.items.map(item => item.id) : []),
    ]).join('|');

    // Native textarea resizing changes one control. Apply that height to its
    // whole row and retain it when the category or collapsed state changes.
    useEffect(() => {
        if (typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(entries => {
            setEditorHeights(previous => {
                let next = previous;
                for (const entry of entries) {
                    const editor = entry.target as HTMLTextAreaElement;
                    const rowId = editor.dataset.editorRow!;
                    const height = Math.max(defaultEditorHeight, Math.round(editor.getBoundingClientRect().height));
                    if (height !== (previous[rowId] ?? defaultEditorHeight)) {
                        if (next === previous) next = { ...previous };
                        next[rowId] = height;
                    }
                }
                return next;
            });
        });
        tableRef.current?.querySelectorAll('textarea').forEach(editor => observer.observe(editor));
        return () => observer.disconnect();
    }, [visibleEditorRows]);

    const updateGroup = (groupId: string, name: string) => setCategories(previous => previous.map(entry =>
        entry.id !== categoryId ? entry : {
            ...entry, groups: entry.groups.map(group => group.id === groupId ? { ...group, name } : group),
        }));
    const updateItem = (groupId: string, itemId: string, field: ItemField, value: string) => setCategories(previous => previous.map(entry =>
        entry.id !== categoryId ? entry : {
            ...entry, groups: entry.groups.map(group => group.id !== groupId ? group : {
                ...group, items: group.items.map(item => item.id === itemId ? { ...item, [field]: value } : item),
            }),
        }));
    const toggleGroup = (groupId: string) => {
        const update = term ? setSearchCollapsed : setCollapsed;
        update(previous => ({ ...previous, [groupId]: !previous[groupId] }));
    };
    const inputPlaceholder = (field: ItemField) => field === 'name' ? t('二级分类名称')
        : field === 'number' ? t('请输入序号') : field === 'namingRule' ? t('请输入命名规则') : '';
    const renderField = (groupId: string, groupName: string, item: ResultTypeItem, field: ItemField, label: string) => {
        const attributes = {
            'aria-label': `${category.name} / ${groupName} / ${item.name || t('二级分类名称')} / ${t(label)}`,
            'data-field': field,
            value: item[field],
            placeholder: inputPlaceholder(field),
        };
        return <textarea {...attributes} rows={2} wrap="soft" data-editor-row={item.id}
            style={{ height: editorHeights[item.id] ?? defaultEditorHeight }}
            onChange={event => updateItem(groupId, item.id, field, event.target.value)}/>;
    };

    return <section className="card baseline-list result-types-panel" data-baseline="naming">
        <header>
            <h2>{t('项目成果类型')}</h2>
            <div>
                <select aria-label={t('数据类别')} value={categoryId} onChange={event => {
                    setCategoryId(event.target.value as ResultTypeCategoryId);
                    onCategoryChange();
                }}>
                    {categories.map(entry => <option key={entry.id} value={entry.id}>{t(entry.name)}</option>)}
                </select>
                <button className="button primary" onClick={() => { saveResultTypes(categories); onSave(); }}>{t('保存')}</button>
            </div>
        </header>
        <div className="table-wrap result-types-scroll" role="region" aria-label={t('成果类型列表')} tabIndex={0}>
            <table ref={tableRef} className="result-types-table">
                <colgroup>
                    {fields.map(([field]) => <col key={field} className={`result-types-column-${field}`}/>)}
                </colgroup>
                <thead><tr>{fields.map(([field, label]) => <th scope="col" key={field}>{t(field === 'name' ? `${category.name}项目` : label)}</th>)}</tr></thead>
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
                                        <textarea aria-label={`${category.name} / ${group.name} / ${t('名称')}`} data-field="groupName"
                                            rows={2} wrap="soft" data-editor-row={group.id} style={{ height: editorHeights[group.id] ?? defaultEditorHeight }}
                                            placeholder={t('请输入名称')} value={group.name} onChange={event => updateGroup(group.id, event.target.value)}/>
                                    </div>
                                </td>
                                <td colSpan={6}/>
                            </tr>
                            {isExpanded && group.items.map(item => <tr key={item.id} data-item-id={item.id}>
                                {fields.map(([field, label]) => <td key={field} className={field === 'name' ? 'result-types-name-cell' : undefined}>
                                    {renderField(group.id, group.name, item, field, label)}
                                </td>)}
                            </tr>)}
                        </Fragment>;
                    })}
                </tbody>
            </table>
            {!count && <div className="empty-state"><FileText size={42}/><h3>{t('未找到匹配记录')}</h3><p>{t('调整查询条件后重新查询')}</p></div>}
        </div>
        <footer><span>{t('共 {count} 条', { count })}</span><span>{t('编辑后点击保存')}</span></footer>
    </section>;
}
