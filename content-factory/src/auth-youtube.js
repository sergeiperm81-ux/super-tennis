/**
 * One-time YouTube OAuth setup.
 * Spins up a local HTTP server to capture the callback.
 *
 * Usage:
 *   1. Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env
 *   2. Run: node src/auth-youtube.js
 *   3. Browser opens automatically → sign in → grant access
 *   4. Refresh token is printed — copy it to .env
 */

import 'dotenv/config';
import { google } from 'googleapis';
import http from 'http';
import { URL } from 'url';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import open from 'open';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, '..', '.env');

const CLIENT_ID = process.env.YOUTUBE_CLIENT_ID;
const CLIENT_SECRET = process.env.YOUTUBE_CLIENT_SECRET;
const PORT = 3000;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env first');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/youtube.upload',
    'https://www.googleapis.com/auth/youtube',
    'https://www.googleapis.com/auth/youtube.force-ssl',
  ],
  prompt: 'consent',
});

// Start local server to capture the callback
const server = http.createServer(async (req, res) => {
  if (!req.url.startsWith('/callback')) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>❌ Access denied</h1><p>You can close this tab.</p>');
    console.error('❌ Access denied:', error);
    server.close();
    process.exit(1);
  }

  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/html' });
    res.end('<h1>❌ No code received</h1>');
    return;
  }

  try {
    const { tokens } = await oauth2.getToken(code);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <h1 style="color:green">✅ YouTube connected!</h1>
      <p>You can close this tab and return to the terminal.</p>
    `);

    // Auto-save to .env
    const envContent = fs.readFileSync(ENV_PATH, 'utf8');
    const updated = envContent.replace(
      /YOUTUBE_REFRESH_TOKEN=.*/,
      `YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`
    );
    fs.writeFileSync(ENV_PATH, updated);

    console.log('\n✅ Success! Refresh token saved to .env');
    console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/html' });
    res.end(`<h1>❌ Error</h1><p>${err.message}</p>`);
    console.error('❌ Error exchanging code:', err.message);
  }

  server.close();
  setTimeout(() => process.exit(0), 500);
});

server.listen(PORT, () => {
  console.log('\n📺 YouTube OAuth Setup\n');
  console.log(`Callback server listening on http://localhost:${PORT}`);
  console.log('\nOpening browser...\n');

  // Try to open browser automatically
  open(authUrl).catch(() => {
    console.log('⚠️ Could not open browser automatically.');
    console.log('Open this URL manually:\n');
    console.log(`  ${authUrl}\n`);
  });
});
