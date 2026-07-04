import React from 'react';
import { fmtDate, ENTRY_TYPES } from '../lib/plRules';

function earnedCell(r) {
  if (r.earnedFrom && r.earnedTo) {
    return (
      <span className="dur">{fmtDate(r.earnedFrom)} <em>→</em> {fmtDate(r.earnedTo)}</span>
    );
  }
  if (r.type === ENTRY_TYPES.JOINING_TIME) {
    return <span className="chip chip-jt">Joining Time</span>;
  }
  if (r.type === ENTRY_TYPES.DIRECT_PL_ADDITION && r.label) {
    return <span className="chip chip-direct">{r.label}</span>;
  }
  return <span className="dash">—</span>;
}

function takenCell(r) {
  if (r.takenFrom && r.takenTo) {
    return (
      <span className="dur">{fmtDate(r.takenFrom)} <em>→</em> {fmtDate(r.takenTo)}</span>
    );
  }
  if (r.type === ENTRY_TYPES.PL_SURRENDER && r.label) {
    return <span className="chip chip-sur">{r.label}</span>;
  }
  if (r.type === ENTRY_TYPES.STRIKE_DEDUCTION) {
    return <span className="chip chip-strike">Strike</span>;
  }
  if (r.type === ENTRY_TYPES.PL_LESS && r.label) {
    return <span className="chip chip-less">{r.label}</span>;
  }
  if (r.label && /surrender/i.test(r.label)) {
    return <span className="chip chip-sur">{r.label}</span>;
  }
  return <span className="dash">—</span>;
}

function noteCell(r) {
  if (r.lapsed > 0) {
    return <span className="lapse-note">{r.lapsed} lapsed</span>;
  }
  const hide =
    (r.label && /surrender/i.test(r.label)) ||
    r.type === ENTRY_TYPES.JOINING_TIME ||
    r.type === ENTRY_TYPES.DIRECT_PL_ADDITION ||
    r.type === ENTRY_TYPES.PL_LESS ||
    r.type === ENTRY_TYPES.STRIKE_DEDUCTION ||
    r.type === ENTRY_TYPES.FIRST_ENTRY;
  return hide ? '' : (r.label || '');
}

export default function Ledger({ rows, onEdit, onDelete, onMove }) {
  if (!rows.length) {
    return (
      <div className="ledger-empty">
        The ledger is empty. Start with <b>First Entry</b> — pick the date of joining and credit method.
        After that, half-year and full-year credits are one click.
      </div>
    );
  }

  return (
    <div className="ledger-wrap">
      <table className="ledger">
        <thead>
          <tr className="group-row">
            <th></th>
            <th colSpan={4} className="group earned-g">Earned</th>
            <th colSpan={4} className="group taken-g">Taken</th>
            <th></th>
          </tr>
          <tr>
            <th>Sr</th>
            <th>Duration</th>
            <th>Days</th>
            <th>PL Earned</th>
            <th>Bal.</th>
            <th>Duration / Particulars</th>
            <th>PL Taken</th>
            <th>Bal.</th>
            <th className="th-note">Note</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={r.atCap ? 'at-cap' : ''}>
              <td className="c">{r.sr}</td>
              <td>{earnedCell(r)}</td>
              <td className="c">{r.earnedDays || (r.earnedFrom ? 0 : '—')}</td>
              <td className={'c num' + (r.plEarned ? ' pos' : '')}>
                {r.plEarned || '—'}
                {r.lapsed > 0 && <span className="lapse-inline"> ({r.lapsed}↓)</span>}
              </td>
              <td className={'c num bal' + (r.balAfterEarned < 0 ? ' neg' : '')}>{r.balAfterEarned}</td>
              <td>{takenCell(r)}</td>
              <td className={'c num' + (r.plTaken ? ' neg' : '')}>{r.plTaken || '—'}</td>
              <td className={'c num bal strong' + (r.balAfterTaken < 0 ? ' neg' : '')}>{r.balAfterTaken}</td>
              <td className="note">{noteCell(r)}</td>
              <td className="row-actions">
                <button title="Move up" onClick={() => onMove(r.id, -1)}>↑</button>
                <button title="Move down" onClick={() => onMove(r.id, +1)}>↓</button>
                <button title="Edit" onClick={() => onEdit(r)}>✎</button>
                <button title="Delete" className="del" onClick={() => { if (confirm('Delete this entry?')) onDelete(r.id); }}>✕</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
