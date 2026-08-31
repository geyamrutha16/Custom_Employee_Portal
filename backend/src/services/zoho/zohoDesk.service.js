import { env } from '../../config/env.js';
import { fetchZohoJson } from './zohoFetch.js';

export async function getDeskTickets(userId) {
  if (!env.ZOHO_DESK_ORG_ID) {
    throw new Error('ZOHO_DESK_ORG_ID is not set — required by every Zoho Desk API call except /organizations');
  }

  const data = await fetchZohoJson('desk', userId, '/api/v1/tickets', env.ZOHO_DESK_API_BASE_URL, { orgId: env.ZOHO_DESK_ORG_ID });
  const tickets = (data?.data ?? []).map((record) => ({
    id: record.ticketNumber ?? record.id,
    subject: record.subject ?? null,
    status: record.status ?? null,
    priority: record.priority ?? null,
  }));
  const openCount = tickets.filter((t) => t.status === 'Open').length;

  return { totalTickets: tickets.length, openTickets: openCount, closedTickets: tickets.length - openCount, tickets };
}
