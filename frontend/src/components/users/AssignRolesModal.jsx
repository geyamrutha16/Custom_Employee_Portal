import { useState } from 'react';
import Modal from '../ui/Modal.jsx';

export default function AssignRolesModal({ user, roles, onClose, onSubmit }) {
  const [selected, setSelected] = useState(() => new Set(roles.filter((r) => user.roles.includes(r.name)).map((r) => r.id)));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggle = (roleId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(roleId)) next.delete(roleId);
      else next.add(roleId);
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
      title={`Assign Roles — ${user.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="assign-roles-form" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <form id="assign-roles-form" onSubmit={handleSubmit}>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {roles.map((role) => (
          <div className="form-check" key={role.id}>
            <input
              className="form-check-input"
              type="checkbox"
              id={`role-${role.id}`}
              checked={selected.has(role.id)}
              onChange={() => toggle(role.id)}
            />
            <label className="form-check-label" htmlFor={`role-${role.id}`}>
              {role.name}
              {role.description && <span className="text-muted"> — {role.description}</span>}
            </label>
          </div>
        ))}
      </form>
    </Modal>
  );
}
