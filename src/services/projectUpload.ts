import type { ResultDirectory } from './results';
import { loadResultTypes } from './resultTypes';

const normalize = (name: string) => name.trim().replace(/^\d+[\s._、-]+/, '').replace(/[\s_-]/g, '').toLocaleLowerCase();

/** Match the deepest recognized folder, including configured Chinese/English names. */
export function matchUploadDirectory(path: string, directories: ResultDirectory[]): string {
  const names = directories.filter(group => group.name !== '基本信息').flatMap(group => group.items);
  const aliases = new Map<string, Set<string>>();
  const addAlias = (alias: string, name: string) => {
    if (!alias.trim()) return;
    const key = normalize(alias);
    aliases.set(key, new Set([...(aliases.get(key) || []), name]));
  };
  names.forEach(name => addAlias(name, name));
  for (const category of loadResultTypes()) for (const group of category.groups) for (const item of group.items) {
    const name = names.find(candidate => candidate === item.name || candidate === item.chineseDirectory);
    if (name) [item.name, item.chineseDirectory, item.englishDirectory].forEach(alias => addAlias(alias, name));
  }
  for (const folder of path.replace(/\\/g, '/').split('/').slice(0, -1).reverse()) {
    const matches = aliases.get(normalize(folder));
    if (matches?.size === 1) return [...matches][0];
    if (matches && matches.size > 1) return '';
  }
  return '';
}
