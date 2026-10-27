import type { ApplicableProjectType, ResultTypeItem } from './resultTypes';
import type { ProjectTypeOption } from './projectClassification';

type ApplicableProjects = Pick<ResultTypeItem, 'applicableProjects' | 'applicableProjectTypes'>;

/** Keep saved associations attached to baseline IDs, retaining names for removed types. */
export function applicableProjectSelections(item: ApplicableProjects, options: ProjectTypeOption[]): ApplicableProjectType[] {
    if (item.applicableProjectTypes) return item.applicableProjectTypes.map(value => ({
        ...value, name: options.find(option => option.id === value.id)?.name ?? value.name,
    }));
    // Older drafts used free text. Preserve every value until the user changes it.
    return item.applicableProjects.split(/\r?\n/).filter(name => name.trim()).map(name => {
        const option = options.find(entry => entry.name === name || entry.path.join(' / ') === name);
        return option ? { id: option.id, name: option.name } : { name };
    });
}

export function applicableProjectsLabel(item: ApplicableProjects, options: ProjectTypeOption[]): string {
    return item.applicableProjectTypes
        ? applicableProjectSelections(item, options).map(value => value.name).join('\n')
        : item.applicableProjects;
}
