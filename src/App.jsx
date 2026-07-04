import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import {
  computeLedger,
  actions,
  isOneClick,
  needsModal,
  currentBalance,
  capForPeriodEnd,
} from './lib/plRules';
import Toolbar from './components/Toolbar';
import Ledger from './components/Ledger';
import EntryModal from './components/EntryModal';
import EmployeeModal from './components/EmployeeModal';
import { buildPrintHtml } from './lib/printTemplate';
import { excelBufferFromPayload, downloadExcelBuffer } from './lib/exportExcel';

const isElectron = typeof window !== 'undefined' && !!window.api;

const webStore = {
  loadData: async () => JSON.parse(localStorage.getItem('pl-register') || '{"employees":[]}'),
  saveData: async (d) => localStorage.setItem('pl-register', JSON.stringify(d)),
  backup: async () => alert('Backup is available in the installed desktop app.'),
  restore: async () => null,
  saveExcel: async () => false,
  exportPdf: async ({ html }) => {
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.print();
    return true;
  },
};
const api = isElectron ? window.api : webStore;

function balanceTone(bal, cap) {
  if (bal < 0) return ' negative';
  if (bal === cap) return ' at-cap';
  return '';
}

/** Map entry type → named action (Phase 2 shortcuts bind here) */
const ACTION_MAP = {
  FIRST_ENTRY: (entries, emp) => actions.addFirstEntry(entries, {}),
  ADD_HALF_YEAR: (entries, emp) => actions.addHalfYear(entries, { serviceStart: emp.serviceStart }),
  ADD_FULL_YEAR: (entries, emp) => actions.addFullYear(entries, { serviceStart: emp.serviceStart }),
  JOINING_TIME: (entries) => actions.addJoiningTime(entries, {}),
  DIRECT_PL_ADDITION: (entries) => actions.addDirectPl(entries, {}),
  LEAVE_TAKEN: (entries) => actions.addLeaveTaken(entries, {}),
  PL_SURRENDER: (entries) => actions.addPlSurrender(entries, {}),
  STRIKE_DEDUCTION: (entries) => actions.addStrikeDeduction(entries, {}),
  PL_LESS: (entries) => actions.addPlLess(entries, {}),
};

export default function App() {
  const [data, setData] = useState({ employees: [] });
  const [selectedId, setSelectedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [employeeModal, setEmployeeModal] = useState(null);
  const [query, setQuery] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    api.loadData().then((d) => {
      setData(d && d.employees ? d : { employees: [] });
      if (d?.employees?.length) setSelectedId(d.employees[0].id);
      loaded.current = true;
    });
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    const t = setTimeout(() => {
      api.saveData(data).then(() => {
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 1200);
      });
    }, 400);
    return () => clearTimeout(t);
  }, [data]);

  const employee = data.employees.find((e) => e.id === selectedId) || null;
  const entries = employee?.entries || [];
  const ledger = useMemo(() => computeLedger(entries), [entries]);
  const balance = currentBalance(entries);
  const applicableCap = useMemo(() => {
    const lastCredit = [...entries].reverse().find((e) => e.earnedTo);
    return capForPeriodEnd(lastCredit?.earnedTo || null);
  }, [entries]);
  const atCap = balance === applicableCap && balance >= 0;

  const updateEmployee = useCallback((id, fn) => {
    setData((d) => ({
      ...d,
      employees: d.employees.map((e) => (e.id === id ? fn(e) : e)),
    }));
  }, []);

  const saveEmployee = ({ name, designation }) => {
    if (employeeModal?.mode === 'add') {
      const emp = {
        id: 'emp' + Date.now(),
        name,
        designation,
        entries: [],
      };
      setData((d) => ({ ...d, employees: [...d.employees, emp] }));
      setSelectedId(emp.id);
    } else if (employeeModal?.id) {
      updateEmployee(employeeModal.id, (e) => ({ ...e, name, designation }));
    }
    setEmployeeModal(null);
  };

  const removeEmployee = (id) => {
    const emp = data.employees.find((e) => e.id === id);
    if (!confirm(`Delete "${emp?.name}" and all ${emp?.entries?.length || 0} entries? This cannot be undone.`)) return;
    setData((d) => ({ ...d, employees: d.employees.filter((e) => e.id !== id) }));
    if (selectedId === id) setSelectedId(null);
  };

  const runEntryAction = useCallback((type) => {
    if (!employee) return;
    const fn = ACTION_MAP[type];
    if (!fn) return;

    if (isOneClick(type)) {
      const entry = fn(entries, employee);
      updateEmployee(employee.id, (e) => ({ ...e, entries: [...e.entries, entry] }));
    } else if (needsModal(type)) {
      const entry = fn(entries, employee);
      setModal({ mode: 'add', type, entry });
    }
  }, [employee, entries, updateEmployee]);

  const saveEntry = (entry) => {
    updateEmployee(employee.id, (e) => {
      const exists = e.entries.some((x) => x.id === entry.id);
      const next = exists
        ? e.entries.map((x) => (x.id === entry.id ? entry : x))
        : [...e.entries, entry];
      const serviceStart =
        entry.type === 'FIRST_ENTRY' && entry.earnedFrom
          ? entry.earnedFrom
          : e.serviceStart;
      return { ...e, entries: next, serviceStart };
    });
    setModal(null);
  };

  const deleteEntry = (id) => {
    updateEmployee(employee.id, (e) => ({ ...e, entries: e.entries.filter((x) => x.id !== id) }));
  };

  const moveEntry = (id, dir) => {
    updateEmployee(employee.id, (e) => {
      const i = e.entries.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= e.entries.length) return e;
      const arr = [...e.entries];
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return { ...e, entries: arr };
    });
  };

  const editEntry = (entry) => setModal({ mode: 'edit', type: entry.type, entry: { ...entry } });

  const doExcel = async () => {
    if (!employee) return;
    const payload = { employee, rows: ledger };
    const buffer = await excelBufferFromPayload(payload);
    if (isElectron) {
      await api.saveExcel({
        name: employee.name,
        data: Array.from(new Uint8Array(buffer)),
      });
    } else {
      downloadExcelBuffer(buffer, employee.name);
    }
  };

  const doPdf = () =>
    employee && api.exportPdf({ name: employee.name, html: buildPrintHtml(employee, ledger, balance) });

  const filtered = data.employees.filter((e) =>
    e.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-seal">PL</div>
          <div>
            <div className="brand-title">PL Balance Register</div>
            <div className="brand-sub">Privilege Leave Ledger</div>
          </div>
        </div>
        <button className="btn btn-primary btn-block" onClick={() => setEmployeeModal({ mode: 'add' })}>
          + Add Employee
        </button>
        <input
          className="search"
          placeholder="Search employees…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="emp-list">
          {filtered.length === 0 && (
            <div className="empty-side">No employees yet.<br />Add your first record above.</div>
          )}
          {filtered.map((e) => {
            const bal = currentBalance(e.entries || []);
            const cap = capForPeriodEnd(
              [...(e.entries || [])].reverse().find((x) => x.earnedTo)?.earnedTo
            );
            return (
              <div
                key={e.id}
                className={'emp-item' + (e.id === selectedId ? ' active' : '')}
                onClick={() => setSelectedId(e.id)}
              >
                <div className="emp-name">{e.name}</div>
                <div className="emp-meta">
                  <span>{e.designation || '—'}</span>
                  <span className={'emp-bal' + balanceTone(bal, cap)}>{bal}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="side-footer">
          <button className="btn btn-ghost" onClick={() => api.backup()}>Backup</button>
          <button
            className="btn btn-ghost"
            onClick={async () => {
              const d = await api.restore();
              if (d) {
                setData(d);
                setSelectedId(d.employees?.[0]?.id || null);
              }
            }}
          >Restore</button>
        </div>
      </aside>

      <main className="main">
        {!employee ? (
          <div className="empty-main">
            <div className="empty-seal">॥</div>
            <h2>Select or add an employee</h2>
            <p>
              Start with a <b>First Entry</b> (date of joining). Then record leave, surrender, or strike
              events and advance the register with one-click half-year or full-year credits.
            </p>
          </div>
        ) : (
          <>
            <header className="emp-header">
              <div>
                <h1
                  onDoubleClick={() => setEmployeeModal({ mode: 'edit', id: employee.id, employee })}
                  title="Double-click to edit"
                >
                  {employee.name}
                </h1>
                <div className="emp-desig">{employee.designation}</div>
              </div>
              <div className="header-right">
                <div className={'balance-card' + balanceTone(balance, applicableCap)}>
                  <div className="balance-label">PL Balance</div>
                  <div className="balance-value">{balance}</div>
                  {atCap && (
                    <div className="balance-cap-note">at {applicableCap}-day cap</div>
                  )}
                </div>
                <div className="header-actions">
                  <button className="btn" onClick={doExcel} disabled={!ledger.length}>Export Excel</button>
                  <button className="btn" onClick={doPdf} disabled={!ledger.length}>Export PDF</button>
                  <button className="btn btn-danger-ghost" onClick={() => removeEmployee(employee.id)}>Delete</button>
                </div>
              </div>
            </header>

            <Toolbar
              onAdd={runEntryAction}
              entries={entries}
              serviceStart={employee.serviceStart}
            />

            <Ledger
              rows={ledger}
              onEdit={editEntry}
              onDelete={deleteEntry}
              onMove={moveEntry}
            />
          </>
        )}
        <div className={'save-flash' + (savedFlash ? ' show' : '')}>Saved</div>
      </main>

      {modal && (
        <EntryModal
          mode={modal.mode}
          type={modal.type}
          entry={modal.entry}
          entries={entries}
          onSave={saveEntry}
          onClose={() => setModal(null)}
        />
      )}

      {employeeModal && (
        <EmployeeModal
          mode={employeeModal.mode}
          employee={employeeModal.employee || null}
          onSave={saveEmployee}
          onClose={() => setEmployeeModal(null)}
        />
      )}
    </div>
  );
}
