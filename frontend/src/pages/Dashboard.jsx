import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, isUnauthorizedError } from '../context/AuthContext.jsx';
import { api } from '../lib/api.js';
import Spinner from '../components/ui/Spinner.jsx';
import ErrorState from '../components/ui/ErrorState.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import RoleBadge from '../components/ui/RoleBadge.jsx';

export default function Dashboard() {
  const { user, hasPermission, expireSession } = useAuth();
  const navigate = useNavigate();
  const [services, setServices] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadServices = () => {
    setLoading(true);
    setError('');
    api
      .get('/zoho/services')
      .then((data) => setServices(data.services))
      .catch((err) => {
        if (isUnauthorizedError(err)) {
          expireSession();
          navigate('/login', { replace: true });
          return;
        }
        setError('Could not load your Zoho services.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadServices, []);

  const authorizedServices = services?.filter((s) => s.authorized) ?? [];

  return (
    <div>
      <div className="mb-4">
        <h1 className="h3 mb-1">Welcome, {user?.name}</h1>
        <div>
          {user?.roles?.map((role) => (
            <RoleBadge key={role} role={role} />
          ))}
        </div>
      </div>

      <h2 className="h5 mb-3">Your Zoho Services</h2>

      {loading && <Spinner label="Loading your services..." />}
      {!loading && error && <ErrorState message={error} onRetry={loadServices} />}
      {!loading && !error && authorizedServices.length === 0 && (
        <EmptyState message="You don't have access to any Zoho services yet. Contact an administrator." />
      )}

      {!loading && !error && authorizedServices.length > 0 && (
        <div className="row g-3">
          {authorizedServices.map((service) => (
            <div className="col-12 col-sm-6 col-lg-4" key={service.key}>
              {service.external ? (
                <a href={service.path} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                  <div className="card h-100 shadow-sm border-0">
                    <div className="card-body">
                      <h3 className="h6 mb-2">
                        {service.label} <span className="text-muted small">↗</span>
                      </h3>
                      <p className="text-muted small mb-0">Opens the real {service.label} portal in a new tab</p>
                    </div>
                  </div>
                </a>
              ) : (
                <Link to={service.path} className="text-decoration-none">
                  <div className="card h-100 shadow-sm border-0">
                    <div className="card-body">
                      <h3 className="h6 mb-2">{service.label}</h3>
                      <p className="text-muted small mb-0">Open the {service.label} dashboard</p>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          ))}
        </div>
      )}

      {hasPermission('USER_VIEW') && (
        <>
          <h2 className="h5 mt-4 mb-3">Administration</h2>
          <div className="row g-3">
            {hasPermission('USER_VIEW') && (
              <div className="col-12 col-sm-6 col-lg-4">
                <Link to="/admin/users" className="text-decoration-none">
                  <div className="card h-100 shadow-sm border-0">
                    <div className="card-body">
                      <h3 className="h6 mb-2">Users</h3>
                      <p className="text-muted small mb-0">Manage employee accounts and role assignments</p>
                    </div>
                  </div>
                </Link>
              </div>
            )}
            {hasPermission('ROLE_VIEW') && (
              <div className="col-12 col-sm-6 col-lg-4">
                <Link to="/admin/roles" className="text-decoration-none">
                  <div className="card h-100 shadow-sm border-0">
                    <div className="card-body">
                      <h3 className="h6 mb-2">Roles</h3>
                      <p className="text-muted small mb-0">Manage roles and their permissions</p>
                    </div>
                  </div>
                </Link>
              </div>
            )}
            {hasPermission('AUDIT_VIEW') && (
              <div className="col-12 col-sm-6 col-lg-4">
                <Link to="/admin/audit-logs" className="text-decoration-none">
                  <div className="card h-100 shadow-sm border-0">
                    <div className="card-body">
                      <h3 className="h6 mb-2">Audit Logs</h3>
                      <p className="text-muted small mb-0">Review security and activity history</p>
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
