// Shared Excel workbook builder — no Node/Electron dependencies (exceljs via bundler).
import ExcelJS from 'exceljs';
import {
  exportTakenParticularsLabel,
  exportTakenHasDates,
  exportEarnedHasDates,
  exportEarnedFromText,
  exportEarnedNeedsDaysFallback,
  exportEarnedDaysFallback,
} from './exportParticulars';
import { ENTRY_TYPES } from './plRules';

const THIN = { style: 'thin', color: { argb: 'FF9C9484' } };
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

export function buildWorkbook({ employee, rows }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PL Balance Register';
  const ws = wb.addWorksheet(sheetName(employee.name), {
    pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  ws.columns = [
    { width: 6 }, { width: 12 }, { width: 12 }, { width: 9 }, { width: 10 },
    { width: 8 }, { width: 22 }, { width: 12 }, { width: 9 }, { width: 8 },
  ];

  ws.mergeCells('A1:J1');
  ws.getCell('A1').value = 'PL BALANCE STATEMENT';
  ws.getCell('A1').font = { name: 'Times New Roman', size: 14, bold: true };
  ws.getCell('A1').alignment = { horizontal: 'center' };

  ws.mergeCells('A2:J2');
  ws.getCell('A2').value = `${employee.name}${employee.designation ? '  —  ' + employee.designation : ''}`;
  ws.getCell('A2').font = { name: 'Times New Roman', size: 12, bold: true };
  ws.getCell('A2').alignment = { horizontal: 'center' };

  ws.mergeCells('B4:F4');
  ws.getCell('B4').value = 'Earned';
  ws.mergeCells('G4:J4');
  ws.getCell('G4').value = 'Taken';
  ['B4', 'G4'].forEach((c) => {
    ws.getCell(c).font = { name: 'Arial', size: 10, bold: true };
    ws.getCell(c).alignment = { horizontal: 'center' };
    ws.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE7D8' } };
    ws.getCell(c).border = BORDER;
  });

  const headers = ['Sr No.', 'From', 'To', 'No. of Days', 'PL Earned', 'Bal.', 'From / Particulars', 'To', 'PL Taken', 'Bal.'];
  const hr = ws.getRow(5);
  headers.forEach((h, i) => {
    const cell = hr.getCell(i + 1);
    cell.value = h;
    cell.font = { name: 'Arial', size: 9, bold: true };
    cell.alignment = { horizontal: 'center', wrapText: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEDE7D8' } };
    cell.border = BORDER;
  });

  const START = 6;
  rows.forEach((r, i) => {
    const rowIdx = START + i;
    const row = ws.getRow(rowIdx);
    row.getCell(1).value = i + 1;

    // Earned side — dates only; no app-internal labels
    if (exportEarnedHasDates(r)) {
      row.getCell(2).value = toDate(r.earnedFrom);
      row.getCell(3).value = toDate(r.earnedTo);
      row.getCell(4).value = { formula: `C${rowIdx}-B${rowIdx}+1` };
    } else if (exportEarnedNeedsDaysFallback(r)) {
      const fromText = exportEarnedFromText(r);
      if (fromText) row.getCell(2).value = fromText;
      row.getCell(4).value = exportEarnedDaysFallback(r);
    }

    const exportEarned = r.lapsed > 0 ? r.effectiveCredit : (Number(r.plEarned) || 0);
    row.getCell(5).value = exportEarned;
    if (i === 0) {
      row.getCell(6).value = { formula: `E${rowIdx}` };
    } else {
      row.getCell(6).value = { formula: `E${rowIdx}+J${rowIdx - 1}` };
    }

    // Taken side — type whitelist only
    if (exportTakenHasDates(r)) {
      row.getCell(7).value = toDate(r.takenFrom);
      row.getCell(8).value = toDate(r.takenTo);
      row.getCell(9).value = { formula: `H${rowIdx}-G${rowIdx}+1` };
    } else {
      const label = exportTakenParticularsLabel(r);
      if (label) row.getCell(7).value = label;
      row.getCell(9).value = Number(r.plTaken) || 0;
    }
    row.getCell(10).value = { formula: `F${rowIdx}-I${rowIdx}` };

    [2, 3].forEach((c) => {
      if (row.getCell(c).value instanceof Date) row.getCell(c).numFmt = 'dd-mm-yyyy';
    });
    [7, 8].forEach((c) => {
      if (row.getCell(c).value instanceof Date) row.getCell(c).numFmt = 'dd-mm-yyyy';
    });
    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c);
      cell.border = BORDER;
      cell.font = cell.font || { name: 'Arial', size: 9 };
      if ([1, 4, 5, 6, 9, 10].includes(c)) cell.alignment = { horizontal: 'center' };
    }
    if (r.type === ENTRY_TYPES.PL_SURRENDER && r.label) {
      row.getCell(7).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF8A2B21' } };
    }
    if (r.atCap) {
      row.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3C4' } };
    }
  });

  const endRow = START + rows.length + 1;
  ws.mergeCells(`A${endRow}:I${endRow}`);
  ws.getCell(`A${endRow}`).value = 'PL Balance as on date';
  ws.getCell(`A${endRow}`).font = { name: 'Arial', size: 10, bold: true };
  ws.getCell(`A${endRow}`).alignment = { horizontal: 'right' };
  ws.getCell(`J${endRow}`).value = rows.length ? { formula: `J${START + rows.length - 1}` } : 0;
  ws.getCell(`J${endRow}`).font = { name: 'Arial', size: 10, bold: true };
  ws.getCell(`J${endRow}`).border = BORDER;

  return wb;
}

function toDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function sheetName(name) {
  return String(name || 'PL Register').replace(/[\\/*?:\[\]]/g, '').slice(0, 31) || 'PL Register';
}

export function sanitizeFileName(name) {
  return String(name || 'employee').replace(/[^\w\u0900-\u097F -]+/g, '').trim().replace(/\s+/g, '-');
}
