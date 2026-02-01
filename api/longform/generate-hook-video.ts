import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put, del } from '@vercel/blob';
import { setCorsHeaders } from '../lib/gemini.js';
import { requireAuth } from '../lib/auth.js';
import { findUserById } from '../lib/mongodb.js';

const HAILUO_API_URL = 'https://api.eachlabs.ai/v1/prediction';
const HAILUO_MODEL = 'minimax-hailuo-v2-3-fast-standard-image-to-video';
const HAILUO_VERSION = '0.0.1';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin as string);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = requireAuth(req);
  if (!auth.authenticated || !auth.userId) {
    return res.status(401).json({ error: auth.error || '로그인이 필요합니다.' });
  }

  let blobUrl: string | null = null;

  try {
    const { sourceImage, motionPrompt, durationSeconds = 10 } = req.body;
    if (!sourceImage || !motionPrompt) {
      return res.status(400).json({ error: 'sourceImage and motionPrompt are required' });
    }

    // Get Hailuo API key (user setting first, env fallback)
    const user = await findUserById(auth.userId);
    const hailuoApiKey = user?.settings?.hailuoApiKey || process.env.HAILUO_API_KEY;
    if (!hailuoApiKey) {
      return res.status(400).json({ error: 'Hailuo API 키가 설정되지 않았습니다.' });
    }

    // Upload image to Vercel Blob (eachlabs.ai requires HTTPS URL)
    const imageBuffer = Buffer.from(sourceImage, 'base64');
    const blob = await put(`longform-hook-${Date.now()}.png`, imageBuffer, {
      access: 'public',
      contentType: 'image/png',
    });
    blobUrl = blob.url;

    // Create Hailuo prediction via eachlabs.ai
    const createResponse = await fetch(`${HAILUO_API_URL}/`, {
      method: 'POST',
      headers: {
        'X-API-Key': hailuoApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: HAILUO_MODEL,
        version: HAILUO_VERSION,
        input: {
          prompt: motionPrompt,
          prompt_optimizer: true,
          image_url: blobUrl,
          duration: String(durationSeconds >= 10 ? 10 : 6),
        },
        webhook_url: '',
      }),
    });

    const createResult = await createResponse.json() as any;

    if (createResult.status !== 'success' || !createResult.predictionID) {
      const errMsg = createResult.error || createResult.message || JSON.stringify(createResult);
      if (String(errMsg).includes('401') || String(errMsg).includes('Unauthorized')) {
        throw new Error('Hailuo API 키가 유효하지 않습니다. 키를 확인해 주세요.');
      }
      throw new Error(`Hailuo API 요청 실패: ${errMsg}`);
    }

    const predictionId = createResult.predictionID;
    console.log(`[longform/generate-hook-video] Prediction created: ${predictionId}`);

    // Poll for completion (max 5 minutes)
    const maxPollingTime = 300000;
    const pollInterval = 5000;
    const startTime = Date.now();
    let pollCount = 0;

    while (true) {
      pollCount++;
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      if (Date.now() - startTime > maxPollingTime) {
        throw new Error(`비디오 생성 시간 초과 (${elapsed}초 경과). 나중에 다시 시도하세요.`);
      }

      await new Promise(r => setTimeout(r, pollInterval));
      console.log(`[longform/generate-hook-video] Polling #${pollCount} - ${elapsed}s elapsed...`);

      try {
        const pollResponse = await fetch(`${HAILUO_API_URL}/${predictionId}`, {
          headers: { 'X-API-Key': hailuoApiKey },
        });
        const pollResult = await pollResponse.json() as any;

        if (pollResult.status === 'success' && pollResult.output) {
          const totalTime = Math.round((Date.now() - startTime) / 1000);
          console.log(`[longform/generate-hook-video] Video generated in ${totalTime}s`);

          // Cleanup blob
          if (blobUrl) {
            try { await del(blobUrl); } catch {}
          }

          return res.status(200).json({
            videoUrl: pollResult.output,
            thumbnailUrl: '',
          });
        }

        if (pollResult.status === 'error') {
          const errDetail = pollResult.error || pollResult.message || '알 수 없는 오류';
          throw new Error(`비디오 생성 실패: ${errDetail}`);
        }
      } catch (pollError) {
        if (pollError instanceof Error && pollError.message.includes('비디오')) {
          throw pollError;
        }
        console.error(`[longform/generate-hook-video] Poll #${pollCount} failed:`, pollError);
        if (pollCount > 3) {
          throw new Error('비디오 생성 상태 확인이 반복 실패했습니다.');
        }
      }
    }
  } catch (e) {
    if (blobUrl) { try { await del(blobUrl); } catch {} }
    console.error('[longform/generate-hook-video] Error:', e);
    return res.status(500).json({ error: `Hook video generation failed: ${e instanceof Error ? e.message : 'Unknown'}` });
  }
}
