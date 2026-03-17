/**
 * Publish video to TikTok via Content Posting API.
 *
 * Setup:
 *   1. Register at https://developers.tiktok.com
 *   2. Create app → Request "video.publish" scope
 *   3. Pass app audit (5-10 business days)
 *   4. OAuth flow to get access_token
 *   5. Set TIKTOK_ACCESS_TOKEN in .env
 *
 * IMPORTANT: Without passing TikTok's audit, all uploaded videos
 * will be set to PRIVATE visibility. Audit is required for public posts.
 */

const ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;

/**
 * Upload and publish a video to TikTok
 * @param {string} filePath - Path to .mp4 file
 * @param {string} title - Video title/caption
 * @returns {Promise<string|null>} Publish ID
 */
export async function publishToTikTok(filePath, title) {
  if (!ACCESS_TOKEN) {
    console.log('⏭️  TikTok: skipped (no credentials)');
    return null;
  }

  const fs = await import('fs');
  const fileSize = fs.statSync(filePath).size;

  console.log(`🎵 TikTok: uploading "${title.slice(0, 50)}..."...`);

  try {
    // 1. Initialize upload (FILE_UPLOAD method for small files < 64MB)
    const initRes = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({
        post_info: {
          title: title.slice(0, 150), // TikTok caption limit ~150 chars
          privacy_level: 'PUBLIC_TO_EVERYONE',
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: fileSize,
          chunk_size: fileSize, // Single chunk for small files
          total_chunk_count: 1,
        },
      }),
    });

    const initData = await initRes.json();
    if (initData.error?.code !== 'ok' && !initData.data?.publish_id) {
      throw new Error(`Init failed: ${JSON.stringify(initData.error || initData)}`);
    }

    const { publish_id, upload_url } = initData.data;

    // 2. Upload video file
    const videoData = fs.readFileSync(filePath);
    const uploadRes = await fetch(upload_url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
      },
      body: videoData,
    });

    if (!uploadRes.ok) {
      throw new Error(`Upload failed: ${uploadRes.status}`);
    }

    console.log(`   ✅ TikTok: uploaded (publish_id: ${publish_id})`);
    return publish_id;
  } catch (err) {
    console.error(`   ❌ TikTok error:`, err.message);
    return null;
  }
}
