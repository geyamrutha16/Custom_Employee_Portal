import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import RoleBadge from '../ui/RoleBadge.jsx';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <nav className="navbar navbar-dark bg-dark px-3 sticky-top">
      <button
        className="btn btn-outline-light d-lg-none me-2"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#sidebarOffcanvas"
        aria-controls="sidebarOffcanvas"
        aria-label="Toggle navigation"
      >
        <span className="navbar-toggler-icon" />
      </button>

      <span className="navbar-brand mb-0 h1 fs-6 fs-md-5">Customer Employee Portal</span>

      <div className="dropdown ms-auto">
        <button
          className="btn btn-dark dropdown-toggle d-flex align-items-center"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
        >
          <span className="me-2 d-none d-sm-inline">{user?.name}</span>
          {user?.roles?.map((role) => <RoleBadge key={role} role={role} />)}
        </button>
        <ul className="dropdown-menu dropdown-menu-end">
          <li>
            <span className="dropdown-item-text text-muted small">{user?.email}</span>
          </li>
          <li>
            <hr className="dropdown-divider" />
          </li>
          <li>
            <button className="dropdown-item" onClick={handleLogout}>
              Logout
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
