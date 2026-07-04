import React, { useState, useEffect } from 'react';
import { useModalKeyboard } from '../hooks/useModalKeyboard';

export default function EmployeeModal({ mode, employee, onSave, onClose }) {
  const [name, setName] = useState(employee?.name || '');
  const [designation, setDesignation] = useState(employee?.designation || '');

  useEffect(() => {
    setName(employee?.name || '');
    setDesignation(employee?.designation || '');
  }, [employee]);

  const valid = name.trim().length > 0;

  const submit = () => {
    if (!valid) return;
    onSave({ name: name.trim(), designation: designation.trim() });
  };

  const modalRef = useModalKeyboard({ valid, onSubmit: submit, onClose });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" ref={modalRef} onClick={(ev) => ev.stopPropagation()}>
        <div className="modal-head">
          <h3>{mode === 'add' ? 'Add Employee' : 'Edit Employee'}</h3>
          <button className="modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <label>Name (required)
            <input
              type="text"
              value={name}
              placeholder="e.g., Sh. Arvind Kumar Parashar"
              onChange={(ev) => setName(ev.target.value)}
            />
          </label>
          <label>Designation (optional)
            <input
              type="text"
              value={designation}
              placeholder="e.g., Reader Grade-II"
              onChange={(ev) => setDesignation(ev.target.value)}
            />
          </label>
        </div>

        <div className="modal-foot">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!valid} onClick={submit}>
            {mode === 'add' ? 'Add employee' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
