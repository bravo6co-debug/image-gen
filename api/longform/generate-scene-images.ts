import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../lib/auth.js';
import { getAIClientForUser, setCorsHeaders, Modality } from '../lib/gemini.js';
import { isFluxModel, getEachLabsApiKey, generateFluxImage } from '../lib/eachlabs.js';

interface SceneInput {
  sceneNumber: number;
  imagePrompt: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res, req.headers.origin as string);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = requireAuth(req);
  if (!auth.authenticated || !auth.userId) {
    return res.status(401).json({ error: auth.error || '로그인이 필요합니다.' });
  }

  try {
    const { scenes, imageModel = 'gemini-2.5-flash-image', batchSize = 5 } = req.body;
    if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
      return res.status(400).json({ error: 'scenes array is required' });
    }

    const results: { sceneNumber: number; success: boolean; image?: any; error?: string }[] = [];

    // Process in batches
    for (let i = 0; i < scenes.length; i += batchSize) {
      const batch = scenes.slice(i, i + batchSize) as SceneInput[];

      const batchPromises = batch.map(async (scene) => {
        try {
          const prompt = `Anime style illustration. ${scene.imagePrompt}. No text, no watermarks, no letters. Vibrant colors, high detail, 16:9 widescreen.`;

          if (isFluxModel(imageModel)) {
            const apiKey = await getEachLabsApiKey(auth.userId!);
            const result = await generateFluxImage({ apiKey, model: imageModel, prompt, aspectRatio: '16:9' });
            return { sceneNumber: scene.sceneNumber, success: true, image: result };
          }

          const aiClient = await getAIClientForUser(auth.userId!);
          const response = await aiClient.models.generateContent({
            model: imageModel,
            contents: prompt,
            config: { responseModalities: [Modality.IMAGE, Modality.TEXT] },
          });

          const parts = response.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData) {
              return {
                sceneNumber: scene.sceneNumber,
                success: true,
                image: { mimeType: part.inlineData.mimeType, data: part.inlineData.data },
              };
            }
          }
          return { sceneNumber: scene.sceneNumber, success: false, error: 'No image generated' };
        } catch (err) {
          return {
            sceneNumber: scene.sceneNumber,
            success: false,
            error: err instanceof Error ? err.message : 'Generation failed',
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Rate limit delay between batches
      if (i + batchSize < scenes.length) {
        await new Promise(r => setTimeout(r, 7000));
      }
    }

    return res.status(200).json({ results });
  } catch (e) {
    console.error('[longform/generate-scene-images] Error:', e);
    return res.status(500).json({ error: `Scene images generation failed: ${e instanceof Error ? e.message : 'Unknown'}` });
  }
}
