import { useAuth } from '../../context/AuthContext.jsx';

export default function RequirePermission({ permission, children }) {
  const { hasPermission } = useAuth();

  if (!hasPermission(permission)) {
    return (
      <div className="alert alert-warning">
        <h5 className="alert-heading">Access denied</h5>
        <p className="mb-0">You do not have permission to view this page.</p>
      </div>
    );
  }

  return children;
}
