/**
 * Longform Video Service — Remotion 로직 기반 결정론적 렌더러
 *
 * Canvas + MediaRecorder를 사용하되, Remotion 컴포넌트
 * (KenBurnsEffect, Subtitles, Transitions, NarrationAudio)와
 * 동일한 결정론적 프레임 단위 로직으로 렌더링합니다.
 *
 * 변경 사항 (기존 대비):
 * - 실시간 elapsed 기반 → 결정론적 순차 프레임 루프
 * - 전체 오디오 병합 → 씬별 독립 AudioBufferSourceNode 스케줄
 * - 10초 세그먼트 Ken Burns → 씬 전체 연속 Ken Burns (KenBurnsEffect.tsx 동일)
 * - 자막 로직 Subtitles.tsx와 동일하게 정비 (fadeIn/fadeOut 0.3초)
 */

import type { LongformScene, LongformScenario } from '../types/longform';
import { calculateSplitPoint } from '../types/longform';
import type { RemotionSceneData } from '../remotion/types';
import type { AnimationConfig } from '../types';

// ─── 타입 ──────────────────────────────────────

export type LongformRenderStatus = 'idle' | 'preparing' | 'rendering' | 'complete' | 'error';

export interface LongformRenderProgress {
  status: LongformRenderStatus;
  progress: number;
  currentFrame?: number;
  totalFrames?: number;
  error?: string;
}

export interface LongformRenderResult {
  success: boolean;
  videoBlob?: Blob;
  videoUrl?: string;
  duration: number;
  sceneCount: number;
  error?: string;
}

export type LongformProgressCallback = (progress: LongformRenderProgress) => void;

// ─── 상수 ──────────────────────────────────────

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const TRANSITION_FRAMES = 15;
const BUFFER_SEC = 1;
const MIN_SCENE_SEC = 8;
const SEGMENT_SECONDS = 10;

// ─── 변환 유틸 (기존과 동일) ────────────────────

export function longformSceneToRemotionScene(scene: LongformScene): RemotionSceneData | null {
  if (!scene.generatedImage) return null;

  const audioDurationSec = scene.narrationAudio?.durationMs
    ? scene.narrationAudio.durationMs / 1000
    : 0;
  const duration = audioDurationSec > 0
    ? Math.max(MIN_SCENE_SEC, Math.ceil(audioDurationSec + BUFFER_SEC))
    : MIN_SCENE_SEC;

  return {
    id: scene.id,
    sceneNumber: scene.sceneNumber,
    duration,
    imageData: scene.generatedImage,
    narration: scene.narration,
    narrationAudio: scene.narrationAudio,
    animation: {
      type: 'kenBurns',
      direction: 'in',
      intensity: 0.3,
    },
    mood: scene.mood,
  };
}

export function longformScenesToRemotionScenes(scenes: LongformScene[]): RemotionSceneData[] {
  return scenes
    .map(longformSceneToRemotionScene)
    .filter((s): s is RemotionSceneData => s !== null);
}

export function splitScenesForExport(scenario: LongformScenario): {
  part1: LongformScene[];
  part2: LongformScene[];
} {
  const splitPoint = calculateSplitPoint(scenario.scenes.length);
  return {
    part1: scenario.scenes.slice(0, splitPoint),
    part2: scenario.scenes.slice(splitPoint),
  };
}

// ─── 씬 타이밍 사전 계산 ────────────────────────

interface SceneTiming {
  scene: RemotionSceneData;
  startFrame: number;
  durationFrames: number;
  startTimeSec: number;
}

function calculateSceneTimings(scenes: RemotionSceneData[]): SceneTiming[] {
  const timings: SceneTiming[] = [];
  let currentFrame = 0;

  for (const scene of scenes) {
    const durationFrames = Math.round(scene.duration * FPS);
    timings.push({
      scene,
      startFrame: currentFrame,
      durationFrames,
      startTimeSec: currentFrame / FPS,
    });
    currentFrame += durationFrames;
  }

  return timings;
}

// ─── 프레임 → 씬 매핑 ──────────────────────────

function getSceneAtFrame(
  timings: SceneTiming[],
  frame: number
): { timing: SceneTiming; frameInScene: number; sceneIndex: number } {
  for (let i = 0; i < timings.length; i++) {
    const t = timings[i];
    if (frame < t.startFrame + t.durationFrames) {
      return { timing: t, frameInScene: frame - t.startFrame, sceneIndex: i };
    }
  }
  const last = timings[timings.length - 1];
  return {
    timing: last,
    frameInScene: last.durationFrames - 1,
    sceneIndex: timings.length - 1,
  };
}

// ─── 이미지 프리로딩 ────────────────────────────

async function preloadSceneImages(
  scenes: RemotionSceneData[]
): Promise<Map<string, HTMLImageElement>> {
  const imageMap = new Map<string, HTMLImageElement>();

  await Promise.all(scenes.map(scene =>
    new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => { imageMap.set(scene.id, img); resolve(); };
      img.onerror = () => resolve();
      img.src = `data:${scene.imageData.mimeType};base64,${scene.imageData.data}`;
    })
  ));

  return imageMap;
}

// ─── 오디오 유틸 ────────────────────────────────

async function base64ToAudioBuffer(
  audioContext: AudioContext,
  base64Data: string
): Promise<AudioBuffer> {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return await audioContext.decodeAudioData(bytes.buffer);
}

// ─── 이미지 Cover 드로잉 ────────────────────────

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  scale: number = 1,
  translateXPercent: number = 0,
  translateYPercent: number = 0
): void {
  const imgRatio = img.width / img.height;
  const canvasRatio = canvas.width / canvas.height;

  let drawWidth: number;
  let drawHeight: number;

  if (imgRatio > canvasRatio) {
    drawHeight = canvas.height * scale;
    drawWidth = drawHeight * imgRatio;
  } else {
    drawWidth = canvas.width * scale;
    drawHeight = drawWidth / imgRatio;
  }

  // translate 퍼센트를 픽셀로 변환
  const offsetX = (translateXPercent / 100) * canvas.width;
  const offsetY = (translateYPercent / 100) * canvas.height;

  const drawX = (canvas.width - drawWidth) / 2 - offsetX;
  const drawY = (canvas.height - drawHeight) / 2 - offsetY;

  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}

// ─── lerp (Remotion interpolate 동등) ───────────

function lerp(from: number, to: number, progress: number): number {
  const p = Math.max(0, Math.min(1, progress));
  return from + (to - from) * p;
}

// ─── Ken Burns — KenBurnsEffect.tsx 로직 복제 ──

function computeKenBurns(
  animation: AnimationConfig | undefined,
  progress: number
): { scale: number; translateX: number; translateY: number } {
  const anim = animation || { type: 'kenBurns' as const, direction: 'in' as const, intensity: 0.5 };
  const intensity = anim.intensity ?? 0.5;
  const maxScale = 1 + intensity * 0.3;
  const maxTranslate = intensity * 5;

  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  switch (anim.type) {
    case 'kenBurns':
      if (anim.direction === 'in') {
        scale = lerp(1, maxScale, progress);
        translateX = lerp(0, maxTranslate, progress);
        translateY = lerp(0, -maxTranslate * 0.5, progress);
      } else {
        scale = lerp(maxScale, 1, progress);
        translateX = lerp(maxTranslate, 0, progress);
        translateY = lerp(-maxTranslate * 0.5, 0, progress);
      }
      break;

    case 'zoom':
      if (anim.direction === 'in') {
        scale = lerp(1, maxScale, progress);
      } else {
        scale = lerp(maxScale, 1, progress);
      }
      break;

    case 'pan':
      scale = 1.1;
      switch (anim.direction) {
        case 'left':
          translateX = lerp(maxTranslate, -maxTranslate, progress);
          break;
        case 'right':
          translateX = lerp(-maxTranslate, maxTranslate, progress);
          break;
        default:
          translateY = lerp(maxTranslate, -maxTranslate, progress);
      }
      break;

    case 'none':
    default:
      break;
  }

  return { scale, translateX, translateY };
}

// ─── 자막 — Subtitles.tsx 로직 복제 ────────────

/**
 * 나레이션 텍스트를 세그먼트로 분할 (문장 경계 우선)
 * Remotion Subtitles.tsx의 splitNarrationSegments와 동일
 */
function splitNarrationSegments(narration: string, durationSec: number): string[] {
  const segmentCount = Math.max(1, Math.floor(durationSec / SEGMENT_SECONDS));
  const targetLen = Math.ceil(narration.length / segmentCount);

  const segments: string[] = [];
  let remaining = narration;

  for (let i = 0; i < segmentCount - 1; i++) {
    if (!remaining) break;

    let cutIdx = Math.min(targetLen, remaining.length);

    let bestCut = -1;
    for (let j = Math.max(0, cutIdx - 15); j <= Math.min(remaining.length - 1, cutIdx + 15); j++) {
      if ('.!?。'.includes(remaining[j]) && j > 10) {
        bestCut = j + 1;
        break;
      }
    }

    if (bestCut === -1) {
      for (let j = cutIdx; j >= Math.max(0, cutIdx - 20); j--) {
        if (',، '.includes(remaining[j])) {
          bestCut = j + 1;
          break;
        }
      }
    }

    cutIdx = bestCut > 0 ? bestCut : cutIdx;
    segments.push(remaining.slice(0, cutIdx).trim());
    remaining = remaining.slice(cutIdx).trim();
  }

  if (remaining) segments.push(remaining.trim());
  return segments;
}

/**
 * 자막을 Canvas에 그리기 — Subtitles.tsx 렌더링 로직 복제
 * - 10초 세그먼트 분할, 오디오 범위 내에서만 표시
 * - fadeIn/fadeOut 0.3초 (Subtitles.tsx와 동일)
 * - 폰트: 화면 높이 6%, Pretendard bold (Subtitles.tsx와 동일)
 */
function drawSubtitles(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  scene: RemotionSceneData,
  frameInScene: number,
  sceneDurationFrames: number
): void {
  if (!scene.narration) return;

  // 오디오 기반 자막 범위 (Subtitles.tsx:76-78)
  const audioDurationFrames = scene.narrationAudio?.durationMs
    ? Math.round((scene.narrationAudio.durationMs / 1000) * FPS)
    : sceneDurationFrames;

  // 오디오 범위 밖이면 자막 숨김 (Subtitles.tsx:81)
  if (frameInScene >= audioDurationFrames) return;

  // 세그먼트 분할 (Subtitles.tsx:84-93)
  const audioDurationSec = scene.narrationAudio?.durationMs
    ? scene.narrationAudio.durationMs / 1000
    : sceneDurationFrames / FPS;
  const segments = splitNarrationSegments(scene.narration, audioDurationSec);
  const segFrames = audioDurationFrames / segments.length;
  const segIdx = Math.min(
    Math.floor(frameInScene / segFrames),
    segments.length - 1
  );
  const currentText = segments[segIdx];
  if (!currentText) return;

  // 페이드 계산 (Subtitles.tsx:96-119, fadeIn + fadeOut)
  const fadeFrames = Math.round(FPS * 0.3);
  const localFrame = frameInScene - segIdx * segFrames;
  let opacity = 1;
  if (localFrame < fadeFrames) {
    opacity = localFrame / fadeFrames;
  } else if (localFrame > segFrames - fadeFrames) {
    opacity = (segFrames - localFrame) / fadeFrames;
  }
  opacity = Math.max(0, Math.min(1, opacity));

  // 폰트 (Subtitles.tsx:129 — height * 0.06)
  const fontSize = Math.round(canvas.height * 0.06);
  ctx.font = `bold ${fontSize}px Pretendard, -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';

  // 텍스트 줄바꿈
  const maxLineWidth = canvas.width * 0.9;
  const lines: string[] = [];
  let currentLine = '';
  for (const char of currentText) {
    const testLine = currentLine + char;
    if (ctx.measureText(testLine).width > maxLineWidth && currentLine) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // 배경 박스 (Subtitles.tsx:143-150)
  const lineHeight = fontSize * 1.5;
  const padding = 24;
  const textX = canvas.width / 2;

  let maxWidth = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    if (w > maxWidth) maxWidth = w;
  }

  const boxHeight = lines.length * lineHeight + padding;
  const boxY = canvas.height * 0.92 - boxHeight;
  const boxX = textX - maxWidth / 2 - padding;
  const boxWidth = maxWidth + padding * 2;

  ctx.globalAlpha = opacity;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 16);
  ctx.fill();

  // 텍스트 (Subtitles.tsx:152-168)
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  lines.forEach((line, index) => {
    const textY = boxY + padding / 2 + fontSize + (index * lineHeight);
    ctx.fillText(line, textX, textY);
  });
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  ctx.globalAlpha = 1;
}

// ─── UI 블로킹 방지 ────────────────────────────

function yieldToMain(): Promise<void> {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

const YIELD_EVERY_N_FRAMES = 2;

// ─── 메인 렌더링 (결정론적 프레임 루프) ─────────

export async function renderLongformPart(
  scenes: RemotionSceneData[],
  onProgress?: LongformProgressCallback,
  abortSignal?: AbortSignal
): Promise<LongformRenderResult> {
  if (scenes.length === 0) {
    return { success: false, duration: 0, sceneCount: 0, error: '렌더링할 씬이 없습니다' };
  }

  onProgress?.({ status: 'preparing', progress: 0 });

  try {
    // ── 1. 씬 타이밍 사전 계산 ──
    const timings = calculateSceneTimings(scenes);
    const totalFrames = timings.reduce((acc, t) => acc + t.durationFrames, 0);
    const totalDuration = totalFrames / FPS;

    onProgress?.({ status: 'preparing', progress: 5, totalFrames });

    // ── 2. Canvas 설정 ──
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context를 생성할 수 없습니다');

    // ── 3. 이미지 프리로딩 ──
    const imageMap = await preloadSceneImages(scenes);
    onProgress?.({ status: 'preparing', progress: 10, totalFrames });

    // ── 4. 오디오 준비 — 씬별 독립 스케줄링 ──
    let audioContext: AudioContext | null = null;
    let audioDestination: MediaStreamAudioDestinationNode | null = null;
    const audioSources: AudioBufferSourceNode[] = [];
    const hasAudio = scenes.some(s => s.narrationAudio?.data);

    if (hasAudio) {
      try {
        audioContext = new AudioContext({ sampleRate: 44100 });
        audioDestination = audioContext.createMediaStreamDestination();

        // 씬별로 독립적인 AudioBufferSourceNode 생성
        for (const timing of timings) {
          if (timing.scene.narrationAudio?.data) {
            try {
              const buffer = await base64ToAudioBuffer(
                audioContext,
                timing.scene.narrationAudio.data
              );
              const source = audioContext.createBufferSource();
              source.buffer = buffer;
              source.connect(audioDestination);
              audioSources.push(source);
              // 스케줄 시간 저장 (start 호출은 렌더링 시작 시)
              (source as any).__scheduledTime = timing.startTimeSec;
            } catch (e) {
              console.warn(`Failed to decode audio for scene ${timing.scene.id}:`, e);
            }
          }
        }
      } catch (audioError) {
        console.warn('오디오 준비 실패, 오디오 없이 진행:', audioError);
        audioContext = null;
        audioDestination = null;
      }
    }

    onProgress?.({ status: 'preparing', progress: 15, totalFrames });

    // ── 5. MediaRecorder 설정 ──
    const videoStream = canvas.captureStream(0);
    const videoTrack = videoStream.getVideoTracks()[0] as any;
    const canRequestFrame = videoTrack && typeof videoTrack.requestFrame === 'function';

    let combinedStream: MediaStream;
    if (audioDestination) {
      combinedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...audioDestination.stream.getAudioTracks(),
      ]);
    } else {
      combinedStream = videoStream;
    }

    const mimeType = audioDestination ? 'video/webm;codecs=vp9,opus' : 'video/webm';
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 10_000_000,
      audioBitsPerSecond: audioDestination ? 128_000 : undefined,
    });

    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    // ── 6. 렌더링 시작 ──
    return new Promise<LongformRenderResult>((resolve) => {
      mediaRecorder.onstop = () => {
        for (const source of audioSources) {
          try { source.stop(); } catch { /* already stopped */ }
        }
        if (audioContext) audioContext.close();

        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);

        onProgress?.({ status: 'complete', progress: 100, totalFrames, currentFrame: totalFrames });

        resolve({
          success: true,
          videoBlob: blob,
          videoUrl: url,
          duration: totalDuration,
          sceneCount: scenes.length,
        });
      };

      mediaRecorder.start();

      // 오디오 시작 — 씬별 독립 스케줄
      const audioStartTime = audioContext ? audioContext.currentTime : 0;
      for (const source of audioSources) {
        const scheduledTime = (source as any).__scheduledTime || 0;
        source.start(audioStartTime + scheduledTime);
      }

      onProgress?.({ status: 'rendering', progress: 20, totalFrames, currentFrame: 0 });

      // ── 결정론적 프레임 루프 ──
      const renderLoop = async () => {
        for (let frame = 0; frame < totalFrames; frame++) {
          // 취소 확인
          if (abortSignal?.aborted) {
            mediaRecorder.stop();
            return;
          }

          // 현재 씬 찾기
          const { timing, frameInScene, sceneIndex } = getSceneAtFrame(timings, frame);
          const { scene, durationFrames } = timing;
          const img = imageMap.get(scene.id);

          // 캔버스 클리어
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          if (img) {
            const isLastScene = sceneIndex >= timings.length - 1;
            const isInTransition = !isLastScene &&
              frameInScene >= durationFrames - TRANSITION_FRAMES;

            if (isInTransition) {
              // ── 씬 전환: Fade 크로스페이드 (Transitions.tsx 동일) ──
              const nextTiming = timings[sceneIndex + 1];
              const nextImg = imageMap.get(nextTiming.scene.id);

              if (nextImg) {
                const transitionFrame = frameInScene - (durationFrames - TRANSITION_FRAMES);
                const transitionProgress = Math.min(1, Math.max(0, transitionFrame / TRANSITION_FRAMES));

                // 현재 씬 (페이드 아웃) + Ken Burns
                ctx.globalAlpha = 1 - transitionProgress;
                const currentKB = computeKenBurns(scene.animation, frameInScene / durationFrames);
                drawImageCover(ctx, canvas, img, currentKB.scale, currentKB.translateX, currentKB.translateY);

                // 다음 씬 (페이드 인)
                ctx.globalAlpha = transitionProgress;
                drawImageCover(ctx, canvas, nextImg, 1, 0, 0);
                ctx.globalAlpha = 1;
              } else {
                const kb = computeKenBurns(scene.animation, frameInScene / durationFrames);
                drawImageCover(ctx, canvas, img, kb.scale, kb.translateX, kb.translateY);
              }
            } else {
              // ── 일반 프레임: Ken Burns (KenBurnsEffect.tsx 동일) ──
              const kb = computeKenBurns(scene.animation, frameInScene / durationFrames);
              drawImageCover(ctx, canvas, img, kb.scale, kb.translateX, kb.translateY);
            }

            // ── 자막 (Subtitles.tsx 동일) ──
            drawSubtitles(ctx, canvas, scene, frameInScene, durationFrames);
          }

          // 프레임 푸시
          if (canRequestFrame) videoTrack.requestFrame();

          // 진행률 업데이트
          const progressPercent = 20 + ((frame + 1) / totalFrames) * 75;
          onProgress?.({
            status: 'rendering',
            progress: Math.min(progressPercent, 95),
            currentFrame: frame + 1,
            totalFrames,
          });

          // ── 오디오 동기화 대기 ──
          // audioContext 시간에 맞춰 프레임 속도를 조절하여
          // 비디오 프레임과 오디오가 정확히 동기화되도록 함
          if (audioContext && audioContext.state !== 'closed') {
            const targetTime = audioStartTime + (frame + 1) / FPS;
            const currentTime = audioContext.currentTime;
            const waitMs = (targetTime - currentTime) * 1000;
            if (waitMs > 2) {
              await new Promise<void>(r => setTimeout(r, waitMs));
            } else if (frame % YIELD_EVERY_N_FRAMES === 0) {
              await yieldToMain();
            }
          } else {
            if (frame % YIELD_EVERY_N_FRAMES === 0) {
              await yieldToMain();
            }
          }
        }

        // 마지막 데이터 플러시
        await new Promise<void>(r => setTimeout(r, 500));
        mediaRecorder.stop();
      };

      renderLoop().catch((err) => {
        onProgress?.({
          status: 'error',
          progress: 0,
          error: err instanceof Error ? err.message : '렌더링 실패',
        });
        try { mediaRecorder.stop(); } catch { /* ignore */ }
      });
    });
  } catch (error) {
    onProgress?.({
      status: 'error',
      progress: 0,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    });

    return {
      success: false,
      duration: 0,
      sceneCount: 0,
      error: error instanceof Error ? error.message : '렌더링 실패',
    };
  }
}

// ─── 다운로드 ──────────────────────────────────

export function downloadLongformVideo(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
