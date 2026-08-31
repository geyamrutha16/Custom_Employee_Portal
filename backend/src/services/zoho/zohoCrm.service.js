import { env } from '../../config/env.js';
import { fetchZohoJson } from './zohoFetch.js';

export async function getCrmContacts(userId) {
  const data = await fetchZohoJson('crm', userId, '/crm/v2/Contacts', env.ZOHO_API_BASE_URL);
  const contacts = (data?.data ?? []).map((record) => ({
    id: record.id,
    name: record.Full_Name ?? `${record.First_Name ?? ''} ${record.Last_Name ?? ''}`.trim(),
    email: record.Email ?? null,
    phone: record.Phone ?? null,
    company: record.Account_Name?.name ?? null,
  }));
  return { totalContacts: contacts.length, contacts };
}
