import { describe, it, expect } from 'vitest';
import { validateBackupData, normalizeBackupData } from '../src/lib/validateBackup.js';

describe('validateBackupData', () => {
  it('accepts valid backup shape', () => {
    const data = {
      employees: [
        { id: 'emp1', name: 'Test', designation: 'Reader', entries: [] },
      ],
    };
    expect(validateBackupData(data)).toBe(true);
    expect(normalizeBackupData(data)).toEqual({ employees: data.employees });
  });

  it('rejects invalid shapes', () => {
    expect(validateBackupData(null)).toBe(false);
    expect(validateBackupData({})).toBe(false);
    expect(validateBackupData({ employees: 'x' })).toBe(false);
    expect(validateBackupData({ employees: [{ id: 1, name: 'x', entries: [] }] })).toBe(false);
    expect(normalizeBackupData({ employees: [] })).toEqual({ employees: [] });
  });
});
