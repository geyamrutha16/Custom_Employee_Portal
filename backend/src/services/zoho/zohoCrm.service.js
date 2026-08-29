import { env } from '../../config/env.js';
import { fetchZohoJson } from './zohoFetch.js';
import { demoCrmContacts } from './demoData.js';

export async function getCrmDashboard() {
  if (env.ZOHO_DEMO_MODE) {
    return {
      source: 'DEMO_DATA',
      totalContacts: demoCrmContacts.length,
      contacts: demoCrmContacts,
    };
  }

  // Real mode: not verified against a live Zoho account (no credentials available
  // in this environment). Confirm this endpoint and field mapping against current
  // Zoho CRM API docs before relying on it — see README "Zoho Integration" section.
  const data = await fetchZohoJson('/crm/v2/Contacts', env.ZOHO_API_BASE_URL);
  const contacts = (data?.data ?? []).map((record) => ({
    id: record.id,
    name: record.Full_Name ?? `${record.First_Name ?? ''} ${record.Last_Name ?? ''}`.trim(),
    email: record.Email ?? null,
    phone: record.Phone ?? null,
    company: record.Account_Name?.name ?? null,
  }));

  return { source: 'ZOHO_LIVE', totalContacts: contacts.length, contacts };
}
