import { ENTRY_TYPES } from './plRules';

/**
 * Export whitelist for taken-side Particulars / duration column.
 * App-internal labels (first entry, prorated, joining time, PL less reasons, etc.)
 * must NEVER appear in Excel or PDF — decide by entry TYPE only.
 */

/** Text label for taken-side particulars (column G / PDF particulars cell) */
export function exportTakenParticularsLabel(r) {
  switch (r.type) {
    case ENTRY_TYPES.PL_SURRENDER:
      return r.label || '';
    default:
      return '';
  }
}

/** Whether the taken side uses From/To date columns in export */
export function exportTakenHasDates(r) {
  return (
    (r.type === ENTRY_TYPES.LEAVE_TAKEN || r.type === ENTRY_TYPES.STRIKE_DEDUCTION) &&
    r.takenFrom &&
    r.takenTo
  );
}

/** Whether the earned side uses From/To date columns in export */
export function exportEarnedHasDates(r) {
  return !!(r.earnedFrom && r.earnedTo);
}

/** Text for earned-side From column when there are no dates (whitelist: none — dates only) */
export function exportEarnedFromText(r) {
  return '';
}

/** Days count for earned side when no date range (joining time, direct addition) */
export function exportEarnedDaysFallback(r) {
  if (r.type === ENTRY_TYPES.JOINING_TIME || r.type === ENTRY_TYPES.DIRECT_PL_ADDITION) {
    return r.earnedDays || Number(r.plEarned) || 0;
  }
  return 0;
}

export function exportEarnedNeedsDaysFallback(r) {
  return (
    !exportEarnedHasDates(r) &&
    (r.type === ENTRY_TYPES.JOINING_TIME || r.type === ENTRY_TYPES.DIRECT_PL_ADDITION) &&
    (r.plEarned || r.earnedDays)
  );
}
