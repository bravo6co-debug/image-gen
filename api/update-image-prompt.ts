import type { VercelRequest, VercelResponse } from '@vercel/node';
import { ai, MODELS, Type, sanitizePrompt, setCorsHeaders, STYLE_PROMPTS, getThinkingConfig } from './lib/gemini.js';
import type { ApiErrorResponse, ImageStyle, ScenarioTone } from './lib/types.js';

interface UpdateImagePromptRequest {
    visualDescription: string;
    imageStyle?: ImageStyle;
    tone?: ScenarioTone;
}

/**
 * POST /api/update-image-prompt
 * Generates a new imagePrompt based on visualDescription
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    setCorsHeaders(res, req.headers.origin as string);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' } as ApiErrorResponse);
    }

    try {
        const { visualDescription, imageStyle = 'photorealistic', tone = 'emotional' } = req.body as UpdateImagePromptRequest;

        if (!visualDescription || visualDescription.trim().length === 0) {
            return res.status(400).json({ error: 'visualDescription is required' } as ApiErrorResponse);
        }

        const sanitizedDescription = sanitizePrompt(visualDescription, 2000);
        const stylePromptText = STYLE_PROMPTS[imageStyle] || STYLE_PROMPTS.photorealistic;

        const prompt = `당신은 AI 이미지 생성을 위한 프롬프트 작성 전문가입니다.
한국어로 된 시각적 묘사를 영어 이미지 생성 프롬프트로 변환하세요.

## 입력
- **시각적 묘사 (한국어)**: "${sanitizedDescription}"
- **이미지 스타일**: ${imageStyle}
- **톤/분위기**: ${tone}

## 작성 규칙
1. 반드시 영어로 작성
2. 아트 스타일 프리픽스 추가: "${stylePromptText.substring(0, 150)}..."
3. 한국인 인물 묘사 시 "Korean" 명시
4. 인물의 표정, 자세, 시선 방향 구체적으로
5. 배경, 조명, 시간대 명시
6. 감정과 분위기를 시각적으로 표현
7. 카메라 앵글/구도 포함
8. 품질 관련 키워드 (high quality, detailed, professional) 포함

## 출력 형식
영어로 작성된 이미지 생성 프롬프트를 반환하세요.`;

        const response = await ai.models.generateContent({
            model: MODELS.TEXT,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        imagePrompt: {
                            type: Type.STRING,
                            description: "Generated image prompt in English",
                        },
                    },
                    required: ["imagePrompt"],
                },
                ...getThinkingConfig(MODELS.TEXT),
            },
        });

        const parsed = JSON.parse(response.text);

        return res.status(200).json({ imagePrompt: parsed.imagePrompt });

    } catch (e) {
        console.error("Error updating image prompt:", e);
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        return res.status(500).json({
            error: `Image prompt update failed: ${errorMessage}`,
            code: 'GENERATION_FAILED'
        } as ApiErrorResponse);
    }
}
