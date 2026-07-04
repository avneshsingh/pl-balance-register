const BACKUP_INVALID_MSG = 'This file is not a valid PL Register backup';

export function validateBackupData(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.employees)) return false;
  return data.employees.every(
    (emp) =>
      emp &&
      typeof emp === 'object' &&
      typeof emp.id === 'string' &&
      typeof emp.name === 'string' &&
      Array.isArray(emp.entries)
  );
}

export function normalizeBackupData(data) {
  if (!validateBackupData(data)) return null;
  return { employees: data.employees };
}

export { BACKUP_INVALID_MSG };
