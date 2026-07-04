import { describe, it, expect } from 'vitest';
import { ENTRY_TYPES } from '../src/lib/plRules.js';
import {
  exportTakenParticularsLabel,
  exportTakenHasDates,
  exportEarnedFromText,
} from '../src/lib/exportParticulars.js';
import { buildPrintHtml } from '../src/lib/printTemplate.js';

describe('export particulars whitelist', () => {
  it('does not export internal labels on credit rows', () => {
    const creditRow = {
      type: ENTRY_TYPES.ADD_HALF_YEAR,
      earnedFrom: '1999-01-01',
      earnedTo: '1999-06-30',
      plEarned: 15,
      label: 'Prorated (part period)',
    };
    expect(exportTakenParticularsLabel(creditRow)).toBe('');
    expect(exportTakenHasDates(creditRow)).toBe(false);
    expect(exportEarnedFromText(creditRow)).toBe('');
  });

  it('exports surrender label only for surrender rows', () => {
    const row = {
      type: ENTRY_TYPES.PL_SURRENDER,
      label: 'PL Surrender 2008-09',
      plTaken: 15,
    };
    expect(exportTakenParticularsLabel(row)).toBe('PL Surrender 2008-09');
  });

  it('PDF contains Total PL Balance and no internal note strings', () => {
    const employee = { name: 'Test', designation: 'Reader' };
    const rows = [
      {
        sr: 1,
        type: ENTRY_TYPES.FIRST_ENTRY,
        earnedFrom: '1996-09-02',
        earnedTo: '1996-12-31',
        earnedDays: 121,
        plEarned: 10,
        label: 'First entry (half year)',
        balAfterEarned: 10,
        balAfterTaken: 10,
      },
      {
        sr: 2,
        type: ENTRY_TYPES.PL_SURRENDER,
        label: 'PL Surrender 2008-09',
        plTaken: 15,
        balAfterEarned: 10,
        balAfterTaken: -5,
      },
    ];
    const html = buildPrintHtml(employee, rows, -5);
    expect(html).toContain('Total PL Balance');
    expect(html).not.toContain('PL Balance as on');
    expect(html).not.toContain('First entry');
    expect(html).not.toContain('Prorated');
    expect(html).toContain('PL Surrender 2008-09');
  });
});
