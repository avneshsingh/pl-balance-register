import React from 'react';
import { ENTRY_TYPES, fmtDate, halfYearPreview, fullYearPreview, hasFirstEntry } from '../lib/plRules';

const CREDIT_BUTTONS = [
  {
    type: ENTRY_TYPES.FIRST_ENTRY,
    icon: '🏁',
    label: 'First Entry',
    hint: 'Date of joining · pick method',
    cls: 'credit',
    requiresNoFirst: true,
  },
  {
    type: ENTRY_TYPES.ADD_HALF_YEAR,
    icon: '📅',
    label: 'Add Half Year',
    hintFn: (p) => `${fmtDate(p.from)} → ${fmtDate(p.to)} · +${p.credit}`,
    cls: 'credit',
    oneClick: true,
    requiresFirst: true,
  },
  {
    type: ENTRY_TYPES.ADD_FULL_YEAR,
    icon: '🗓️',
    label: 'Add Full Year',
    hintFn: (p) => `${fmtDate(p.from)} → ${fmtDate(p.to)} · +${p.credit}`,
    cls: 'credit',
    oneClick: true,
    requiresFirst: true,
  },
  {
    type: ENTRY_TYPES.JOINING_TIME,
    icon: '🧳',
    label: 'Joining Time',
    hint: 'Credit days · no period',
    cls: 'credit',
  },
  {
    type: ENTRY_TYPES.DIRECT_PL_ADDITION,
    icon: '➕',
    label: 'Direct PL Addition',
    hint: 'Add days · optional remark',
    cls: 'credit',
  },
];

const DEBIT_BUTTONS = [
  {
    type: ENTRY_TYPES.LEAVE_TAKEN,
    icon: '🏖️',
    label: 'Leave Taken',
    hint: 'From–To · days auto',
    cls: 'debit',
  },
  {
    type: ENTRY_TYPES.PL_SURRENDER,
    icon: '📤',
    label: 'PL Surrender',
    hint: 'FY block label · days',
    cls: 'debit',
  },
  {
    type: ENTRY_TYPES.STRIKE_DEDUCTION,
    icon: '⚡',
    label: 'Strike Deduction',
    hint: 'From–To · labeled strike',
    cls: 'debit',
  },
  {
    type: ENTRY_TYPES.PL_LESS,
    icon: '➖',
    label: 'PL Less',
    hint: 'Direct deduction · reason',
    cls: 'debit',
  },
];

function ToolButton({ btn, onAdd, halfPreview, fullPreview, entries }) {
  if (btn.requiresNoFirst && hasFirstEntry(entries)) return null;
  if (btn.requiresFirst && !hasFirstEntry(entries)) {
    return (
      <button key={btn.type} className={`tool-btn ${btn.cls} disabled`} disabled title="Add the first entry (date of joining) first">
        <span className="tool-icon">{btn.icon}</span>
        <span className="tool-label">{btn.label}</span>
        <span className="tool-hint">Make the first entry first</span>
      </button>
    );
  }

  const preview =
    btn.type === ENTRY_TYPES.ADD_HALF_YEAR ? halfPreview :
    btn.type === ENTRY_TYPES.ADD_FULL_YEAR ? fullPreview : null;

  return (
    <button
      key={btn.type}
      className={`tool-btn ${btn.cls}`}
      onClick={() => onAdd(btn.type)}
      title={btn.oneClick ? 'Adds instantly — edit later if needed' : 'Opens a short form'}
    >
      <span className="tool-icon">{btn.icon}</span>
      <span className="tool-label">{btn.label}</span>
      <span className="tool-hint">
        {btn.hintFn && preview ? btn.hintFn(preview) : btn.hint}
      </span>
      {btn.oneClick && <span className="tool-tag">1-click</span>}
    </button>
  );
}

export default function Toolbar({ onAdd, entries, serviceStart }) {
  const halfPreview = halfYearPreview(entries, serviceStart);
  const fullPreview = fullYearPreview(entries, serviceStart);

  return (
    <div className="toolbar-sections">
      <div className="toolbar-group">
        <div className="toolbar-group-label">Credit (accumulation)</div>
        <div className="toolbar">
          {CREDIT_BUTTONS.map((b) => (
            <ToolButton
              key={b.type}
              btn={b}
              onAdd={onAdd}
              halfPreview={halfPreview}
              fullPreview={fullPreview}
              entries={entries}
            />
          ))}
        </div>
      </div>
      <div className="toolbar-group">
        <div className="toolbar-group-label">Deduction (taken)</div>
        <div className="toolbar">
          {DEBIT_BUTTONS.map((b) => (
            <ToolButton key={b.type} btn={b} onAdd={onAdd} entries={entries} />
          ))}
        </div>
      </div>
    </div>
  );
}
