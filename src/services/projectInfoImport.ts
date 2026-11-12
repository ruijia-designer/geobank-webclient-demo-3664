import { read, SSF, utils } from 'xlsx';
import type { CellObject, WorkBook, WorkSheet } from 'xlsx';
import type { TranslationParams } from '../locales/context';

type Translate = (text: string, params?: TranslationParams) => string;
type InfoField = [key: string, label: string];

const normalize = (text: string) => text.normalize('NFKC').replace(/\s+/g, '').toLowerCase();

function fileBytes(file: File): Promise<ArrayBuffer> {
  const reader = new FileReader();
  return new Promise((resolve, reject) => {
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function worksheetRows(sheet: WorkSheet): CellObject[][] {
  // Iterate actual cells. A formatted but empty range may cover the entire sheet.
  const rows = new Map<number, CellObject[]>();
  for (const [address, cell] of Object.entries(sheet)) {
    if (address.startsWith('!') || (!cell.f && (cell.v == null || String(cell.v).trim() === ''))) continue;
    const { r, c } = utils.decode_cell(address);
    const row = rows.get(r) ?? [];
    row[c] = cell;
    rows.set(r, row);
  }
  return [...rows.entries()].sort(([a], [b]) => a - b).map(([, cells]) => cells);
}

function dateValue(value: unknown, date1904: boolean): string | undefined {
  let year: number, month: number, day: number;
  if (typeof value === 'number') {
    const date = SSF.parse_date_code(value, { date1904 });
    if (!date) return;
    ({ y: year, m: month, d: day } = date);
  } else {
    const parts = String(value).trim().match(/^(\d{4})[-./年](\d{1,2})[-./月](\d{1,2})日?$/);
    if (!parts) return;
    [, year, month, day] = parts.map(Number);
  }
  const check = new Date(Date.UTC(year, month - 1, day));
  if (year < 1000 || year > 9999 || check.getUTCFullYear() !== year || check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day) return;
  return check.toISOString().slice(0, 10);
}

export async function readProjectInfoWorkbook(file: File, fields: InfoField[],
  choicesFor: (key: string) => string[] | undefined, t: Translate): Promise<Record<string, string>> {
  if (!/\.xlsx?$/i.test(file.name)) throw new Error(t('请选择 Excel 文件（.xls 或 .xlsx）'));
  let workbook: WorkBook;
  try {
    const bytes = new Uint8Array(await fileBytes(file));
    const signature = /\.xlsx$/i.test(file.name) ? [0x50, 0x4b, 0x03, 0x04] : [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
    if (!signature.every((byte, i) => bytes[i] === byte)) throw new Error();
    workbook = read(bytes, { type: 'array', sheets: 0, cellHTML: false, cellStyles: false });
  } catch {
    throw new Error(t('无法读取 Excel 文件，请检查文件格式及是否加密。'));
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = sheet ? worksheetRows(sheet) : [];
  const aliases = new Map<string, InfoField>();
  for (const field of fields) {
    for (const alias of [field[0], field[1], t(field[1])]) aliases.set(normalize(alias), field);
  }
  const fieldFor = (cell?: CellObject) => aliases.get(normalize(String(cell?.v ?? '')));
  const start = rows.findIndex(row => row.some(cell => fieldFor(cell)));
  const missing = () => new Error(t('未找到可导入的项目信息，请检查字段名和数据。'));
  if (start < 0) throw missing();
  const header = rows[start];
  const below = rows.slice(start + 1);
  const first = header.findIndex(cell => cell != null);
  const matched = header.filter(cell => fieldFor(cell)).length;
  const vertical = matched === 1 && fieldFor(header[first])
    && (below.some(row => fieldFor(row[first])) || (below.length === 0 && header[first + 1]));

  const result: Record<string, string> = {};
  const assign = (field: InfoField | undefined, cell?: CellObject) => {
    if (!field || field[0] === 'basin' || !cell) return;
    const [key, label] = field;
    const fieldError = (reason: string) => new Error(t('{field}：{reason}', { field: t(label), reason: t(reason) }));
    if (cell.t === 'e' || (cell.f && cell.v == null)) throw fieldError('单元格没有有效的计算结果');
    let value = String(cell.v ?? '').trim();
    if (!value) return;
    if (key === 'start' || key === 'end') {
      const date = dateValue(cell.v, !!workbook.Workbook?.WBProps?.date1904);
      if (!date) throw fieldError('请输入有效日期');
      value = date;
    }
    const choices = choicesFor(key);
    if (choices) {
      const choice = choices.find(option => [option, t(option)].some(alias => normalize(alias) === normalize(value)));
      if (choice === undefined) throw fieldError('请选择有效选项');
      value = choice;
    }
    if (Object.hasOwn(result, key)) throw fieldError('字段重复');
    result[key] = value;
  };
  if (vertical) {
    for (const row of rows.slice(start)) assign(fieldFor(row[first]), row[first + 1]);
  } else {
    const data = below.filter(row => header.some((cell, col) => fieldFor(cell) && row[col]));
    if (data.length > 1) throw new Error(t('请在表头下只填写一个项目的数据。'));
    if (data.length) header.forEach((cell, col) => assign(fieldFor(cell), data[0][col]));
  }
  if (!Object.keys(result).length) throw missing();
  return result;
}
