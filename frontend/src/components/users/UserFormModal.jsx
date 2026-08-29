import { useState } from 'react';
import Modal from '../ui/Modal.jsx';

const emptyForm = { name: '', email: '', password: '', departmentId: '', status: 'ACTIVE' };

export default function UserFormModal({ mode, initialUser, departments, onClose, onSubmit }) {
  const [form, setForm] = useState(() =>
    mode === 'edit'
      ? {
          name: initialUser.name,
          email: initialUser.email,
          departmentId: initialUser.departmentId ?? '',
          status: initialUser.status,
        }
      : emptyForm
  );
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleChange = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setFormError('');
    setSubmitting(true);
    try {
      const payload =
        mode === 'create'
          ? {
              name: form.name,
              email: form.email,
              password: form.password,
              departmentId: form.departmentId ? Number(form.departmentId) : null,
            }
          : {
              name: form.name,
              email: form.email,
              departmentId: form.departmentId ? Number(form.departmentId) : null,
              status: form.status,
            };
      await onSubmit(payload);
    } catch (err) {
      if (err.details) {
        setErrors(err.details);
      } else {
        setFormError(err.message ?? 'Something went wrong.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={mode === 'create' ? 'Create User' : 'Edit User'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="user-form" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : 'Save'}
          </button>
        </>
      }
    >
      <form id="user-form" onSubmit={handleSubmit} noValidate>
        {formError && <div className="alert alert-danger py-2">{formError}</div>}

        <div className="mb-3">
          <label className="form-label">Name</label>
          <input className="form-control" value={form.name} onChange={handleChange('name')} required />
          {errors.name && <div className="text-danger small">{errors.name[0]}</div>}
        </div>

        <div className="mb-3">
          <label className="form-label">Email</label>
          <input type="email" className="form-control" value={form.email} onChange={handleChange('email')} required />
          {errors.email && <div className="text-danger small">{errors.email[0]}</div>}
        </div>

        {mode === 'create' && (
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={form.password}
              onChange={handleChange('password')}
              required
            />
            <div className="form-text">Min 8 characters, with an uppercase letter, digit, and special character.</div>
            {errors.password && (
              <ul className="text-danger small mb-0 ps-3">
                {errors.password.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mb-3">
          <label className="form-label">Department</label>
          <select className="form-select" value={form.departmentId} onChange={handleChange('departmentId')}>
            <option value="">None</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {mode === 'edit' && (
          <div className="mb-3">
            <label className="form-label">Status</label>
            <select className="form-select" value={form.status} onChange={handleChange('status')}>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
        )}
      </form>
    </Modal>
  );
}
