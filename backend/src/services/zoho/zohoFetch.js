import { getZohoAccessToken } from './zohoAuth.service.js';

/**
 * Calls a Zoho API endpoint and safely parses the response.
 * Zoho returns an empty body (e.g. 204 No Content) when a module has zero
 * matching records — that is a valid "no data" result, not an error, so it
 * must not be handed to JSON.parse. On a non-ok status, the response body is
 * included in the thrown error so the real Zoho error code/message is visible
 * in the server logs instead of a generic failure.
 */
export async function fetchZohoJson(path, baseUrl, extraHeaders = {}) {
  const token = await getZohoAccessToken();
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `Zoho-oauthtoken ${token}`, ...extraHeaders },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Zoho API request to ${path} failed with status ${response.status}: ${text.slice(0, 500)}`);
  }

  if (!text) {
    return null; // e.g. 204 No Content — treat as "no records"
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Zoho API response for ${path} was not valid JSON: ${text.slice(0, 500)}`);
  }
}
