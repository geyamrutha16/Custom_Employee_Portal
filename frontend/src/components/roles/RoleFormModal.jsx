import { useState } from 'react';
import Modal from '../ui/Modal.jsx';

export default function RoleFormModal({ mode, initialRole, onClose, onSubmit }) {
  const [name, setName] = useState(initialRole?.name ?? '');
  const [description, setDescription] = useState(initialRole?.description ?? '');
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setFormError('');
    setSubmitting(true);
    try {
      const payload = mode === 'create' ? { name, description } : { description };
      await onSubmit(payload);
    } catch (err) {
      if (err.details) setErrors(err.details);
      else setFormError(err.message ?? 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={mode === 'create' ? 'Create Role' : `Edit Role — ${initialRole.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="role-form" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <form id="role-form" onSubmit={handleSubmit} noValidate>
        {formError && <div className="alert alert-danger py-2">{formError}</div>}
        {mode === 'create' && (
          <div className="mb-3">
            <label className="form-label">Role name</label>
            <input
              className="form-control text-uppercase"
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="e.g. FINANCE"
              required
            />
            <div className="form-text">Uppercase letters, numbers, underscores only.</div>
            {errors.name && <div className="text-danger small">{errors.name[0]}</div>}
          </div>
        )}
        <div className="mb-3">
          <label className="form-label">Description</label>
          <textarea className="form-control" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </div>
      </form>
    </Modal>
  );
}
