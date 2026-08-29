import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, isUnauthorizedError } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import Spinner from '../../components/ui/Spinner.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import DemoBadge from '../../components/zoho/DemoBadge.jsx';

export default function Crm() {
  const { expireSession } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api
      .get('/zoho/crm')
      .then(setData)
      .catch((err) => {
        if (isUnauthorizedError(err)) {
          expireSession();
          navigate('/login', { replace: true });
          return;
        }
        setError('Could not load Zoho CRM data.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 mb-0">Zoho CRM</h1>
        {data && <DemoBadge source={data.source} />}
      </div>

      {loading && <Spinner label="Loading CRM data..." />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && data && (
        <>
          <div className="card border-0 shadow-sm mb-3" style={{ maxWidth: 240 }}>
            <div className="card-body">
              <div className="text-muted small">Total Contacts</div>
              <div className="fs-3 fw-semibold">{data.totalContacts}</div>
            </div>
          </div>

          {data.contacts.length === 0 ? (
            <EmptyState message="No contacts found." />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle bg-white">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Company</th>
                  </tr>
                </thead>
                <tbody>
                  {data.contacts.map((contact) => (
                    <tr key={contact.id}>
                      <td>{contact.name}</td>
                      <td>{contact.email}</td>
                      <td>{contact.phone}</td>
                      <td>{contact.company}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
