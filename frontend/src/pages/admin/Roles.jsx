import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, isUnauthorizedError } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import Spinner from '../../components/ui/Spinner.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import RoleFormModal from '../../components/roles/RoleFormModal.jsx';
import AssignPermissionsModal from '../../components/roles/AssignPermissionsModal.jsx';

export default function Roles() {
  const { hasPermission, expireSession } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [roles, setRoles] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [assigningRole, setAssigningRole] = useState(null);

  const canCreate = hasPermission('ROLE_CREATE');
  const canUpdate = hasPermission('ROLE_UPDATE');
  const canDelete = hasPermission('ROLE_DELETE');

  const handleError = (err, fallback) => {
    if (isUnauthorizedError(err)) {
      expireSession();
      navigate('/login', { replace: true });
      return;
    }
    setError(fallback);
  };

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const requests = [api.get('/roles')];
      if (hasPermission('PERMISSION_VIEW')) requests.push(api.get('/permissions'));
      const [rolesRes, permissionsRes] = await Promise.all(requests);
      setRoles(rolesRes.roles);
      if (permissionsRes) setPermissions(permissionsRes.permissions);
    } catch (err) {
      handleError(err, 'Could not load roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (payload) => {
    await api.post('/roles', payload);
    setCreateOpen(false);
    showToast('Role created.');
    loadAll();
  };

  const handleUpdate = async (payload) => {
    await api.put(`/roles/${editingRole.id}`, payload);
    setEditingRole(null);
    showToast('Role updated.');
    loadAll();
  };

  const handleAssignPermissions = async (permissionIds) => {
    await api.put(`/roles/${assigningRole.id}/permissions`, { permissionIds });
    setAssigningRole(null);
    showToast('Permissions updated.');
    loadAll();
  };

  const handleDelete = async (role) => {
    if (!window.confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/roles/${role.id}`);
      showToast('Role deleted.');
      loadAll();
    } catch (err) {
      if (isUnauthorizedError(err)) {
        expireSession();
        navigate('/login', { replace: true });
        return;
      }
      showToast(err.message ?? 'Could not delete role.', 'danger');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 mb-0">Roles</h1>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            Create Role
          </button>
        )}
      </div>

      {loading && <Spinner label="Loading roles..." />}
      {!loading && error && <ErrorState message={error} onRetry={loadAll} />}
      {!loading && !error && roles?.length === 0 && <EmptyState message="No roles found." />}

      {!loading && !error && roles?.length > 0 && (
        <div className="table-responsive">
          <table className="table table-hover align-middle bg-white">
            <thead>
              <tr>
                <th>Role name</th>
                <th>Description</th>
                <th>Permissions</th>
                {(canUpdate || canDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id}>
                  <td className="fw-semibold">{role.name}</td>
                  <td>{role.description ?? <span className="text-muted small">—</span>}</td>
                  <td>
                    {role.permissions.length === 0 ? (
                      <span className="text-muted small">No permissions</span>
                    ) : (
                      <span className="text-muted small">{role.permissions.join(', ')}</span>
                    )}
                  </td>
                  {(canUpdate || canDelete) && (
                    <td className="text-nowrap">
                      {canUpdate && (
                        <>
                          <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => setEditingRole(role)}>
                            Edit
                          </button>
                          <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => setAssigningRole(role)}>
                            Permissions
                          </button>
                        </>
                      )}
                      {canDelete && role.name !== 'ADMIN' && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(role)}>
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {createOpen && <RoleFormModal mode="create" onClose={() => setCreateOpen(false)} onSubmit={handleCreate} />}
      {editingRole && (
        <RoleFormModal mode="edit" initialRole={editingRole} onClose={() => setEditingRole(null)} onSubmit={handleUpdate} />
      )}
      {assigningRole && (
        <AssignPermissionsModal
          role={assigningRole}
          permissions={permissions}
          onClose={() => setAssigningRole(null)}
          onSubmit={handleAssignPermissions}
        />
      )}
    </div>
  );
}
