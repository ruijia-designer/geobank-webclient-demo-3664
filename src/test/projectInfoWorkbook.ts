import { utils, write } from 'xlsx';

export function projectInfoWorkbook(rows: (string | number | boolean | Date | null)[][], type: 'xlsx' | 'xls' = 'xlsx') {
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), '项目信息');
  return new File([write(workbook, { type: 'array', bookType: type })], 'project.' + type);
}
