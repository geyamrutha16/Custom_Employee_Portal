import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { API_URL } from '../../lib/api.js';

const ADMIN_LINKS = [
  { to: '/admin/users', label: 'Users', permission: 'USER_VIEW' },
  { to: '/admin/roles', label: 'Roles', permission: 'ROLE_VIEW' },
  { to: '/admin/audit-logs', label: 'Audit Logs', permission: 'AUDIT_VIEW' },
];

const ZOHO_LINKS = [
  // Full-page navigation into Zoho's own OAuth login/consent, then straight into
  // the real Zoho app — no data ever rendered inside this portal.
  { to: `${API_URL}/zoho/oauth/crm/authorize`, label: 'Zoho CRM', permission: 'ZOHO_CRM_VIEW', external: true },
  { to: `${API_URL}/zoho/oauth/desk/authorize`, label: 'Zoho Desk', permission: 'ZOHO_DESK_VIEW', external: true },
];

function Section({ title, links, hasPermission, onNavigate }) {
  const visible = links.filter((link) => hasPermission(link.permission));
  if (visible.length === 0) return null;

  return (
    <>
      <div className="text-uppercase text-secondary small fw-semibold px-3 mt-3 mb-1">{title}</div>
      {visible.map((link) =>
        link.external ? (
          <a
            key={link.to}
            href={link.to}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onNavigate}
            className="nav-link px-3 py-2 rounded text-body"
          >
            {link.label} <span className="text-muted small">↗</span>
          </a>
        ) : (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={onNavigate}
            className={({ isActive }) => `nav-link px-3 py-2 rounded ${isActive ? 'active bg-primary text-white' : 'text-body'}`}
          >
            {link.label}
          </NavLink>
        )
      )}
    </>
  );
}

export default function NavLinks({ onNavigate }) {
  const { hasPermission } = useAuth();

  return (
    <nav className="nav flex-column gap-1">
      <NavLink
        to="/dashboard"
        onClick={onNavigate}
        className={({ isActive }) => `nav-link px-3 py-2 rounded ${isActive ? 'active bg-primary text-white' : 'text-body'}`}
      >
        Dashboard
      </NavLink>
      <Section title="Admin" links={ADMIN_LINKS} hasPermission={hasPermission} onNavigate={onNavigate} />
      <Section title="Zoho Services" links={ZOHO_LINKS} hasPermission={hasPermission} onNavigate={onNavigate} />
    </nav>
  );
}
