import { getZohoAccessToken } from './zohoAuth.service.js';

export async function fetchZohoJson(appName, userId, path, baseUrl, query = {}) {
  const accessToken = await getZohoAccessToken(appName, userId);
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
  });

  if (response.status === 204) return null;

  if (!response.ok) {
    const text = (await response.text()).slice(0, 500);
    throw new Error(`Zoho API request to ${path} failed with status ${response.status}: ${text}`);
  }

  return response.json();
}
