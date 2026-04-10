#!/usr/bin/env node
/**
 * Setup Google Indexing API — one-time setup script.
 *
 * What it does automatically:
 *   1. Creates Google Cloud project "super-tennis-indexing" (if not exists)
 *   2. Enables Indexing API on the project
 *   3. Creates a Service Account "gsc-indexer"
 *   4. Downloads JSON key for the service account
 *   5. Encodes it as base64 and saves to GOOGLE_SA_JSON
 *   6. Sets GOOGLE_SA_JSON as a GitHub secret
 *
 * What YOU must do manually (ONE step):
 *   → Add the service account email as "Owner" in Google Search Console
 *      GSC → Settings → Users and permissions → Add user
 *      Email: gsc-indexer@super-tennis-indexing.iam.gserviceaccount.com
 *      Permission: Owner
 *
 * Prerequisites:
 *   - gcloud CLI installed + logged in  (gcloud auth login)
 *   - OR: GOOGLE_ACCESS_TOKEN env var (from https://developers.google.com/oauthplayground)
 *   - gh CLI installed + logged in (already confirmed)
 *
 * Run: node scripts/setup-google-indexing.mjs
 */
import { execSync, spawnSync } from 'child_process';
import { writeFileSync, existsSync } from 'fs';

const PROJECT_ID = 'super-tennis-indexing';
const SA_NAME = 'gsc-indexer';
const SA_EMAIL = `${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com`;
const KEY_FILE = '/tmp/google-sa-key.json';

function run(cmd, opts = {}) {
  const result = spawnSync(cmd, { shell: true, encoding: 'utf8', ...opts });
  if (result.error) throw result.error;
  return { stdout: result.stdout?.trim(), stderr: result.stderr?.trim(), status: result.status };
}

function step(msg) { console.log(`\n▶ ${msg}`); }
function ok(msg) { console.log(`  ✅ ${msg}`); }
function warn(msg) { console.log(`  ⚠️  ${msg}`); }
function err(msg) { console.log(`  ❌ ${msg}`); }

// Check gcloud
step('Checking prerequisites...');
const gcloudCheck = run('gcloud version 2>/dev/null || where gcloud 2>/dev/null');
const hasGcloud = gcloudCheck.status === 0;

if (!hasGcloud) {
  console.log(`
❌ gcloud CLI not found.

Two options to proceed:

OPTION 1 (Recommended — 5 minutes):
  1. Install gcloud: https://cloud.google.com/sdk/docs/install
  2. Run: gcloud auth login
  3. Re-run this script

OPTION 2 (Manual via browser — 10 minutes):
  1. Go to https://console.cloud.google.com
  2. Create project: super-tennis-indexing
  3. Enable API: https://console.cloud.google.com/apis/library/indexing.googleapis.com
  4. Create Service Account: IAM → Service Accounts → Create
     Name: gsc-indexer
  5. Create JSON key: Actions → Manage keys → Add key → JSON
  6. Run: node scripts/setup-google-indexing.mjs --key-file=path/to/key.json
`);
  process.exit(1);
}

// Check if --key-file provided (manual setup path)
const keyFileFlag = process.argv.find(a => a.startsWith('--key-file='));
if (keyFileFlag) {
  const keyPath = keyFileFlag.split('=')[1];
  if (!existsSync(keyPath)) {
    err(`Key file not found: ${keyPath}`);
    process.exit(1);
  }
  step(`Using existing key file: ${keyPath}`);
  const keyJson = require('fs').readFileSync(keyPath, 'utf8');
  const b64 = Buffer.from(keyJson).toString('base64');

  step('Setting GOOGLE_SA_JSON GitHub secret...');
  const ghResult = run(`echo "${b64}" | gh secret set GOOGLE_SA_JSON`);
  if (ghResult.status === 0) ok('GitHub secret GOOGLE_SA_JSON set');
  else err('Failed to set GitHub secret: ' + ghResult.stderr);

  console.log(`
✅ Setup complete!

REQUIRED MANUAL STEP:
→ Add this email as OWNER in Google Search Console:
  ${JSON.parse(keyJson).client_email}

  GSC URL: https://search.google.com/search-console/users?resource_id=https%3A%2F%2Fsuper.tennis%2F

After adding as owner, test with:
  node scripts/request-indexing.mjs --dry-run
  node scripts/request-indexing.mjs --limit=10 --type=players
`);
  process.exit(0);
}

// Full automated setup via gcloud
ok('gcloud found');

step('Checking gcloud auth...');
const authCheck = run('gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null');
if (!authCheck.stdout) {
  warn('Not logged in. Running gcloud auth login...');
  run('gcloud auth login', { stdio: 'inherit' });
}
ok(`Logged in as: ${authCheck.stdout || 'unknown'}`);

step(`Creating project: ${PROJECT_ID}...`);
const projCheck = run(`gcloud projects describe ${PROJECT_ID} 2>/dev/null`);
if (projCheck.status !== 0) {
  const create = run(`gcloud projects create ${PROJECT_ID} --name="Super Tennis Indexing" 2>&1`);
  if (create.status === 0) ok('Project created');
  else { warn(`Project creation: ${create.stdout}`); }
} else ok('Project already exists');

step('Setting project...');
run(`gcloud config set project ${PROJECT_ID}`);
ok(`Active project: ${PROJECT_ID}`);

step('Enabling Indexing API...');
const enable = run('gcloud services enable indexing.googleapis.com 2>&1');
if (enable.status === 0) ok('Indexing API enabled');
else warn(`API enable: ${enable.stdout}`);

step(`Creating service account: ${SA_NAME}...`);
const saCheck = run(`gcloud iam service-accounts describe ${SA_EMAIL} 2>/dev/null`);
if (saCheck.status !== 0) {
  const saCreate = run(`gcloud iam service-accounts create ${SA_NAME} --display-name="GSC Indexer for super.tennis" 2>&1`);
  if (saCreate.status === 0) ok('Service account created');
  else warn(`SA create: ${saCreate.stdout}`);
} else ok('Service account already exists');

step('Creating JSON key...');
const keyCreate = run(`gcloud iam service-accounts keys create ${KEY_FILE} --iam-account=${SA_EMAIL} 2>&1`);
if (keyCreate.status === 0) ok(`Key saved to ${KEY_FILE}`);
else { err(`Key creation failed: ${keyCreate.stdout}`); process.exit(1); }

step('Encoding key as base64...');
const keyJson = run(`cat ${KEY_FILE}`).stdout;
const b64 = Buffer.from(keyJson).toString('base64');
ok('Encoded');

step('Setting GOOGLE_SA_JSON GitHub secret...');
const ghResult = run(`echo "${b64}" | gh secret set GOOGLE_SA_JSON`);
if (ghResult.status === 0) ok('GitHub secret GOOGLE_SA_JSON set');
else { err('Failed: ' + ghResult.stderr); process.exit(1); }

// Clean up key file
run(`del ${KEY_FILE} 2>/dev/null || rm ${KEY_FILE} 2>/dev/null`);

console.log(`
✅ Setup complete!

⚠️  ONE MANUAL STEP REQUIRED:
→ Add the service account as OWNER in Google Search Console:

   URL: https://search.google.com/search-console/users?resource_id=https%3A%2F%2Fsuper.tennis%2F
   Email: ${SA_EMAIL}
   Permission: Owner

After doing that, test with:
  node scripts/request-indexing.mjs --dry-run
  node scripts/request-indexing.mjs --limit=10

Google Indexing API quota: 200 URLs/day (free).
`);
