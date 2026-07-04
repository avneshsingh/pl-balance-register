// PL (Privilege Leave) rules engine — Rajasthan judiciary pattern.
// Pure module: no UI or Electron dependencies.
//
// Ledger formulas (mirrors paper register):
//   Days  = To − From + 1 (inclusive)
//   F/Bal = previous balance + effective PL earned (after cap)
//   J/Bal = F/Bal − PL taken
//
// Cap: 300 for credit periods ending ≤ 31-12-2012; 315 from 01-01-2013.
// Lapse is computed on every pass — never stored on entries.

const DAY = 86400000;
export const CAP_LEGACY = 300;
export const CAP_MODERN = 315;
export const CAP_CHANGE_DATE = '2013-01-01';

export const ENTRY_TYPES = {
  FIRST_ENTRY: 'FIRST_ENTRY',
  ADD_HALF_YEAR: 'ADD_HALF_YEAR',
  ADD_FULL_YEAR: 'ADD_FULL_YEAR',
  JOINING_TIME: 'JOINING_TIME',
  DIRECT_PL_ADDITION: 'DIRECT_PL_ADDITION',
  LEAVE_CANCELLED: 'LEAVE_CANCELLED',
  LEAVE_TAKEN: 'LEAVE_TAKEN',
  PL_SURRENDER: 'PL_SURRENDER',
  STRIKE_DEDUCTION: 'STRIKE_DEDUCTION',
  PL_LESS: 'PL_LESS',
};

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

export function daysInclusive(from, to) {
  if (!from || !to) return 0;
  const a = Date.parse(from + 'T00:00:00Z');
  const b = Date.parse(to + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b) || b < a) return 0;
  return Math.round((b - a) / DAY) + 1;
}

/** Prorated credit: days/365 × 30, rounded to nearest 0.5 */
export function proratedCredit(from, to) {
  const d = daysInclusive(from, to);
  return Math.round((d / 365) * 30 * 2) / 2;
}

export function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}-${m}-${y}`;
}

/** UTC-safe: add calendar days to an ISO date string */
export function addDays(iso, days) {
  return new Date(Date.parse(iso + 'T00:00:00Z') + days * DAY).toISOString().slice(0, 10);
}

/** UTC calendar year from ISO date */
function utcYear(iso) {
  return new Date(iso + 'T00:00:00Z').getUTCFullYear();
}

/** Calendar half-year containing `iso`: Jan–Jun or Jul–Dec (UTC) */
export function periodOf(iso) {
  const d = new Date(iso + 'T00:00:00Z');
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  return m < 6
    ? { from: `${y}-01-01`, to: `${y}-06-30` }
    : { from: `${y}-07-01`, to: `${y}-12-31` };
}

/** Cap for a credit period based on its end date */
export function capForPeriodEnd(earnedTo) {
  if (!earnedTo || earnedTo < CAP_CHANGE_DATE) return CAP_LEGACY;
  return CAP_MODERN;
}

/** Period end for the first (joining) entry */
export function firstEntryPeriodEnd(fromDate, method) {
  const y = fromDate.slice(0, 4);
  if (method === 'FULL_YEAR') return `${y}-12-31`;
  return periodOf(fromDate).to;
}

function round1(n) {
  return Math.round(n * 100) / 100;
}

function lastCreditPeriodEnd(entries) {
  const earned = entries.filter((e) => e.earnedTo);
  if (!earned.length) return null;
  return earned.reduce((a, b) => (a.earnedTo > b.earnedTo ? a : b)).earnedTo;
}

// ---------------------------------------------------------------------------
// Credit period generation (continues from last period end)
// ---------------------------------------------------------------------------

export function nextCreditPeriod(entries, fallbackStart) {
  const earned = entries.filter((e) => e.earnedTo);
  let startIso;
  if (earned.length) {
    const last = earned.reduce((a, b) => (a.earnedTo > b.earnedTo ? a : b));
    startIso = addDays(last.earnedTo, 1);
  } else {
    startIso = fallbackStart || new Date().toISOString().slice(0, 10);
  }
  const period = periodOf(startIso);
  const standard = startIso === period.from;
  const from = startIso;
  const to = period.to;
  const credit = standard ? 15 : proratedCredit(from, to);
  return { from, to, credit, standard };
}

export function nextFullYearPeriod(entries, fallbackStart) {
  const p = nextCreditPeriod(entries, fallbackStart);
  const y = utcYear(p.from);
  if (p.from === `${y}-01-01`) {
    return { from: p.from, to: `${y}-12-31`, credit: 30, standard: true };
  }
  return {
    from: p.from,
    to: `${y}-12-31`,
    credit: proratedCredit(p.from, `${y}-12-31`),
    standard: false,
  };
}

// ---------------------------------------------------------------------------
// Surrender defaults (historical — user can always override)
// ---------------------------------------------------------------------------

export function nextSurrenderDefault(entries) {
  const periodEnd = lastCreditPeriodEnd(entries);
  const year = periodEnd
    ? parseInt(periodEnd.slice(0, 4), 10)
    : new Date().getFullYear();

  const surrenders = entries.filter(
    (e) => e.type === ENTRY_TYPES.PL_SURRENDER || (e.label && /surrender/i.test(e.label))
  );

  if (year <= 2000) {
    let startYear = year;
    if (surrenders.length) {
      const last = surrenders[surrenders.length - 1];
      const m = last.label?.match(/(\d{4})-(\d{4})/);
      if (m) startYear = parseInt(m[2], 10) + 1;
    }
    const endYear = startYear + 2;
    return {
      label: `PL Surrender ${startYear}-${endYear}`,
      days: 30,
    };
  }

  if (year >= 2001 && year <= 2007) {
    return { label: '', days: '' };
  }

  let fy = year;
  if (surrenders.length) {
    const last = surrenders[surrenders.length - 1];
    const m = last.label?.match(/(\d{4})-(\d{2})/);
    if (m) fy = parseInt(m[1], 10) + 1;
  }
  const next = String((fy + 1) % 100).padStart(2, '0');
  return { label: `PL Surrender ${fy}-${next}`, days: 15 };
}

// ---------------------------------------------------------------------------
// Ledger computation (cap + dynamic lapse)
// ---------------------------------------------------------------------------

export function computeLedger(entries) {
  let bal = 0;
  let lastPeriodEnd = null;

  return entries.map((e, i) => {
    const earnedDays =
      e.earnedFrom && e.earnedTo ? daysInclusive(e.earnedFrom, e.earnedTo) : e.earnedDays || 0;
    const plEarned = Number(e.plEarned) || 0;

    const periodEndForCap = e.earnedTo || lastPeriodEnd;
    const cap = capForPeriodEnd(periodEndForCap);

    let effectiveCredit = 0;
    let lapsed = 0;
    let balAfterEarned = bal;

    if (plEarned > 0) {
      const wouldBe = round1(bal + plEarned);
      // Cap/lapse applies only when credit would exceed the period cap
      if (wouldBe > cap) {
        effectiveCredit = round1(Math.max(0, cap - bal));
        lapsed = round1(plEarned - effectiveCredit);
        balAfterEarned = round1(bal + effectiveCredit);
      } else {
        effectiveCredit = plEarned;
        balAfterEarned = wouldBe;
      }
    }

    if (e.earnedTo) lastPeriodEnd = e.earnedTo;

    const takenDays =
      e.takenFrom && e.takenTo ? daysInclusive(e.takenFrom, e.takenTo) : 0;
    const plTaken =
      e.plTaken !== undefined && e.plTaken !== null && e.plTaken !== ''
        ? Number(e.plTaken)
        : takenDays;
    // Deductions apply fully — balance may go negative (advance leave)
    const balAfterTaken = round1(balAfterEarned - plTaken);
    bal = balAfterTaken;

    const atCap = balAfterTaken === cap || balAfterEarned === cap;
    const isNegative = balAfterTaken < 0 || balAfterEarned < 0;

    return {
      ...e,
      sr: i + 1,
      earnedDays,
      plEarned,
      effectiveCredit,
      lapsed,
      balAfterEarned,
      plTaken,
      balAfterTaken,
      cap,
      atCap,
      isNegative,
      overCap: false,
    };
  });
}

export function currentBalance(entries) {
  const ledger = computeLedger(entries);
  return ledger.length ? ledger[ledger.length - 1].balAfterTaken : 0;
}

export function hasFirstEntry(entries) {
  return entries.some((e) => e.type === ENTRY_TYPES.FIRST_ENTRY || e.earnedTo);
}

// ---------------------------------------------------------------------------
// Entry factory
// ---------------------------------------------------------------------------

export function newEntry(type, entries, opts = {}) {
  const id = 'e' + Date.now() + Math.random().toString(36).slice(2, 6);

  switch (type) {
    case ENTRY_TYPES.FIRST_ENTRY: {
      const from = opts.from || '';
      const method = opts.method || 'HALF_YEAR';
      const to = from ? firstEntryPeriodEnd(from, method) : '';
      const credit = from && to ? proratedCredit(from, to) : '';
      return {
        id,
        type,
        earnedFrom: from,
        earnedTo: to,
        plEarned: credit,
        label: method === 'FULL_YEAR' ? 'First entry (full year)' : 'First entry (half year)',
      };
    }
    case ENTRY_TYPES.ADD_HALF_YEAR: {
      if (opts.manual) {
        return { id, type, earnedFrom: '', earnedTo: '', plEarned: '', label: '' };
      }
      const p = nextCreditPeriod(entries, opts.serviceStart);
      return {
        id,
        type,
        earnedFrom: p.from,
        earnedTo: p.to,
        plEarned: p.credit,
        label: p.standard ? '' : 'Prorated (part period)',
      };
    }
    case ENTRY_TYPES.ADD_FULL_YEAR: {
      if (opts.manual) {
        return { id, type, earnedFrom: '', earnedTo: '', plEarned: '', label: '' };
      }
      const p = nextFullYearPeriod(entries, opts.serviceStart);
      return {
        id,
        type,
        earnedFrom: p.from,
        earnedTo: p.to,
        plEarned: p.credit,
        label: p.standard ? '' : 'Prorated (part period)',
      };
    }
    case ENTRY_TYPES.JOINING_TIME:
      return {
        id,
        type,
        label: 'Joining Time',
        earnedDays: opts.days || 10,
        plEarned: opts.days || 10,
      };
    case ENTRY_TYPES.DIRECT_PL_ADDITION:
      return {
        id,
        type,
        label: opts.label || 'Direct PL addition',
        plEarned: opts.days || 0,
      };
    case ENTRY_TYPES.LEAVE_CANCELLED:
      return {
        id,
        type,
        earnedFrom: opts.from || '',
        earnedTo: opts.to || '',
        plEarned: '',
        label: opts.label || '',
      };
    case ENTRY_TYPES.LEAVE_TAKEN:
      return {
        id,
        type,
        takenFrom: opts.from || '',
        takenTo: opts.to || '',
        plTaken: '',
        label: opts.label || '',
      };
    case ENTRY_TYPES.PL_SURRENDER: {
      const def = nextSurrenderDefault(entries);
      return {
        id,
        type,
        label: opts.label ?? def.label,
        plTaken: opts.days ?? def.days ?? 15,
      };
    }
    case ENTRY_TYPES.STRIKE_DEDUCTION:
      return {
        id,
        type,
        takenFrom: opts.from || '',
        takenTo: opts.to || '',
        plTaken: '',
        label: 'Strike',
      };
    case ENTRY_TYPES.PL_LESS:
      return {
        id,
        type,
        label: opts.label || 'PL Less',
        plTaken: opts.days || 0,
      };
    default:
      return { id, type };
  }
}

// ---------------------------------------------------------------------------
// Named actions (Phase 2 keyboard shortcuts bind here)
// ---------------------------------------------------------------------------

export const actions = {
  addFirstEntry: (entries, opts) => newEntry(ENTRY_TYPES.FIRST_ENTRY, entries, opts),
  addHalfYear: (entries, opts = {}) => newEntry(ENTRY_TYPES.ADD_HALF_YEAR, entries, opts),
  addFullYear: (entries, opts = {}) => newEntry(ENTRY_TYPES.ADD_FULL_YEAR, entries, opts),
  addJoiningTime: (entries, opts) => newEntry(ENTRY_TYPES.JOINING_TIME, entries, opts),
  addDirectPl: (entries, opts) => newEntry(ENTRY_TYPES.DIRECT_PL_ADDITION, entries, opts),
  addLeaveCancelled: (entries, opts) => newEntry(ENTRY_TYPES.LEAVE_CANCELLED, entries, opts),
  addLeaveTaken: (entries, opts) => newEntry(ENTRY_TYPES.LEAVE_TAKEN, entries, opts),
  addPlSurrender: (entries, opts) => newEntry(ENTRY_TYPES.PL_SURRENDER, entries, opts),
  addStrikeDeduction: (entries, opts) => newEntry(ENTRY_TYPES.STRIKE_DEDUCTION, entries, opts),
  addPlLess: (entries, opts) => newEntry(ENTRY_TYPES.PL_LESS, entries, opts),
};

/** Whether an entry type is one-click (no modal) */
export function isOneClick(type) {
  return type === ENTRY_TYPES.ADD_HALF_YEAR || type === ENTRY_TYPES.ADD_FULL_YEAR;
}

/** Whether an entry type opens a form modal */
export function needsModal(type) {
  return !isOneClick(type);
}

/** Preview text for toolbar credit buttons */
export function halfYearPreview(entries, serviceStart) {
  const p = nextCreditPeriod(entries, serviceStart);
  return { from: p.from, to: p.to, credit: p.credit, standard: p.standard };
}

export function fullYearPreview(entries, serviceStart) {
  const p = nextFullYearPeriod(entries, serviceStart);
  return { from: p.from, to: p.to, credit: p.credit, standard: p.standard };
}
