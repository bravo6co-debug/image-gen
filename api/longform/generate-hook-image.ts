import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../lib/auth.js';
import { getAIClientForUser, setCorsHeaders, Modality } from '../lib/gemini.js';
import { isFluxModel, getEachLabsApiKey, generateFluxImage } from '../lib/eachlabs.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin as string);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = requireAuth(req);
  if (!auth.authenticated || !auth.userId) {
    return res.status(401).json({ error: auth.error || '로그인이 필요합니다.' });
  }

  try {
    const { visualDescription, imageModel = 'gemini-2.5-flash-image' } = req.body;
    if (!visualDescription) return res.status(400).json({ error: 'visualDescription is required' });

    const prompt = `Anime style illustration. ${visualDescription}. No text, no watermarks, no letters in any language. Vibrant colors, high detail, 16:9 aspect ratio.`;

    if (isFluxModel(imageModel)) {
      const apiKey = await getEachLabsApiKey(auth.userId);
      const result = await generateFluxImage({
        apiKey,
        model: imageModel,
        prompt,
        aspectRatio: '16:9',
      });
      return res.status(200).json({ image: result });
    }

    const aiClient = await getAIClientForUser(auth.userId);
    const response = await aiClient.models.generateContent({
      model: imageModel,
      contents: prompt,
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData) {
        return res.status(200).json({
          image: { mimeType: part.inlineData.mimeType, data: part.inlineData.data },
        });
      }
    }

    return res.status(500).json({ error: 'No image generated' });
  } catch (e) {
    console.error('[longform/generate-hook-image] Error:', e);
    return res.status(500).json({ error: `Hook image generation failed: ${e instanceof Error ? e.message : 'Unknown'}` });
  }
}
