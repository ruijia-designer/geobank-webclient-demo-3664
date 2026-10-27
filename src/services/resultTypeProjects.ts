import type { ApplicableProjectType, ResultTypeCategoryId, ResultTypeItem } from './resultTypes';
import type { ProjectTypeOption } from './projectClassification';
import { baselineDescendantIds, demoRows } from './baseline';

type ApplicableProjects = Pick<ResultTypeItem, 'applicableProjects' | 'applicableProjectTypes'>;

// The five result categories stay linked to their baseline root even after a rename.
const projectRootIds: Record<ResultTypeCategoryId, string> = {
    acquisition: '1', processing: '5', interpretation: '6', wellbore: '7', nonseismic: '8',
};

export function getCategoryProjectTypes(categoryId: ResultTypeCategoryId, options: ProjectTypeOption[]): ProjectTypeOption[] {
    const ids = baselineDescendantIds(demoRows.types, projectRootIds[categoryId]);
    return options.filter(option => ids.has(option.id));
}

/** Keep saved associations attached to baseline IDs, retaining names for removed types. */
export function applicableProjectSelections(item: ApplicableProjects, options: ProjectTypeOption[]): ApplicableProjectType[] {
    if (item.applicableProjectTypes) return item.applicableProjectTypes.map(value => ({
        ...value, name: options.find(option => option.id === value.id)?.name ?? value.name,
    }));
    // Older drafts used free text. Preserve every value until the user changes it.
    return item.applicableProjects.split(/\r?\n/).filter(name => name.trim()).map(name => {
        const matches = options.filter(entry => entry.name === name || entry.path.join(' / ') === name);
        const option = matches.length === 1 ? matches[0] : undefined;
        return option ? { id: option.id, name: option.name } : { name };
    });
}

export function applicableProjectsLabel(item: ApplicableProjects, options: ProjectTypeOption[]): string {
    return item.applicableProjectTypes
        ? applicableProjectSelections(item, options).map(value => value.name).join('\n')
        : item.applicableProjects;
}

/** Restrict known associations in the editor draft; cancelling leaves the stored row intact. */
export function scopeApplicableProjects<T extends ApplicableProjects>(item: T, options: ProjectTypeOption[], allOptions: ProjectTypeOption[]): T {
    const selected = applicableProjectSelections(item, allOptions);
    const knownIds = new Set(allOptions.map(option => option.id));
    const allowedIds = new Set(options.map(option => option.id));
    const scoped = selected.filter(value => !value.id || !knownIds.has(value.id) || allowedIds.has(value.id));
    return scoped.length === selected.length ? item : {
        ...item, applicableProjectTypes: scoped, applicableProjects: scoped.map(value => value.name).join('\n'),
    };
}
