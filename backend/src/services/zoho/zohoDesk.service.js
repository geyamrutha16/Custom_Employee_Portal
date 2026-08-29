import { env } from '../../config/env.js';
import { fetchZohoJson } from './zohoFetch.js';
import { demoTickets } from './demoData.js';

export async function getDeskDashboard() {
  if (env.ZOHO_DEMO_MODE) {
    const openCount = demoTickets.filter((t) => t.status === 'Open').length;
    return {
      source: 'DEMO_DATA',
      totalTickets: demoTickets.length,
      openTickets: openCount,
      closedTickets: demoTickets.length - openCount,
      tickets: demoTickets,
    };
  }

  if (!env.ZOHO_DESK_ORG_ID) {
    throw new Error('ZOHO_DESK_ORG_ID is not set — required by every Zoho Desk API call except /organizations');
  }

  const data = await fetchZohoJson('/api/v1/tickets', env.ZOHO_DESK_API_BASE_URL, { orgId: env.ZOHO_DESK_ORG_ID });
  const tickets = (data?.data ?? []).map((record) => ({
    id: record.ticketNumber ?? record.id,
    subject: record.subject ?? null,
    status: record.status ?? null,
    priority: record.priority ?? null,
  }));
  const openCount = tickets.filter((t) => t.status === 'Open').length;

  return {
    source: 'ZOHO_LIVE',
    totalTickets: tickets.length,
    openTickets: openCount,
    closedTickets: tickets.length - openCount,
    tickets,
  };
}
