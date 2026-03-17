/**
 * Publish video to Instagram Reels via Graph API.
 *
 * Setup:
 *   1. Facebook Developer account → Create app
 *   2. Add "Instagram Graph API" product
 *   3. Link Instagram Business/Creator account
 *   4. Generate long-lived access token (60 days)
 *   5. Set INSTAGRAM_ACCESS_TOKEN and INSTAGRAM_BUSINESS_ACCOUNT_ID in .env
 *
 * Note: Instagram requires the video to be accessible via public URL.
 * We upload to Supabase Storage first, then pass the URL to Instagram.
 */

import fs from 'fs';

const ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const ACCOUNT_ID = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

/**
 * Upload video to Supabase Storage and get a public URL
 */
async function uploadToStorage(filePath, filename) {
  const bucket = 'content-factory';
  const storagePath = `videos/${filename}`;

  // Ensure bucket exists (ignore if already exists)
  try {
    await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: bucket, name: bucket, public: true }),
    });
  } catch {}

  // Upload file
  const fileData = fs.readFileSync(filePath);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${storagePath}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'video/mp4',
      'x-upsert': 'true',
    },
    body: fileData,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Storage upload failed: ${res.status} ${text}`);
  }

  // Return public URL
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${storagePath}`;
}

/**
 * Publish a video to Instagram Reels
 * @param {string} filePath - Path to .mp4 file
 * @param {string} caption - Post caption
 * @returns {Promise<string|null>} Media ID
 */
export async function publishToInstagram(filePath, caption) {
  if (!ACCESS_TOKEN || !ACCOUNT_ID) {
    console.log('⏭️  Instagram: skipped (no credentials)');
    return null;
  }

  console.log(`📸 Instagram: uploading reel...`);

  try {
    // 1. Upload video to Supabase Storage for public URL
    const filename = `reel-${Date.now()}.mp4`;
    const videoUrl = await uploadToStorage(filePath, filename);
    console.log(`   Uploaded to storage: ${videoUrl}`);

    // 2. Create media container
    const createRes = await fetch(
      `https://graph.facebook.com/v21.0/${ACCOUNT_ID}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'REELS',
          video_url: videoUrl,
          caption: caption,
          share_to_feed: true,
          access_token: ACCESS_TOKEN,
        }),
      }
    );

    const createData = await createRes.json();
    if (createData.error) throw new Error(createData.error.message);
    const containerId = createData.id;
    console.log(`   Container created: ${containerId}`);

    // 3. Wait for processing (poll status)
    let status = 'IN_PROGRESS';
    let attempts = 0;
    while (status === 'IN_PROGRESS' && attempts < 30) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(
        `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${ACCESS_TOKEN}`
      );
      const statusData = await statusRes.json();
      status = statusData.status_code;
      attempts++;
    }

    if (status !== 'FINISHED') {
      throw new Error(`Media processing failed: status=${status}`);
    }

    // 4. Publish
    const pubRes = await fetch(
      `https://graph.facebook.com/v21.0/${ACCOUNT_ID}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerId,
          access_token: ACCESS_TOKEN,
        }),
      }
    );

    const pubData = await pubRes.json();
    if (pubData.error) throw new Error(pubData.error.message);

    console.log(`   ✅ Instagram: published (media ID: ${pubData.id})`);

    // 5. Cleanup: delete from storage after publish
    try {
      await fetch(`${SUPABASE_URL}/storage/v1/object/${`content-factory/videos/${filename}`}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      });
    } catch {}

    return pubData.id;
  } catch (err) {
    console.error(`   ❌ Instagram error:`, err.message);
    return null;
  }
}
