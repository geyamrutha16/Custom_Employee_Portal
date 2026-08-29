import { asyncHandler } from '../utils/asyncHandler.js';
import { writeAuditLog } from '../services/auditLog.service.js';
import { getCrmDashboard } from '../services/zoho/zohoCrm.service.js';
import { getDeskDashboard } from '../services/zoho/zohoDesk.service.js';

const SERVICES = [
  { key: 'crm', label: 'Zoho CRM', permission: 'ZOHO_CRM_VIEW', path: '/zoho/crm' },
  { key: 'desk', label: 'Zoho Desk', permission: 'ZOHO_DESK_VIEW', path: '/zoho/desk' },
];

export const getServices = asyncHandler(async (req, res) => {
  const services = SERVICES.map((service) => ({
    ...service,
    authorized: req.user.permissions.includes(service.permission),
  }));
  res.json({ services });
});

export const getCrm = asyncHandler(async (req, res) => {
  await writeAuditLog({ userId: req.user.id, action: 'ZOHO_SERVICE_ACCESS', resource: 'zoho_crm', req });
  const data = await getCrmDashboard();
  res.json(data);
});

export const getDesk = asyncHandler(async (req, res) => {
  await writeAuditLog({ userId: req.user.id, action: 'ZOHO_SERVICE_ACCESS', resource: 'zoho_desk', req });
  const data = await getDeskDashboard();
  res.json(data);
});
