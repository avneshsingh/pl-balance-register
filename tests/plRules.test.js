import { describe, it, expect } from 'vitest';
import {
  daysInclusive,
  proratedCredit,
  computeLedger,
  capForPeriodEnd,
  CAP_LEGACY,
  CAP_MODERN,
  ENTRY_TYPES,
  actions,
  nextCreditPeriod,
  nextFullYearPeriod,
} from '../src/lib/plRules.js';

describe('proration', () => {
  it('02-09-1996 → 31-12-1996 = 121 days → credit 10', () => {
    expect(daysInclusive('1996-09-02', '1996-12-31')).toBe(121);
    expect(proratedCredit('1996-09-02', '1996-12-31')).toBe(10);
  });

  it('01-07-2026 → 30-09-2026 = 92 days → credit 7.5', () => {
    expect(daysInclusive('2026-07-01', '2026-09-30')).toBe(92);
    expect(proratedCredit('2026-07-01', '2026-09-30')).toBe(7.5);
  });

  it('184 days → 15; 365 days → 30', () => {
    expect(proratedCredit('1996-01-01', '1996-07-03')).toBe(15); // 184 days
    expect(proratedCredit('1996-01-01', '1996-12-31')).toBe(30);
  });
});

describe('cap thresholds', () => {
  it('300 for periods ending ≤ 2012-12-31', () => {
    expect(capForPeriodEnd('2012-12-31')).toBe(CAP_LEGACY);
    expect(capForPeriodEnd('2012-06-30')).toBe(CAP_LEGACY);
  });

  it('315 from 2013-01-01 onwards', () => {
    expect(capForPeriodEnd('2013-01-01')).toBe(CAP_MODERN);
    expect(capForPeriodEnd('2026-12-31')).toBe(CAP_MODERN);
  });
});

describe('lapse recomputation', () => {
  it('295 + half-year 15 at cap 300 → +15, 10 lapsed, balance 300', () => {
    const entries = [
      { id: 'a', type: ENTRY_TYPES.DIRECT_PL_ADDITION, plEarned: 295, earnedTo: '2012-06-30' },
      {
        id: 'b',
        type: ENTRY_TYPES.ADD_HALF_YEAR,
        earnedFrom: '2012-07-01',
        earnedTo: '2012-12-31',
        plEarned: 15,
      },
    ];
    const row = computeLedger(entries)[1];
    expect(row.plEarned).toBe(15);
    expect(row.lapsed).toBe(10);
    expect(row.balAfterEarned).toBe(300);
    expect(row.balAfterTaken).toBe(300);
  });

  it('editing upstream entry recomputes downstream lapse', () => {
    const entries = [
      { id: 'a', type: ENTRY_TYPES.DIRECT_PL_ADDITION, plEarned: 290, earnedTo: '2012-06-30' },
      {
        id: 'b',
        type: ENTRY_TYPES.ADD_HALF_YEAR,
        earnedFrom: '2012-07-01',
        earnedTo: '2012-12-31',
        plEarned: 15,
      },
    ];
    let ledger = computeLedger(entries);
    expect(ledger[1].lapsed).toBe(5); // 290+15=305, cap 300, lapse 5

    entries[0].plEarned = 295;
    ledger = computeLedger(entries);
    expect(ledger[1].lapsed).toBe(10);
    expect(ledger[1].balAfterTaken).toBe(300);
  });
});

describe('negative balance', () => {
  it('balance 5, leave 12 days → balance −7', () => {
    const entries = [
      { id: 'a', type: ENTRY_TYPES.DIRECT_PL_ADDITION, plEarned: 5 },
      {
        id: 'b',
        type: ENTRY_TYPES.LEAVE_TAKEN,
        takenFrom: '2024-01-01',
        takenTo: '2024-01-12',
      },
    ];
    const ledger = computeLedger(entries);
    expect(ledger[0].balAfterTaken).toBe(5);
    expect(ledger[1].plTaken).toBe(12);
    expect(ledger[1].balAfterTaken).toBe(-7);
    expect(ledger[1].isNegative).toBe(true);
  });

  it('after negative balance, half-year credit of 15 → balance 8', () => {
    const entries = [
      { id: 'a', type: ENTRY_TYPES.DIRECT_PL_ADDITION, plEarned: 5 },
      {
        id: 'b',
        type: ENTRY_TYPES.LEAVE_TAKEN,
        takenFrom: '2024-01-01',
        takenTo: '2024-01-12',
      },
      {
        id: 'c',
        type: ENTRY_TYPES.ADD_HALF_YEAR,
        earnedFrom: '2024-07-01',
        earnedTo: '2024-12-31',
        plEarned: 15,
      },
    ];
    const ledger = computeLedger(entries);
    expect(ledger[1].balAfterTaken).toBe(-7);
    expect(ledger[2].balAfterTaken).toBe(8);
    expect(ledger[2].isNegative).toBe(false);
  });
});

describe('half-year and full-year credit periods', () => {
  const after1998 = [
    {
      id: '1',
      type: ENTRY_TYPES.FIRST_ENTRY,
      earnedFrom: '1996-09-02',
      earnedTo: '1998-12-31',
      plEarned: 10,
    },
  ];

  it('after entry ending 31-12-1998, half year is 01-01-1999→30-06-1999 with plEarned 15', () => {
    const p = nextCreditPeriod(after1998);
    expect(p.from).toBe('1999-01-01');
    expect(p.to).toBe('1999-06-30');
    expect(p.credit).toBe(15);
    const entry = actions.addHalfYear(after1998);
    expect(entry.plEarned).toBe(15);
    expect(entry.earnedFrom).toBe('1999-01-01');
    expect(entry.earnedTo).toBe('1999-06-30');
  });

  it('after entry ending 31-12-1998, full year is 01-01-1999→31-12-1999 with plEarned 30', () => {
    const p = nextFullYearPeriod(after1998);
    expect(p.from).toBe('1999-01-01');
    expect(p.to).toBe('1999-12-31');
    expect(p.credit).toBe(30);
    const entry = actions.addFullYear(after1998);
    expect(entry.plEarned).toBe(30);
    expect(entry.earnedFrom).toBe('1999-01-01');
    expect(entry.earnedTo).toBe('1999-12-31');
  });

  it('after period ending 30-06-2005, half year is 01-07-2005→31-12-2005 with +15', () => {
    const entries = [
      { id: '1', earnedFrom: '2005-01-01', earnedTo: '2005-06-30', plEarned: 15 },
    ];
    const p = nextCreditPeriod(entries);
    expect(p.from).toBe('2005-07-01');
    expect(p.to).toBe('2005-12-31');
    expect(p.credit).toBe(15);
    const entry = actions.addHalfYear(entries);
    expect(entry.plEarned).toBe(15);
  });
});

describe('leave cancelled credit', () => {
  it('10-03-2020 → 14-03-2020 credits 5 days', () => {
    const entry = {
      id: 'lc',
      type: ENTRY_TYPES.LEAVE_CANCELLED,
      earnedFrom: '2020-03-10',
      earnedTo: '2020-03-14',
      plEarned: 5,
    };
    const ledger = computeLedger([entry]);
    expect(ledger[0].plEarned).toBe(5);
    expect(ledger[0].balAfterTaken).toBe(5);
  });
});
