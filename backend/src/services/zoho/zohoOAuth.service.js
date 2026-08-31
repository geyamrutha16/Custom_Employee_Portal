import { env } from '../../config/env.js';

// scope is a mandatory parameter on Zoho's authorize endpoint even though nothing
// here calls the CRM/Desk REST API with the resulting access_token — the token is
// only ever exchanged for its refresh_token, stored, and otherwise unused.
const SCOPES = {
  crm: 'ZohoCRM.modules.contacts.READ',
  desk: 'Desk.tickets.READ',
};

export function buildAuthorizationUrl(appName, state) {
  const url = new URL('/oauth/v2/auth', env.ZOHO_ACCOUNTS_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', env.ZOHO_CLIENT_ID);
  url.searchParams.set('scope', SCOPES[appName]);
  url.searchParams.set('redirect_uri', env.ZOHO_REDIRECT_URI);
  url.searchParams.set('access_type', 'offline'); // required to receive a refresh_token
  url.searchParams.set('state', state);
  // No prompt=consent here on purpose — once an employee has already granted
  // consent and their Zoho session is still valid, Zoho skips the screen entirely
  // and redirects straight back, which is what makes repeat clicks feel automatic.
  return url.toString();
}

export async function exchangeCodeForRefreshToken(code) {
  const response = await fetch(`${env.ZOHO_ACCOUNTS_URL}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: env.ZOHO_CLIENT_ID,
      client_secret: env.ZOHO_CLIENT_SECRET,
      redirect_uri: env.ZOHO_REDIRECT_URI,
      code,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.refresh_token) {
    throw new Error(`Zoho authorization code exchange failed: ${JSON.stringify(data)}`);
  }
  return data.refresh_token;
}
