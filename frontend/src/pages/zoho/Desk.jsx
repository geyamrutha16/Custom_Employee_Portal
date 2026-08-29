import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, isUnauthorizedError } from '../../context/AuthContext.jsx';
import { api } from '../../lib/api.js';
import Spinner from '../../components/ui/Spinner.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import DemoBadge from '../../components/zoho/DemoBadge.jsx';

const PRIORITY_COLORS = { High: 'danger', Medium: 'warning', Low: 'secondary' };

export default function Desk() {
  const { expireSession } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    api
      .get('/zoho/desk')
      .then(setData)
      .catch((err) => {
        if (isUnauthorizedError(err)) {
          expireSession();
          navigate('/login', { replace: true });
          return;
        }
        setError('Could not load Zoho Desk data.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 mb-0">Zoho Desk</h1>
        {data && <DemoBadge source={data.source} />}
      </div>

      {loading && <Spinner label="Loading Desk data..." />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && data && (
        <>
          <div className="row g-3 mb-3">
            <div className="col-auto">
              <div className="card border-0 shadow-sm" style={{ minWidth: 160 }}>
                <div className="card-body">
                  <div className="text-muted small">Total Tickets</div>
                  <div className="fs-3 fw-semibold">{data.totalTickets}</div>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="card border-0 shadow-sm" style={{ minWidth: 160 }}>
                <div className="card-body">
                  <div className="text-muted small">Open</div>
                  <div className="fs-3 fw-semibold text-danger">{data.openTickets}</div>
                </div>
              </div>
            </div>
            <div className="col-auto">
              <div className="card border-0 shadow-sm" style={{ minWidth: 160 }}>
                <div className="card-body">
                  <div className="text-muted small">Closed</div>
                  <div className="fs-3 fw-semibold text-success">{data.closedTickets}</div>
                </div>
              </div>
            </div>
          </div>

          {data.tickets.length === 0 ? (
            <EmptyState message="No tickets found." />
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle bg-white">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Priority</th>
                  </tr>
                </thead>
                <tbody>
                  {data.tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>{ticket.id}</td>
                      <td>{ticket.subject}</td>
                      <td>
                        <span className={`badge text-bg-${ticket.status === 'Open' ? 'danger' : 'success'}`}>{ticket.status}</span>
                      </td>
                      <td>
                        <span className={`badge text-bg-${PRIORITY_COLORS[ticket.priority] ?? 'secondary'}`}>{ticket.priority}</span>
                      </td>
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
