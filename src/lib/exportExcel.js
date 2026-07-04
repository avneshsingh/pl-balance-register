import { buildWorkbook, sanitizeFileName } from './buildWorkbook';

/** Build .xlsx ArrayBuffer from employee ledger rows */
export async function excelBufferFromPayload(payload) {
  const wb = buildWorkbook(payload);
  return wb.xlsx.writeBuffer();
}

/** Trigger browser download of an Excel file */
export function downloadExcelBuffer(buffer, employeeName) {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `PL-Balance-${sanitizeFileName(employeeName)}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export { sanitizeFileName };
