export interface BaselineField {
    key: string;
    label: string;
    kind?: 'select' | 'number' | 'date' | 'file' | 'textarea' | 'color';
    options?: string[];
    required?: boolean;
}
export interface BaselineRow {
    id: string;
    name: string;
    parent?: string;
    level?: number;
    [key: string]: string | number | undefined;
}
export interface BaselineConfig {
    id: string;
    title: string;
    description: string;
    columns: [
        string,
        string
    ][];
    fields: BaselineField[];
    rows: BaselineRow[];
    tree?: boolean;
    scan?: boolean;
}
const name: BaselineField = { key: 'name', label: '名称', required: true };
const note: BaselineField = { key: 'note', label: '备注', kind: 'textarea' };
const basin: BaselineField = { key: 'basin', label: '所属盆地', kind: 'select', options: ['百色盆地', '北部湾盆地', '沁水盆地', '四川盆地'] };
const code: BaselineField = { key: 'code', label: '编码' };
const simple = (names: string[], extra: Partial<BaselineRow> = {}): BaselineRow[] => names.map((n, i) => ({ id: String(i + 1), name: n, ...extra }));
const contact = [name, { key: 'address', label: '地址' }, { key: 'phone', label: '联系电话' }, { key: 'email', label: '邮箱' }, note];
const structure: BaselineRow[] = [['百色盆地', '4501', '盆地', 1, ''], ['东部坳陷', '450101', '坳陷', 2, '1'], ['田东凹陷', '', '凹陷', 3, '2'], ['田阳凹陷', '', '凹陷', 3, '2'], ['南部隆起', '450103', '坳陷', 2, '1'], ['靖西凸起', '', '凹陷', 3, '5'], ['西部坳陷', '450102', '坳陷', 2, '1'], ['百色凹陷', '', '凹陷', 3, '7'], ['那坡凹陷', '', '凹陷', 3, '7'], ['北部湾盆地', '8403', '盆地', 1, ''], ['北部坳陷', '840301', '坳陷', 2, '10'], ['福山凹陷', '', '凹陷', 3, '11'], ['海中凹陷', '', '凹陷', 3, '11'], ['涠西南凹陷', '', '凹陷', 3, '11'], ['东部隆起', '840304', '坳陷', 2, '10'], ['涠洲凸起', '', '凹陷', 3, '15'], ['斜阳凸起', '', '凹陷', 3, '15'], ['南部坳陷', '840303', '坳陷', 2, '10'], ['昌化凹陷', '', '凹陷', 3, '18']].map(([n, c, t, l, p], i) => ({ id: String(i + 1), name: String(n), code: String(c), type: String(t), level: Number(l), parent: String(p) }));
export const BASELINE_CONFIGS: BaselineConfig[] = [
    { id: 'types', title: '项目类型', description: '维护最多三级项目分类，分别设置各级类型的显示颜色', tree: true, columns: [['name', '名称'], ['color', '颜色']], fields: [{ key: 'parent', label: '上级类型', kind: 'select', options: [] }, name, { key: 'color', label: '颜色', kind: 'color' }], rows: [{ id: '1', name: '采集', color: '#277DA8', level: 1 }, { id: '2', name: '三维陆上常规采集', color: '#4C92B5', level: 2, parent: '1' }, { id: '3', name: '三维陆上混叠采集', color: '#4B9A88', level: 2, parent: '1' }, { id: '4', name: '二维陆上采集', color: '#8D7BAA', level: 2, parent: '1' }, ...['处理', '解释', '井筒', '非地震'].map((n, i) => ({ id: String(i + 5), name: n, color: ['#2B8C82', '#7B6FA6', '#B38439', '#647C97'][i], level: 1 }))] },
    { id: 'naming', title: '成果类型', description: '维护各类项目成果的分类、目录与命名规则', columns: [], fields: [], rows: [] },
    { id: 'structure', title: '构造单元', description: '维护盆地、坳陷、凹陷与凸起的层级关系', tree: true, columns: [['name', '名称'], ['code', '编码'], ['type', '类型'], ['level', '等级'], ['note', '备注']], fields: [name, code, { key: 'sort', label: '排序值', kind: 'number' }, note], rows: structure },
    { id: 'areas', title: '工区', description: '维护工区名称、空间归属与地表信息', columns: [['name', '名称'], ['code', '代码'], ['basin', '所属盆地'], ['surface', '地表类型'], ['note', '备注']], fields: [name, { key: 'code', label: '工区代码' }, basin, { key: 'surface', label: '地表类型', kind: 'select', options: ['草原', '水域', '河流', '山地', '平原'] }, { key: 'range', label: '范围（GeoJSON）', kind: 'file' }, note], rows: simple(['东台坳陷海安凹陷孙家洼次凹', '东台坳陷白驹凹陷大丰次凹', '东台坳陷白驹凹陷大丰次凹海丰构造', '大丰次凹', '大安区块', '川南低陡褶带南缘YS112井区', '川南低陡褶带南缘云山坝区块', '川南低陡褶带南缘太阳工区', '川南低陡褶带南缘太阳背斜构造', '川南低陡褶带南缘建武向斜西南斜坡']).map((r, i) => ({ ...r, basin: i === 4 ? '四川盆地' : '', surface: i === 3 ? '草原, 水域, 河流' : '' })) },
    { id: 'mining', title: '矿权管理', description: '管理矿权信息、有效期与区块范围记录', columns: [['name', '名称'], ['basin', '盆地'], ['type', '矿权类型'], ['area', '登记面积（km²）']], fields: [name, basin, { key: 'type', label: '矿权类型', kind: 'select', options: ['采矿权', '探矿权'] }, { key: 'code', label: '矿权编号' }, { key: 'owner', label: '权属单位' }, { key: 'start', label: '有效期开始', kind: 'date' }, { key: 'end', label: '有效期结束', kind: 'date' }, note], rows: simple(['白驹油田开采', '海安油田开采', '黄204井区开采', '宜昌地区勘查', '镇雄-毕节勘查', '泰州-姜堰勘查', '筠连-威信勘查', '大安区块']).map((r, i) => ({ ...r, type: i < 3 ? '采矿权' : '探矿权', area: ['16.554', '39.0504', '36.2668', '2502.6312', '3332.801', '837.8994', '4310.2662', '1403.1353'][i] })) },
    { id: 'imagery', title: '遥感影像', description: '配置影像图层、地图服务与显示参数', columns: [['name', '名称'], ['layer', '图层名称'], ['service', '服务类型'], ['url', '服务地址'], ['status', '状态']], fields: [name, { key: 'layer', label: '图层名称' }, { key: 'service', label: '服务类型', kind: 'select', options: ['WMS', 'WMTS', 'XYZ'] }, { key: 'url', label: '服务地址' }, { key: 'opacity', label: '透明度（0–1）', kind: 'number' }, { key: 'sort', label: '显示顺序', kind: 'number' }, { key: 'status', label: '状态', kind: 'select', options: ['启用', '停用'] }], rows: simple(['大安工区遥感卫片', '中国地质分布图']) },
    { id: 'wells', title: '井别', description: '维护井别分类，为井筒数据归档与检索提供依据', columns: [['name', '名称'], ['code', '编码'], ['sort', '排序值'], ['note', '备注']], fields: [name, code, { key: 'sort', label: '排序值', kind: 'number' }, note], rows: [] },
    { id: 'closure', title: '闭合标准', description: '配置闭合差精度标准与容许阈值', columns: [['name', '名称'], ['note', '备注']], fields: [name, ...[['surfaceHeight', '地表高程（m）'], ['datumHeight', '基准面高程（m）'], ['static', '静校正量（ms）'], ['top', '高速顶高程（m）'], ['weather', '风化层速度（m/s）'], ['correct', '校正速度（m/s）'], ['delay', '延迟时（ms）'], ['thickness', '等效厚度（m）']].map(([key, label]): BaselineField => ({ key, label, kind: 'number' })), note], rows: [{ id: '1', name: '大安地图闭合标准', note: '这是该地区通用闭合标准' }] },
    { id: 'datum', title: '基准面', description: '管理高程基准参数与浮动基准面文件', columns: [['name', '名称'], ['basin', '所属盆地'], ['type', '类型'], ['value', '高程值']], fields: [name, basin, { key: 'type', label: '基准面类型', kind: 'select', options: ['水平基准面', '浮动基准面'] }, { key: 'value', label: '高程值（m）', kind: 'number' }, { key: 'grid', label: '网格文件', kind: 'file' }, { key: 'contour', label: '等值线文件', kind: 'file' }], rows: [{ id: '1', name: 'datumTest', type: '水平基准面', value: '0' }] },
    { id: 'velocity', title: '替换速度', description: '维护静校正与速度分析所需的替换速度参数', columns: [['name', '名称'], ['basin', '所属盆地'], ['type', '类型'], ['value', '速度值']], fields: [name, basin, { key: 'type', label: '替换速度类型', kind: 'select', options: ['均一替换速度', '空变替换速度'] }, { key: 'value', label: '速度值（m/s）', kind: 'number' }, { key: 'grid', label: '网格文件', kind: 'file' }, { key: 'contour', label: '等值线文件', kind: 'file' }], rows: [{ id: '1', name: '测试替换速度', type: '均一替换速度', value: '0' }] },
    { id: 'clients', title: '甲方', description: '维护委托单位的基本信息与联系方式', columns: [['name', '名称'], ['address', '地址']], fields: contact, rows: simple(['浙江油田', '胜利油田', '川庆钻探工程有限公司地球物理勘探公司物探研究中心', '大庆油田', '四川页岩气公司', '四川长宁天然气开发有限责任公司', '西南油气田分公司致密油气勘探开发项目部', '长城公司', '中国石油天然气股份有限公司大庆油田有限责任公司勘探事业部', '中国石油天然气股份有限公司吉林油田有限责任公司勘探部']).map((r, i) => ({ ...r, address: i === 0 ? '浙江省杭州市余杭区五常街道荆山湾路9号' : i === 1 ? '山东省东营市东营区济南路258号' : '' })) },
    { id: 'contractors', title: '承包商', description: '维护承担单位的基本信息与联系方式', columns: [['name', '名称'], ['address', '地址']], fields: contact, rows: simple(['北京市海天吉佳科技公司', '川庆钻探工程有限公司地球物理勘探公司', '东方地球物理公司西南物探分公司', '东方地球物理勘探公司大庆物探二公司', '东方公司大庆地球物理勘探一公司', '四川华宇勘探工程有限责任公司', '四川石油地调处', '四川石油管理局地球物理勘探公司', '四川石油管理局地球物理勘探分公司', '四川石油管理局地质调查处']) },
    { id: 'teams', title: '队伍', description: '维护施工队伍及所属承包商关系', columns: [['name', '名称'], ['contractor', '所属承包商']], fields: [name, { key: 'contractor', label: '所属承包商', kind: 'select', options: ['东方物探研究院西南分院', '东方物探新兴物探经理部'] }, note], rows: simple(['2222队', '2211队', '2154队', '239队', '2149队', '2151队', '2202队']).map((r, i) => ({ ...r, contractor: i === 0 ? '东方物探研究院西南分院' : '东方物探新兴物探经理部' })) },
    { id: 'disks', title: '磁盘挂载', description: '配置挂载路径，扫描与查看磁盘数据信息', scan: true, columns: [['name', '名称'], ['path', '挂载路径'], ['scanned', '扫描时间']], fields: [name, { key: 'server', label: '所属服务器', kind: 'select', options: ['昌平G楼', '大庆分院202服务器', '107服务器-主'] }, { key: 'path', label: '挂载路径' }, { key: 'mode', label: '访问模式', kind: 'select', options: ['只读', '读写'] }, { key: 'status', label: '状态', kind: 'select', options: ['启用', '停用'] }], rows: simple(['57服务器-华北-解释项目', '57服务器-冀东-解释项目', '57服务器-处理中心-处理项目', '西南解释项目', 'huawei-diyan_yumen']).map((r, i) => ({ ...r, path: '/home/seismic-bank/mnt/' + ['diyan_huabei', 'diyan_jidong', 'chulizhongxin', 'xinan_jieshi', 'huawei'][i] })) },
    { id: 'servers', title: '服务器管理', description: '维护服务器地址、端口与主节点配置', columns: [['name', '名称'], ['ip', 'IP'], ['port', '端口'], ['primary', '是否主节点'], ['note', '备注']], fields: [name, { key: 'ip', label: 'IP地址' }, { key: 'port', label: '端口', kind: 'number' }, { key: 'primary', label: '是否主节点', kind: 'select', options: ['主节点', '非主节点'] }, { key: 'status', label: '状态', kind: 'select', options: ['启用', '停用'] }, note], rows: [{ id: '1', name: '昌平G楼', primary: '非主节点' }, { id: '2', name: '大庆分院202服务器', primary: '非主节点' }, { id: '3', name: '107服务器-主', ip: '192.158.8.57', port: '8889', primary: '主节点', note: 'ssss' }] }
];
export function baselineFilter(rows: BaselineRow[], query: string, codeQuery: string, tree = false) { const q = query.trim().toLowerCase(), c = codeQuery.trim().toLowerCase(); if (!q && !c)
    return rows; const matches = rows.filter(r => r.name.toLowerCase().includes(q) && String(r.code ?? '').toLowerCase().includes(c)); if (!tree)
    return matches; const ids = new Set(matches.map(r => r.id)); for (const r of matches) {
    let p = r.parent;
    while (p) {
        ids.add(p);
        p = rows.find(x => x.id === p)?.parent;
    }
} return rows.filter(r => ids.has(r.id)); }

export const SORTABLE_BASELINE_IDS = new Set(['types', 'structure', 'areas', 'mining', 'imagery', 'wells']);
export function baselineParentKey(row: Pick<BaselineRow, 'parent'>) { return row.parent || ''; }
export function baselineSiblings(rows: BaselineRow[], row: BaselineRow) {
    return rows.filter(candidate => baselineParentKey(candidate) === baselineParentKey(row));
}

export const MAX_PROJECT_TYPE_LEVEL = 3;
export function baselineDescendantIds(rows: BaselineRow[], rowId: string): Set<string> {
    const ids = new Set([rowId]);
    let previous = 0;
    while (ids.size !== previous) {
        previous = ids.size;
        for (const row of rows) if (row.parent && ids.has(row.parent)) ids.add(row.id);
    }
    return ids;
}
export function baselinePath(rows: BaselineRow[], rowId: string): string {
    const names: string[] = [], visited = new Set<string>();
    let row = rows.find(candidate => candidate.id === rowId);
    while (row && !visited.has(row.id)) {
        visited.add(row.id);
        names.unshift(row.name);
        row = row.parent ? rows.find(candidate => candidate.id === row!.parent) : undefined;
    }
    return names.join(' / ');
}
export function projectTypeParentOptions(rows: BaselineRow[], rowId: string) {
    const descendants = baselineDescendantIds(rows, rowId);
    return rows.filter(row => (row.level || 1) < MAX_PROJECT_TYPE_LEVEL && !descendants.has(row.id))
        .map(row => ({ value: row.id, label: baselinePath(rows, row.id) }));
}
export function projectTypeParentError(rows: BaselineRow[], record: BaselineRow): string {
    if (!record.parent) return '';
    const parent = rows.find(row => row.id === record.parent);
    if (!parent) return '请选择有效的上级类型';
    if (baselineDescendantIds(rows, record.id).has(parent.id)) return '上级类型不能是自身或下级类型';
    const depth = (id: string, visited = new Set<string>()): number => {
        if (visited.has(id)) return 0;
        const nextVisited = new Set(visited).add(id);
        return 1 + Math.max(0, ...rows.filter(row => row.parent === id).map(row => depth(row.id, nextVisited)));
    };
    return (parent.level || 1) + depth(record.id) > MAX_PROJECT_TYPE_LEVEL
        ? '项目类型最多支持三级，请选择更高一级的上级类型' : '';
}

/** Keep sibling order authoritative, flatten trees without separating their descendants. */
export function normalizeBaselineOrder(id: string, rows: BaselineRow[]): BaselineRow[] {
    if (!SORTABLE_BASELINE_IDS.has(id)) return rows.map(row => ({ ...row }));
    const config = BASELINE_CONFIGS.find(candidate => candidate.id === id);
    const hasSortField = config?.fields.some(field => field.key === 'sort');
    const groups = new Map<string, BaselineRow[]>();
    for (const row of rows) {
        const parent = config?.tree ? baselineParentKey(row) : '';
        const siblings = groups.get(parent) || [];
        siblings.push({ ...row, ...(config?.tree ? { parent } : {}) });
        groups.set(parent, siblings);
    }
    if (hasSortField) for (const siblings of groups.values()) {
        siblings.forEach((row, index) => { row.sort = index + 1; });
    }
    if (!config?.tree) return groups.get('') || [];
    const ordered: BaselineRow[] = [], visited = new Set<string>();
    const append = (row: BaselineRow, parentLevel = 0) => {
        if (visited.has(row.id)) return;
        visited.add(row.id);
        if (id === 'types') row.level = parentLevel + 1;
        ordered.push(row);
        for (const child of groups.get(row.id) || []) append(child, row.level || parentLevel + 1);
    };
    for (const root of groups.get('') || []) append(root);
    // Retain incomplete external data rather than silently dropping an orphan node.
    for (const siblings of groups.values()) for (const row of siblings) append(row);
    return ordered;
}

export function moveBaselineRow(id: string, rows: BaselineRow[], rowId: string, direction: -1 | 1): BaselineRow[] {
    if (!SORTABLE_BASELINE_IDS.has(id)) return rows;
    const ordered = normalizeBaselineOrder(id, rows);
    const row = ordered.find(candidate => candidate.id === rowId);
    if (!row) return rows;
    const siblings = baselineSiblings(ordered, row);
    const position = siblings.findIndex(candidate => candidate.id === rowId);
    const target = siblings[position + direction];
    if (!target) return rows;
    const currentIndex = ordered.findIndex(candidate => candidate.id === rowId);
    const targetIndex = ordered.findIndex(candidate => candidate.id === target.id);
    [ordered[currentIndex], ordered[targetIndex]] = [ordered[targetIndex], ordered[currentIndex]];
    return normalizeBaselineOrder(id, ordered);
}

/** A manual sort value is a 1-based position within the same parent, not a global tree position. */
export function placeBaselineRow(id: string, rows: BaselineRow[], record: BaselineRow, position?: number): BaselineRow[] {
    const without = rows.filter(row => row.id !== record.id);
    const nextRecord = { ...record, ...(BASELINE_CONFIGS.find(config => config.id === id)?.tree ? { parent: baselineParentKey(record) } : {}) };
    if (!SORTABLE_BASELINE_IDS.has(id)) {
        const previousIndex = rows.findIndex(row => row.id === record.id);
        without.splice(previousIndex < 0 ? without.length : previousIndex, 0, nextRecord);
        return without;
    }
    const siblings = baselineSiblings(without, nextRecord);
    const previous = rows.find(row => row.id === record.id);
    const oldPosition = previous && baselineParentKey(previous) === baselineParentKey(nextRecord)
        ? baselineSiblings(rows, previous).findIndex(row => row.id === record.id) : siblings.length;
    const destination = position === undefined || !Number.isFinite(position)
        ? oldPosition : Math.max(0, Math.min(siblings.length, Math.trunc(position) - 1));
    const before = siblings[destination];
    without.splice(before ? without.findIndex(row => row.id === before.id) : without.length, 0, nextRecord);
    return normalizeBaselineOrder(id, without);
}

export const demoRows: Record<string, BaselineRow[]> = Object.fromEntries(BASELINE_CONFIGS.map(c => [c.id, normalizeBaselineOrder(c.id, c.rows)]));
// This demo cache intentionally lives only for the current browser session.
export function saveBaselineRows(id: string, rows: BaselineRow[]) {
    demoRows[id] = normalizeBaselineOrder(id, rows);
    return demoRows[id];
}
