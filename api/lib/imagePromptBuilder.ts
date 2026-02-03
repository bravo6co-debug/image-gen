/**
 * 모델별 최적화된 이미지 프롬프트 빌더
 *
 * - Gemini: 서술형 문단, 시네마틱/포토그래픽 언어, semantic negative
 * - Imagen: 주어→배경→스타일 구조, 퀄리티 모디파이어
 * - FLUX: 간결 명시적 지시, 메타지시 제거, "no text" 강조
 */

type ModelCategory = 'gemini' | 'imagen' | 'flux';

export interface ScenePromptParams {
  imagePrompt: string;
  cameraAngle?: string;
  lightingMood?: string;
  mood?: string;
}

export interface HookPromptParams {
  visualDescription: string;
}

export interface CharacterPromptParams {
  characterName?: string;
  appearanceDescription: string;
  outfit?: string;
}

// ─── 모델 분류 ────────────────────────────────────

function getModelCategory(model: string): ModelCategory {
  if (model.startsWith('flux-kontext-')) return 'flux';
  if (model.startsWith('imagen-')) return 'imagen';
  return 'gemini';
}

// ─── 카메라/조명 중복 체크 ─────────────────────────

function hasCamera(text: string): boolean {
  return /\b(shot|angle|view|close-up|wide|medium|POV|bird's eye|low-angle|high-angle|Dutch|tracking)\b/i.test(text);
}

function hasLighting(text: string): boolean {
  return /\b(light|glow|sunlight|moonlight|neon|shadow|backlight|ambient|golden hour|blue hour|rim light)\b/i.test(text);
}

function enhanceBase(basePrompt: string, camera?: string, lighting?: string): string {
  let enhanced = basePrompt.trim();
  if (!hasCamera(enhanced) && camera) enhanced += `, ${camera}`;
  if (!hasLighting(enhanced) && lighting) enhanced += `, ${lighting}`;
  return enhanced;
}

// ─── 씬 프롬프트 ──────────────────────────────────

function buildScenePromptGemini(p: ScenePromptParams): string {
  const enhanced = enhanceBase(p.imagePrompt, p.cameraAngle, p.lightingMood);
  const moodClause = p.mood ? ` The atmosphere conveys a sense of ${p.mood}.` : '';

  return `A cinematic anime scene depicting ${enhanced}.${moodClause} The scene is rendered in high-detail anime art style with realistic shading and atmospheric depth, using a rich and vibrant color palette. Professional composition with cinematic framing in widescreen 16:9 aspect ratio. No text, letters, words, watermarks, logos, or UI elements appear anywhere in the image.`;
}

function buildScenePromptImagen(p: ScenePromptParams): string {
  const enhanced = enhanceBase(p.imagePrompt, p.cameraAngle, p.lightingMood);
  const moodPart = p.mood ? `, ${p.mood} mood` : '';

  return `${enhanced}${moodPart}. Anime style, high-quality, stylized, beautiful, rich color palette, professional composition, realistic shading, atmospheric depth, 16:9 cinematic widescreen. No text, no letters, no watermarks, no logos.`;
}

function buildScenePromptFlux(p: ScenePromptParams): string {
  const enhanced = enhanceBase(p.imagePrompt, p.cameraAngle, p.lightingMood);

  return `Anime illustration, ${enhanced}. Absolutely no visible text, letters, numbers, or writing in any language, no watermarks, no logos. 16:9 cinematic widescreen.`;
}

// ─── 후킹 프롬프트 ────────────────────────────────

function buildHookPromptGemini(p: HookPromptParams): string {
  return `A dramatic and eye-catching anime scene designed as a YouTube video hook: ${p.visualDescription}. The composition is bold and attention-grabbing with saturated colors and cinematic framing that creates immediate visual impact. Rendered in high-detail anime art style with realistic shading and atmospheric depth. Widescreen 16:9 aspect ratio. No text, letters, words, watermarks, logos, or UI elements appear anywhere in the image.`;
}

function buildHookPromptImagen(p: HookPromptParams): string {
  return `${p.visualDescription}. Eye-catching dramatic composition, anime style, high-quality, stylized, rich saturated color palette, professional cinematic framing, 16:9 widescreen, realistic shading, atmospheric depth. No text, no letters, no watermarks, no logos.`;
}

function buildHookPromptFlux(p: HookPromptParams): string {
  return `Dramatic anime illustration, ${p.visualDescription}. Eye-catching cinematic composition, saturated colors. Absolutely no visible text, letters, numbers, or writing in any language, no watermarks, no logos. 16:9 widescreen.`;
}

// ─── 캐릭터 프롬프트 ──────────────────────────────

function buildCharacterPromptGemini(p: CharacterPromptParams): string {
  const name = p.characterName || 'character';
  const outfit = p.outfit || 'casual clothes';

  return `An anime-style character portrait of ${name}. ${p.appearanceDescription}. The character is wearing ${outfit}. The portrait shows the upper body, with the character facing slightly to the side under soft, even lighting against a clean background. Rendered in high-detail anime art style with vibrant colors. No text, letters, watermarks, or UI elements appear in the image.`;
}

function buildCharacterPromptImagen(p: CharacterPromptParams): string {
  const name = p.characterName || 'character';
  const outfit = p.outfit || 'casual clothes';

  return `${name}, ${p.appearanceDescription}, wearing ${outfit}. Anime style character portrait, upper body, facing slightly to the side, clean background, soft lighting, high-quality, stylized, vibrant colors, high detail. No text, no watermarks, no letters.`;
}

function buildCharacterPromptFlux(p: CharacterPromptParams): string {
  const name = p.characterName || 'character';
  const outfit = p.outfit || 'casual clothes';

  return `Anime character portrait of ${name}. ${p.appearanceDescription}. Wearing ${outfit}. Upper body, slight side angle, clean background, soft lighting. Absolutely no visible text, letters, or writing, no watermarks.`;
}

// ─── 통합 빌더 ────────────────────────────────────

export function buildImagePrompt(
  model: string,
  type: 'scene',
  params: ScenePromptParams,
): string;
export function buildImagePrompt(
  model: string,
  type: 'hook',
  params: HookPromptParams,
): string;
export function buildImagePrompt(
  model: string,
  type: 'character',
  params: CharacterPromptParams,
): string;
export function buildImagePrompt(
  model: string,
  type: 'scene' | 'hook' | 'character',
  params: ScenePromptParams | HookPromptParams | CharacterPromptParams,
): string {
  const category = getModelCategory(model);

  if (type === 'scene') {
    const p = params as ScenePromptParams;
    if (category === 'flux') return buildScenePromptFlux(p);
    if (category === 'imagen') return buildScenePromptImagen(p);
    return buildScenePromptGemini(p);
  }

  if (type === 'hook') {
    const p = params as HookPromptParams;
    if (category === 'flux') return buildHookPromptFlux(p);
    if (category === 'imagen') return buildHookPromptImagen(p);
    return buildHookPromptGemini(p);
  }

  const p = params as CharacterPromptParams;
  if (category === 'flux') return buildCharacterPromptFlux(p);
  if (category === 'imagen') return buildCharacterPromptImagen(p);
  return buildCharacterPromptGemini(p);
}
