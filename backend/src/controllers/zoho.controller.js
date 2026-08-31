import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';
import { getCrmContacts } from '../services/zoho/zohoCrm.service.js';
import { getDeskTickets } from '../services/zoho/zohoDesk.service.js';

// Clicking a service redirects the employee straight into the real Zoho app on
// first authorization — see zohoOAuth.controller.js for that redirect chain.
// getCrm/getDesk below are a separate capability: automated backend API access
// using the same stored refresh_token, for anything that needs Zoho data without
// sending the employee's browser anywhere.
const BACKEND_ORIGIN = new URL(env.ZOHO_REDIRECT_URI).origin;

const SERVICES = [
  { key: 'crm', label: 'Zoho CRM', permission: 'ZOHO_CRM_VIEW', path: `${BACKEND_ORIGIN}/api/zoho/oauth/crm/authorize`, external: true },
  { key: 'desk', label: 'Zoho Desk', permission: 'ZOHO_DESK_VIEW', path: `${BACKEND_ORIGIN}/api/zoho/oauth/desk/authorize`, external: true },
];

export const getServices = asyncHandler(async (req, res) => {
  const services = SERVICES.map((service) => ({
    ...service,
    authorized: req.user.permissions.includes(service.permission),
  }));
  res.json({ services });
});

export const getCrm = asyncHandler(async (req, res) => {
  const data = await getCrmContacts(req.user.id);
  res.json(data);
});

export const getDesk = asyncHandler(async (req, res) => {
  const data = await getDeskTickets(req.user.id);
  res.json(data);
});
