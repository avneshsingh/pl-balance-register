import React from 'react';
import { ENTRY_TYPES, halfYearPreview, fullYearPreview, hasFirstEntry } from '../lib/plRules';
import { CREDIT_BUTTONS, DEBIT_BUTTONS } from '../lib/toolbarConfig';

function KeyBadge({ keyLabel, cls }) {
  if (!keyLabel) return null;
  return <kbd className={'tool-key' + (cls ? ' ' + cls : '')}>{keyLabel}</kbd>;
}

function ToolButton({ btn, onAdd, halfPreview, fullPreview, entries }) {
  if (btn.requiresNoFirst && hasFirstEntry(entries)) return null;
  if (btn.requiresFirst && !hasFirstEntry(entries)) {
    return (
      <button key={btn.type} className={`tool-btn ${btn.cls} disabled`} disabled title="Add the first entry (date of joining) first">
        <span className="tool-icon">{btn.icon}</span>
        <span className="tool-label">{btn.label}</span>
        <span className="tool-hint">Make the first entry first</span>
        {btn.shortcut && <KeyBadge keyLabel={btn.shortcut} />}
      </button>
    );
  }

  const preview =
    btn.type === ENTRY_TYPES.ADD_HALF_YEAR ? halfPreview :
    btn.type === ENTRY_TYPES.ADD_FULL_YEAR ? fullPreview : null;

  const card = (
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
      {btn.shortcut && <KeyBadge keyLabel={btn.shortcut} />}
    </button>
  );

  if (btn.manual) {
    return (
      <div key={btn.type} className="tool-card-wrap">
        {card}
        <button
          type="button"
          className="tool-manual"
          onClick={() => onAdd(btn.type, { manual: true })}
        >
          Manual entry
          {btn.manualShortcut && <KeyBadge keyLabel={btn.manualShortcut} cls="tool-key-manual" />}
        </button>
      </div>
    );
  }

  return card;
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
