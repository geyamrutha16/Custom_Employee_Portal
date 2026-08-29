const COLORS = {
  ADMIN: 'danger',
  SALES: 'success',
  SUPPORT: 'warning',
};

export default function RoleBadge({ role }) {
  const color = COLORS[role] ?? 'secondary';
  return <span className={`badge text-bg-${color} me-1`}>{role}</span>;
}
