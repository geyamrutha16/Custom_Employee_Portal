import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, isUnauthorizedError } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { api } from '../../lib/api.js';
import Spinner from '../../components/ui/Spinner.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import RoleBadge from '../../components/ui/RoleBadge.jsx';
import UserFormModal from '../../components/users/UserFormModal.jsx';
import AssignRolesModal from '../../components/users/AssignRolesModal.jsx';

export default function Users() {
  const { hasPermission, expireSession, user: currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [users, setUsers] = useState(null);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [assigningUser, setAssigningUser] = useState(null);

  const canCreate = hasPermission('USER_CREATE');
  const canUpdate = hasPermission('USER_UPDATE');
  const canDelete = hasPermission('USER_DELETE');

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
      const requests = [api.get('/users')];
      if (canCreate || canUpdate) {
        requests.push(api.get('/roles'), api.get('/departments'));
      }
      const [usersRes, rolesRes, departmentsRes] = await Promise.all(requests);
      setUsers(usersRes.users);
      if (rolesRes) setRoles(rolesRes.roles);
      if (departmentsRes) setDepartments(departmentsRes.departments);
    } catch (err) {
      handleError(err, 'Could not load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async (payload) => {
    await api.post('/users', payload);
    setCreateOpen(false);
    showToast('User created.');
    loadAll();
  };

  const handleUpdate = async (payload) => {
    await api.put(`/users/${editingUser.id}`, payload);
    setEditingUser(null);
    showToast('User updated.');
    loadAll();
  };

  const handleAssignRoles = async (roleIds) => {
    await api.put(`/users/${assigningUser.id}/roles`, { roleIds });
    setAssigningUser(null);
    showToast('Roles updated.');
    loadAll();
  };

  const handleDeactivate = async (user) => {
    if (!window.confirm(`Deactivate ${user.name}? They will no longer be able to log in.`)) return;
    try {
      await api.delete(`/users/${user.id}`);
      showToast('User deactivated.');
      loadAll();
    } catch (err) {
      if (isUnauthorizedError(err)) {
        expireSession();
        navigate('/login', { replace: true });
        return;
      }
      showToast(err.message ?? 'Could not deactivate user.', 'danger');
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 mb-0">Users</h1>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setCreateOpen(true)}>
            Create User
          </button>
        )}
      </div>

      {loading && <Spinner label="Loading users..." />}
      {!loading && error && <ErrorState message={error} onRetry={loadAll} />}
      {!loading && !error && users?.length === 0 && <EmptyState message="No users found." />}

      {!loading && !error && users?.length > 0 && (
        <div className="table-responsive">
          <table className="table table-hover align-middle bg-white">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Role(s)</th>
                <th>Department</th>
                <th>Created</th>
                {(canUpdate || canDelete) && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>
                    <span className={`badge text-bg-${u.status === 'ACTIVE' ? 'success' : 'secondary'}`}>{u.status}</span>
                  </td>
                  <td>
                    {u.roles.length === 0 ? (
                      <span className="text-muted small">No roles</span>
                    ) : (
                      u.roles.map((r) => <RoleBadge key={r} role={r} />)
                    )}
                  </td>
                  <td>{u.department ?? <span className="text-muted small">—</span>}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  {(canUpdate || canDelete) && (
                    <td className="text-nowrap">
                      {canUpdate && (
                        <>
                          <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => setEditingUser(u)}>
                            Edit
                          </button>
                          <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => setAssigningUser(u)}>
                            Roles
                          </button>
                        </>
                      )}
                      {canDelete && u.status === 'ACTIVE' && (
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeactivate(u)}>
                          {u.id === currentUser.id ? 'Deactivate (self)' : 'Deactivate'}
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

      {createOpen && (
        <UserFormModal mode="create" departments={departments} onClose={() => setCreateOpen(false)} onSubmit={handleCreate} />
      )}
      {editingUser && (
        <UserFormModal
          mode="edit"
          initialUser={editingUser}
          departments={departments}
          onClose={() => setEditingUser(null)}
          onSubmit={handleUpdate}
        />
      )}
      {assigningUser && (
        <AssignRolesModal
          user={assigningUser}
          roles={roles}
          onClose={() => setAssigningUser(null)}
          onSubmit={handleAssignRoles}
        />
      )}
    </div>
  );
}
