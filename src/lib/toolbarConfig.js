import { ENTRY_TYPES, hasFirstEntry } from './plRules';

export const CREDIT_BUTTONS = [
  {
    type: ENTRY_TYPES.FIRST_ENTRY,
    icon: '🏁',
    label: 'First Entry',
    hint: 'Date of joining · pick method',
    cls: 'credit',
    requiresNoFirst: true,
    shortcut: 'Q',
  },
  {
    type: ENTRY_TYPES.ADD_HALF_YEAR,
    icon: '📅',
    label: 'Add Half Year',
    hintFn: (p) => `${fmtDate(p.from)} → ${fmtDate(p.to)} · +${p.credit}`,
    cls: 'credit',
    oneClick: true,
    requiresFirst: true,
    manual: true,
    shortcut: 'A',
    manualShortcut: 'W',
  },
  {
    type: ENTRY_TYPES.ADD_FULL_YEAR,
    icon: '🗓️',
    label: 'Add Full Year',
    hintFn: (p) => `${fmtDate(p.from)} → ${fmtDate(p.to)} · +${p.credit}`,
    cls: 'credit',
    oneClick: true,
    requiresFirst: true,
    manual: true,
    shortcut: 'F',
    manualShortcut: 'R',
  },
  {
    type: ENTRY_TYPES.LEAVE_CANCELLED,
    icon: '↩️',
    label: 'Leave Cancelled',
    hint: 'Credit back · dates',
    cls: 'credit',
    shortcut: 'S',
  },
  {
    type: ENTRY_TYPES.JOINING_TIME,
    icon: '🧳',
    label: 'Joining Time',
    hint: 'Credit days · no period',
    cls: 'credit',
    shortcut: 'G',
  },
  {
    type: ENTRY_TYPES.DIRECT_PL_ADDITION,
    icon: '➕',
    label: 'Direct PL Addition',
    hint: 'Add days · optional remark',
    cls: 'credit',
    shortcut: 'D',
  },
];

export const DEBIT_BUTTONS = [
  {
    type: ENTRY_TYPES.LEAVE_TAKEN,
    icon: '🏖️',
    label: 'Leave Taken',
    hint: 'From–To · days auto',
    cls: 'debit',
    shortcut: 'Z',
  },
  {
    type: ENTRY_TYPES.PL_SURRENDER,
    icon: '📤',
    label: 'PL Surrender',
    hint: 'FY block label · days',
    cls: 'debit',
    shortcut: 'X',
  },
  {
    type: ENTRY_TYPES.STRIKE_DEDUCTION,
    icon: '⚡',
    label: 'Strike Deduction',
    hint: 'From–To · labeled strike',
    cls: 'debit',
    shortcut: 'C',
  },
  {
    type: ENTRY_TYPES.PL_LESS,
    icon: '➖',
    label: 'PL Less',
    hint: 'Direct deduction · reason',
    cls: 'debit',
    shortcut: 'V',
  },
];

/** Single key → action map (remap shortcuts by editing this object) */
export const SHORTCUT_MAP = {
  q: { type: ENTRY_TYPES.FIRST_ENTRY },
  a: { type: ENTRY_TYPES.ADD_HALF_YEAR },
  w: { type: ENTRY_TYPES.ADD_HALF_YEAR, manual: true },
  f: { type: ENTRY_TYPES.ADD_FULL_YEAR },
  r: { type: ENTRY_TYPES.ADD_FULL_YEAR, manual: true },
  d: { type: ENTRY_TYPES.DIRECT_PL_ADDITION },
  s: { type: ENTRY_TYPES.LEAVE_CANCELLED },
  g: { type: ENTRY_TYPES.JOINING_TIME },
  z: { type: ENTRY_TYPES.LEAVE_TAKEN },
  x: { type: ENTRY_TYPES.PL_SURRENDER },
  c: { type: ENTRY_TYPES.STRIKE_DEDUCTION },
  v: { type: ENTRY_TYPES.PL_LESS },
};

export function isShortcutActionDisabled({ type }, entries) {
  if (type === ENTRY_TYPES.FIRST_ENTRY && hasFirstEntry(entries)) return true;
  if (
    (type === ENTRY_TYPES.ADD_HALF_YEAR || type === ENTRY_TYPES.ADD_FULL_YEAR) &&
    !hasFirstEntry(entries)
  ) {
    return true;
  }
  return false;
}

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}
