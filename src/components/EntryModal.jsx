import React, { useState, useEffect } from 'react';
import {
  ENTRY_TYPES,
  daysInclusive,
  proratedCredit,
  firstEntryPeriodEnd,
  nextSurrenderDefault,
} from '../lib/plRules';
import { useModalKeyboard } from '../hooks/useModalKeyboard';

const TITLES = {
  [ENTRY_TYPES.FIRST_ENTRY]: 'First Entry — Date of Joining',
  [ENTRY_TYPES.ADD_HALF_YEAR]: 'Half-Year Credit',
  [ENTRY_TYPES.ADD_FULL_YEAR]: 'Full-Year Credit',
  [ENTRY_TYPES.JOINING_TIME]: 'Joining Time Credit',
  [ENTRY_TYPES.DIRECT_PL_ADDITION]: 'Direct PL Addition',
  [ENTRY_TYPES.LEAVE_CANCELLED]: 'Leave Cancelled (Credit Back)',
  [ENTRY_TYPES.LEAVE_TAKEN]: 'Leave Taken',
  [ENTRY_TYPES.PL_SURRENDER]: 'PL Surrender',
  [ENTRY_TYPES.STRIKE_DEDUCTION]: 'Strike Deduction',
  [ENTRY_TYPES.PL_LESS]: 'PL Less',
};

export default function EntryModal({ mode, type, entry, entries, onSave, onClose }) {
  const [e, setE] = useState(entry);
  const [method, setMethod] = useState(entry.firstMethod || 'HALF_YEAR');

  useEffect(() => setE(entry), [entry]);

  const set = (k, v) => setE((prev) => ({ ...prev, [k]: v }));

  const earnedDaysLive = e.earnedFrom && e.earnedTo ? daysInclusive(e.earnedFrom, e.earnedTo) : null;
  const takenDaysLive = e.takenFrom && e.takenTo ? daysInclusive(e.takenFrom, e.takenTo) : null;

  // First entry: auto period end + prorated credit when date/method changes
  useEffect(() => {
    if (type !== ENTRY_TYPES.FIRST_ENTRY || !e.earnedFrom) return;
    const to = firstEntryPeriodEnd(e.earnedFrom, method);
    const credit = proratedCredit(e.earnedFrom, to);
    setE((prev) => ({ ...prev, earnedTo: to, plEarned: credit, firstMethod: method }));
  }, [e.earnedFrom, method, type]);

  // Prorated recalc for earned date ranges (edit mode on period entries)
  useEffect(() => {
    if (type === ENTRY_TYPES.FIRST_ENTRY) return;
    if ([ENTRY_TYPES.ADD_HALF_YEAR, ENTRY_TYPES.ADD_FULL_YEAR].includes(type) && e.earnedFrom && e.earnedTo) {
      // Only recalc if user manually changed dates in edit mode
      if (mode === 'edit') {
        const stdHalf = e.plEarned === 15 || e.plEarned === 30;
        if (!stdHalf) set('plEarned', proratedCredit(e.earnedFrom, e.earnedTo));
      }
    }
  }, [e.earnedFrom, e.earnedTo, type, mode]);

  // Leave cancelled: live PL earned = inclusive days
  useEffect(() => {
    if (type !== ENTRY_TYPES.LEAVE_CANCELLED || !e.earnedFrom || !e.earnedTo) return;
    setE((prev) => ({ ...prev, plEarned: daysInclusive(e.earnedFrom, e.earnedTo) }));
  }, [e.earnedFrom, e.earnedTo, type]);

  const isFirst = type === ENTRY_TYPES.FIRST_ENTRY;
  const isEarnedDates = [ENTRY_TYPES.ADD_HALF_YEAR, ENTRY_TYPES.ADD_FULL_YEAR].includes(type);
  const isLeaveCancelled = type === ENTRY_TYPES.LEAVE_CANCELLED;
  const isTaken = type === ENTRY_TYPES.LEAVE_TAKEN;
  const isJoining = type === ENTRY_TYPES.JOINING_TIME;
  const isDirectAdd = type === ENTRY_TYPES.DIRECT_PL_ADDITION;
  const isSurrender = type === ENTRY_TYPES.PL_SURRENDER;
  const isStrike = type === ENTRY_TYPES.STRIKE_DEDUCTION;
  const isPlLess = type === ENTRY_TYPES.PL_LESS;

  const valid =
    (isFirst && e.earnedFrom && e.earnedTo && Number(e.plEarned) >= 0) ||
    (isEarnedDates && e.earnedFrom && e.earnedTo && Number(e.plEarned) >= 0) ||
    (isLeaveCancelled && e.earnedFrom && e.earnedTo && Number(e.plEarned) > 0) ||
    (isTaken && e.takenFrom && e.takenTo && takenDaysLive > 0) ||
    (isJoining && Number(e.plEarned) > 0) ||
    (isDirectAdd && Number(e.plEarned) > 0) ||
    (isSurrender && Number(e.plTaken) > 0 && e.label) ||
    (isStrike && e.takenFrom && e.takenTo && takenDaysLive > 0) ||
    (isPlLess && Number(e.plTaken) > 0);

  const submit = () => {
    const out = { ...e, firstMethod: method };
    if (isJoining) out.earnedDays = Number(out.plEarned);
    if (isTaken || isStrike) out.plTaken = '';
    onSave(out);
  };

  const applySurrenderDefault = () => {
    const def = nextSurrenderDefault(entries || []);
    set('label', def.label);
    if (def.days !== '') set('plTaken', def.days);
  };

  const modalRef = useModalKeyboard({ valid, onSubmit: submit, onClose });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" ref={modalRef} onClick={(ev) => ev.stopPropagation()}>
        <div className="modal-head">
          <h3>{mode === 'edit' ? 'Edit — ' : ''}{TITLES[type]}</h3>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {isFirst && (
            <>
              <label>Date of joining service
                <input
                  type="date"
                  value={e.earnedFrom || ''}
                  onChange={(ev) => set('earnedFrom', ev.target.value)}
                />
              </label>
              <div className="method-row">
                <span className="method-label">Credit method for this period</span>
                <label className="method-opt">
                  <input
                    type="radio"
                    name="method"
                    checked={method === 'HALF_YEAR'}
                    onChange={() => setMethod('HALF_YEAR')}
                  />
                  Half-yearly (to 30-06 or 31-12)
                </label>
                <label className="method-opt">
                  <input
                    type="radio"
                    name="method"
                    checked={method === 'FULL_YEAR'}
                    onChange={() => setMethod('FULL_YEAR')}
                  />
                  Full-yearly (to 31-12)
                </label>
              </div>
              <div className="field-row">
                <label>Period ends (auto)
                  <input type="date" value={e.earnedTo || ''} readOnly />
                </label>
              </div>
              <div className="calc-strip">
                <span>Days: <b>{earnedDaysLive ?? '—'}</b></span>
                <label className="inline">PL Earned
                  <input type="number" step="0.5" value={e.plEarned ?? ''} onChange={(ev) => set('plEarned', ev.target.value)} />
                </label>
              </div>
            </>
          )}

          {isEarnedDates && (
            <>
              <div className="field-row">
                <label>From
                  <input type="date" value={e.earnedFrom || ''} onChange={(ev) => set('earnedFrom', ev.target.value)} />
                </label>
                <label>To
                  <input type="date" value={e.earnedTo || ''} onChange={(ev) => set('earnedTo', ev.target.value)} />
                </label>
              </div>
              <div className="calc-strip">
                <span>Days: <b>{earnedDaysLive ?? '—'}</b></span>
                <label className="inline">PL Earned
                  <input type="number" step="0.5" value={e.plEarned ?? ''} onChange={(ev) => set('plEarned', ev.target.value)} />
                </label>
              </div>
            </>
          )}

          {isLeaveCancelled && (
            <>
              <div className="field-row">
                <label>From
                  <input type="date" value={e.earnedFrom || ''} onChange={(ev) => set('earnedFrom', ev.target.value)} />
                </label>
                <label>To
                  <input type="date" value={e.earnedTo || ''} onChange={(ev) => set('earnedTo', ev.target.value)} />
                </label>
              </div>
              <div className="calc-strip">
                <span>Days: <b>{earnedDaysLive ?? '—'}</b></span>
                <label className="inline">PL Earned
                  <input type="number" step="0.5" value={e.plEarned ?? ''} onChange={(ev) => set('plEarned', ev.target.value)} />
                </label>
              </div>
              <label>Remark (optional)
                <input type="text" value={e.label || ''} placeholder="e.g., Leave cancellation order" onChange={(ev) => set('label', ev.target.value)} />
              </label>
            </>
          )}

          {isTaken && (
            <>
              <div className="field-row">
                <label>Leave From
                  <input type="date" value={e.takenFrom || ''} onChange={(ev) => set('takenFrom', ev.target.value)} />
                </label>
                <label>Leave To
                  <input type="date" value={e.takenTo || ''} onChange={(ev) => set('takenTo', ev.target.value)} />
                </label>
              </div>
              <div className="calc-strip">
                <span>PL Taken (auto): <b>{takenDaysLive ?? '—'} {takenDaysLive ? 'days' : ''}</b></span>
              </div>
              <label>Remark (optional)
                <input type="text" value={e.label || ''} placeholder="e.g., Medical / LTC" onChange={(ev) => set('label', ev.target.value)} />
              </label>
            </>
          )}

          {isStrike && (
            <>
              <div className="field-row">
                <label>Strike From
                  <input type="date" value={e.takenFrom || ''} onChange={(ev) => set('takenFrom', ev.target.value)} />
                </label>
                <label>Strike To
                  <input type="date" value={e.takenTo || ''} onChange={(ev) => set('takenTo', ev.target.value)} />
                </label>
              </div>
              <div className="calc-strip">
                <span>PL Taken (auto): <b>{takenDaysLive ?? '—'} {takenDaysLive ? 'days' : ''}</b></span>
              </div>
            </>
          )}

          {isJoining && (
            <label>Days credited
              <input type="number" step="0.5" value={e.plEarned ?? ''} onChange={(ev) => set('plEarned', ev.target.value)} />
            </label>
          )}

          {isDirectAdd && (
            <>
              <label>Days to add
                <input type="number" step="0.5" value={e.plEarned ?? ''} onChange={(ev) => set('plEarned', ev.target.value)} />
              </label>
              <label>Remark (optional)
                <input type="text" value={e.label || ''} placeholder="e.g., Balance brought forward" onChange={(ev) => set('label', ev.target.value)} />
              </label>
            </>
          )}

          {isSurrender && (
            <>
              <label>Particulars (block-year label)
                <input type="text" value={e.label || ''} onChange={(ev) => set('label', ev.target.value)} placeholder="e.g., PL Surrender 2008-09" />
              </label>
              <div className="field-row">
                <label>Days surrendered
                  <input type="number" step="0.5" value={e.plTaken ?? ''} onChange={(ev) => set('plTaken', ev.target.value)} />
                </label>
                <button type="button" className="btn btn-ghost-on-modal" onClick={applySurrenderDefault}>Auto label &amp; days</button>
              </div>
            </>
          )}

          {isPlLess && (
            <>
              <label>Days to deduct
                <input type="number" step="0.5" value={e.plTaken ?? ''} onChange={(ev) => set('plTaken', ev.target.value)} />
              </label>
              <label>Reason
                <input type="text" value={e.label || ''} onChange={(ev) => set('label', ev.target.value)} placeholder="e.g., Excess leave adjusted" />
              </label>
            </>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!valid} onClick={submit}>
            {mode === 'edit' ? 'Save changes' : 'Add entry'}
          </button>
        </div>
      </div>
    </div>
  );
}
