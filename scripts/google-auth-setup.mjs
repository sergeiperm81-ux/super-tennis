/**
 * Google Cloud Setup via OAuth2 local redirect
 * Uses existing YouTube OAuth credentials from the supertennis project.
 *
 * Run: node scripts/google-auth-setup.mjs
 */
import 'dotenv/config';
import { createServer } from 'http';
import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';

// Use the supertennis project YouTube OAuth credentials
// Credentials must be set as environment variables (never hardcode in source)
const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET env vars');
  process.exit(1);
}
const REDIRECT_URI = 'http://localhost:9876/callback';
const SCOPES = [
  'https://www.googleapis.com/auth/cloud-platform',
  'https://www.googleapis.com/auth/iam',
].join(' ');

const PROJECT_ID = 'supertennis';
const SA_NAME = 'gsc-indexer';
const SA_EMAIL = `${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com`;

function step(msg) { console.log(`\n▶ ${msg}`); }
function ok(msg) { console.log(`  ✅ ${msg}`); }
function info(msg) { console.log(`  ℹ️  ${msg}`); }
function fail(msg) { console.log(`  ❌ ${msg}`); }

async function getAccessToken() {
  // First try: use refresh token to get access token (no browser needed!)
  const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;

  step('Trying refresh token auth (no browser needed)...');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: 'refresh_token',
      scope: SCOPES,
    }),
  });
  const data = await res.json();

  if (data.access_token) {
    ok('Got access token via refresh token');
    return data.access_token;
  }

  info(`Refresh token failed (${data.error}), falling back to browser auth...`);
  return browserAuth();
}

async function browserAuth() {
  return new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, 'http://localhost:9876');
      if (url.pathname !== '/callback') {
        res.end('Waiting...');
        return;
      }
      const code = url.searchParams.get('code');
      res.end('<html><body><h2>✅ Authorized! You can close this tab.</h2></body></html>');
      server.close();

      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code, client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI, grant_type: 'authorization_code',
        }),
      });
      const tokenData = await tokenRes.json();
      if (tokenData.access_token) resolve(tokenData.access_token);
      else reject(new Error(tokenData.error_description || 'Token exchange failed'));
    });

    server.listen(9876, () => {
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'select_account');

      console.log('\n  Opening browser for Google authorization...');
      try { execSync(`start "${authUrl.toString()}"`); } catch {}
      console.log(`  If browser didn't open, visit: ${authUrl.toString()}\n`);
    });

    setTimeout(() => { server.close(); reject(new Error('Auth timeout (2 min)')); }, 120000);
  });
}

async function api(token, method, path, body) {
  const res = await fetch(`https://${path}`, {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

async function run() {
  console.log('\n🔑 Google Cloud Setup — super.tennis Indexing API\n');

  const token = await getAccessToken();

  // Enable Indexing API
  step('Enabling Web Search Indexing API...');
  const enableRes = await api(token, 'POST',
    `serviceusage.googleapis.com/v1/projects/${PROJECT_ID}/services/indexing.googleapis.com:enable`
  );
  if (enableRes.status === 200 || enableRes.status === 409) ok('Indexing API enabled');
  else if (enableRes.data?.error?.status === 'ALREADY_EXISTS') ok('Already enabled');
  else info(`Enable status ${enableRes.status}: ${JSON.stringify(enableRes.data?.error?.message || enableRes.data)}`);

  // Create service account
  step(`Creating service account: ${SA_NAME}...`);
  const saRes = await api(token, 'POST',
    `iam.googleapis.com/v1/projects/${PROJECT_ID}/serviceAccounts`,
    { accountId: SA_NAME, serviceAccount: { displayName: 'GSC Indexer for super.tennis' } }
  );
  if (saRes.status === 200) ok(`Service account created: ${saRes.data.email}`);
  else if (saRes.status === 409) ok(`Service account already exists: ${SA_EMAIL}`);
  else { fail(`SA create: ${JSON.stringify(saRes.data)}`); }

  // Create JSON key
  step('Creating JSON key...');
  const keyRes = await api(token, 'POST',
    `iam.googleapis.com/v1/projects/${PROJECT_ID}/serviceAccounts/${SA_EMAIL}/keys`,
    { privateKeyType: 'TYPE_GOOGLE_CREDENTIALS_FILE', keyAlgorithm: 'KEY_ALG_RSA_2048' }
  );
  if (keyRes.status !== 200) {
    fail(`Key creation failed (${keyRes.status}): ${JSON.stringify(keyRes.data)}`);
    process.exit(1);
  }
  const keyJson = Buffer.from(keyRes.data.privateKeyData, 'base64').toString('utf8');
  const keyObj = JSON.parse(keyJson);
  ok(`Key created for: ${keyObj.client_email}`);

  // Set GitHub secret
  step('Setting GOOGLE_SA_JSON GitHub secret...');
  const b64 = Buffer.from(keyJson).toString('base64');
  const tmpFile = '/tmp/gsa-b64.txt';
  writeFileSync(tmpFile, b64);
  try {
    execSync(`cat ${tmpFile} | gh secret set GOOGLE_SA_JSON`);
    ok('GitHub secret GOOGLE_SA_JSON set');
  } catch (e) {
    fail('gh secret set failed: ' + e.message);
  } finally {
    try { unlinkSync(tmpFile); } catch {}
  }

  console.log(`
✅ Setup complete!

⚠️  ONE MANUAL STEP — add service account as OWNER in GSC:
   URL: https://search.google.com/search-console/users?resource_id=https%3A%2F%2Fsuper.tennis%2F
   Email: ${SA_EMAIL}
   Permission: Owner

After that, test:
  node scripts/request-indexing.mjs --dry-run
  node scripts/request-indexing.mjs --limit=10
`);
}

run().catch(e => { fail(e.message); process.exit(1); });
