import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../lib/auth.js';
import { getAIClientForUser, setCorsHeaders, Modality, extractSafetyError } from '../lib/gemini.js';
import { isFluxModel, getEachLabsApiKey, generateFluxImage } from '../lib/eachlabs.js';

interface SceneInput {
  sceneNumber: number;
  imagePrompt: string;
  cameraAngle?: string;
  lightingMood?: string;
  mood?: string;
}

// 씬 메타데이터를 활용한 고품질 이미지 프롬프트 래핑
function buildEnhancedPrompt(scene: SceneInput): string {
  const basePrompt = scene.imagePrompt.trim();
  const camera = scene.cameraAngle || '';
  const lighting = scene.lightingMood || '';
  const mood = scene.mood || '';

  // 프롬프트에 이미 카메라/조명이 포함되어 있는지 확인
  const hasCamera = /\b(shot|angle|view|close-up|wide|medium|POV|bird's eye)\b/i.test(basePrompt);
  const hasLighting = /\b(light|glow|sunlight|moonlight|neon|shadow|backlight|ambient)\b/i.test(basePrompt);

  let enhanced = basePrompt;

  // 카메라 앵글이 프롬프트에 없으면 추가
  if (!hasCamera && camera) {
    enhanced += `, ${camera}`;
  }

  // 조명이 프롬프트에 없으면 추가
  if (!hasLighting && lighting) {
    enhanced += `, ${lighting}`;
  }

  return `High-quality detailed anime illustration for YouTube video scene. ${enhanced}. Absolutely no text, no letters, no words, no watermarks, no logos, no UI elements. Rich color palette, professional composition, 16:9 cinematic widescreen aspect ratio, high detail anime art with realistic shading and atmospheric depth.`;
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
          const prompt = buildEnhancedPrompt(scene);

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

          // 안전 정책 위반 확인
          const safetyError = extractSafetyError(response as any);
          if (safetyError) {
            return { sceneNumber: scene.sceneNumber, success: false, error: safetyError.message };
          }

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
          return { sceneNumber: scene.sceneNumber, success: false, error: 'AI가 이미지를 생성하지 못했습니다.' };
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
