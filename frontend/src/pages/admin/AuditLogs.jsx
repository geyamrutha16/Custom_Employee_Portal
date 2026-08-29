import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, isUnauthorizedError } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import Spinner from '../../components/ui/Spinner.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';

const ACTION_COLORS = {
  LOGIN_SUCCESS: 'success',
  LOGIN_FAILURE: 'danger',
  LOGOUT: 'secondary',
  UNAUTHORIZED_ACCESS_ATTEMPT: 'danger',
  USER_CREATE: 'primary',
  USER_UPDATE: 'primary',
  USER_DELETE: 'warning',
  ROLE_CREATE: 'primary',
  ROLE_UPDATE: 'primary',
  ROLE_DELETE: 'warning',
  ROLE_ASSIGNMENT: 'info',
  PERMISSION_CHANGE: 'info',
  ZOHO_SERVICE_ACCESS: 'secondary',
};

export default function AuditLogs() {
  const { expireSession } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = (targetPage) => {
    setLoading(true);
    setError('');
    api
      .get(`/audit-logs?page=${targetPage}&limit=20`)
      .then((res) => setData(res))
      .catch((err) => {
        if (isUnauthorizedError(err)) {
          expireSession();
          navigate('/login', { replace: true });
          return;
        }
        setError('Could not load audit logs.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div>
      <h1 className="h4 mb-3">Audit Logs</h1>

      {loading && <Spinner label="Loading audit logs..." />}
      {!loading && error && <ErrorState message={error} onRetry={() => load(page)} />}
      {!loading && !error && data?.logs.length === 0 && <EmptyState message="No audit log entries yet." />}

      {!loading && !error && data?.logs.length > 0 && (
        <>
          <div className="table-responsive">
            <table className="table table-sm table-hover align-middle bg-white">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log) => (
                  <tr key={log.id}>
                    <td className="text-nowrap">{new Date(log.created_at).toLocaleString()}</td>
                    <td>{log.user_name ?? <span className="text-muted small">System / anonymous</span>}</td>
                    <td>
                      <span className={`badge text-bg-${ACTION_COLORS[log.action] ?? 'secondary'}`}>{log.action}</span>
                    </td>
                    <td>
                      {log.resource}
                      {log.resource_id ? ` #${log.resource_id}` : ''}
                    </td>
                    <td className="small text-muted">{log.metadata ? JSON.stringify(log.metadata) : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-between align-items-center">
            <span className="text-muted small">
              Page {data.pagination.page} of {data.pagination.totalPages} ({data.pagination.total} total)
            </span>
            <div className="btn-group">
              <button className="btn btn-outline-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
