import { useState } from 'react';
import Modal from '../ui/Modal.jsx';
import { PERMISSION_LABELS } from '../../lib/permissionLabels.js';

export default function AssignPermissionsModal({ role, permissions, onClose, onSubmit }) {
  const [selected, setSelected] = useState(() => new Set(permissions.filter((p) => role.permissions.includes(p.name)).map((p) => p.id)));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onSubmit(Array.from(selected));
    } catch (err) {
      setError(err.message ?? 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={`Permissions — ${role.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="assign-permissions-form" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <form id="assign-permissions-form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {permissions.map((permission) => (
          <div className="form-check" key={permission.id}>
            <input
              className="form-check-input"
              type="checkbox"
              id={`perm-${permission.id}`}
              checked={selected.has(permission.id)}
              onChange={() => toggle(permission.id)}
            />
            <label className="form-check-label" htmlFor={`perm-${permission.id}`}>
              {PERMISSION_LABELS[permission.name] ?? permission.name}
              <span className="text-muted small ms-1">({permission.name})</span>
            </label>
          </div>
        ))}
      </form>
    </Modal>
  );
}
