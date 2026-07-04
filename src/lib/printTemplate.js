import { fmtDate } from './plRules';
import { exportTakenParticularsLabel, exportTakenHasDates, exportEarnedHasDates } from './exportParticulars';

/** Export rows — no lapse annotations, no app-internal labels */
export function buildPrintHtml(employee, rows, balance) {
  const tr = rows
    .map((r) => {
      const earnedDur = exportEarnedHasDates(r)
        ? fmtDate(r.earnedFrom) + ' – ' + fmtDate(r.earnedTo)
        : '';

      let takenDur = '';
      if (exportTakenHasDates(r)) {
        takenDur = fmtDate(r.takenFrom) + ' – ' + fmtDate(r.takenTo);
      } else {
        const label = exportTakenParticularsLabel(r);
        if (label) takenDur = '<i>' + esc(label) + '</i>';
      }

      return `
    <tr class="${r.atCap ? 'cap' : ''}">
      <td class="c">${r.sr}</td>
      <td>${earnedDur}</td>
      <td class="c">${r.earnedDays || ''}</td>
      <td class="c">${r.plEarned || ''}</td>
      <td class="c b">${r.balAfterEarned}</td>
      <td>${takenDur}</td>
      <td class="c">${r.plTaken || ''}</td>
      <td class="c b">${r.balAfterTaken}</td>
    </tr>`;
    })
    .join('');

  return `<!doctype html><html><head><meta charset="utf-8"><style>
    @page { size: A4; }
    body { font-family: 'Times New Roman', serif; color: #1c1a15; margin: 0; }
    .head { text-align: center; border-bottom: 3px double #1c1a15; padding: 8px 0 10px; margin-bottom: 12px; }
    .head h1 { font-size: 17px; letter-spacing: 2px; margin: 0 0 4px; }
    .head .who { font-size: 14px; font-weight: bold; }
    .head .desig { font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; }
    th, td { border: 1px solid #6a6455; padding: 3px 5px; }
    th { background: #efe9da; font-size: 10px; }
    .c { text-align: center; } .b { font-weight: bold; }
    .grp th { font-size: 11px; letter-spacing: 1px; }
    tr.cap td { background: #fdf3d0; }
    .foot { margin-top: 14px; display: flex; justify-content: flex-end; font-size: 12px; }
    .bal { font-size: 13px; font-weight: bold; border: 2px solid #1c1a15; padding: 6px 14px; }
    tfoot td { font-weight: bold; background: #efe9da; }
  </style></head><body>
    <div class="head">
      <h1>PL BALANCE STATEMENT</h1>
      <div class="who">${esc(employee.name)}</div>
      <div class="desig">${esc(employee.designation || '')}</div>
    </div>
    <table>
      <thead>
        <tr class="grp"><th></th><th colspan="4">EARNED</th><th colspan="3">TAKEN</th></tr>
        <tr>
          <th>Sr</th><th>Duration</th><th>Days</th><th>PL Earned</th><th>Bal.</th>
          <th>Duration / Particulars</th><th>PL Taken</th><th>Bal.</th>
        </tr>
      </thead>
      <tbody>${tr}</tbody>
      <tfoot><tr><td colspan="7" style="text-align:right">Total PL Balance</td><td class="c">${balance}</td></tr></tfoot>
    </table>
    <div class="foot">
      <div class="bal">Net PL Balance: ${balance}</div>
    </div>
  </body></html>`;
}

function esc(s) {
  return String(s || '').replace(/[&<>"]/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
  }[c]));
}
