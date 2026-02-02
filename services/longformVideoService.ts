/**
 * Longform Video Service — 10초 그리드 기반 단순화 렌더러
 *
 * 모든 것을 10초 단위 세그먼트로 고정:
 * - 이미지 뷰포트: 전체 → 오른쪽 → 왼쪽 → 오른쪽... (10초마다 전환)
 * - 자막: 나레이션을 세그먼트 수로 균등 분할, 10초마다 교체
 * - 오디오: 10초 단위로 슬라이싱하여 독립 스케줄링 (씽크 보장)
 */

import type { LongformScene, LongformScenario } from '../types/longform';
import { calculateSplitPoint } from '../types/longform';
import type { RemotionSceneData } from '../remotion/types';

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
const SEGMENT_SEC = 10;
const SEGMENT_FRAMES = SEGMENT_SEC * FPS; // 300
const SCENE_TRANSITION_FRAMES = 15;       // 씬 간 크로스페이드 (0.5초)
const VIEWPORT_TRANSITION_FRAMES = 30;    // 뷰포트 전환 애니메이션 (1초)

// ─── 뷰포트 (전체 / 오른쪽 / 왼쪽) ──────────────

type Viewport = 'full' | 'right' | 'left';

interface ViewportState {
  scale: number;
  offsetXPercent: number;
}

const VIEWPORT_STATES: Record<Viewport, ViewportState> = {
  full:  { scale: 1.0,  offsetXPercent: 0 },
  right: { scale: 1.35, offsetXPercent: -12 },
  left:  { scale: 1.35, offsetXPercent: 12 },
};

/** 세그먼트 0=전체, 이후 오른쪽/왼쪽 교대 */
function getViewportForSegment(segmentIndex: number): Viewport {
  if (segmentIndex === 0) return 'full';
  return segmentIndex % 2 === 1 ? 'right' : 'left';
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

// ─── 변환 유틸 ─────────────────────────────────

export function longformSceneToRemotionScene(scene: LongformScene): RemotionSceneData | null {
  if (!scene.generatedImage) return null;

  const audioDurationSec = scene.narrationAudio?.durationMs
    ? scene.narrationAudio.durationMs / 1000
    : 0;

  // 10초 단위로 올림 (최소 10초)
  const segmentCount = Math.max(1, Math.ceil((audioDurationSec + 1) / SEGMENT_SEC));
  const duration = segmentCount * SEGMENT_SEC;

  return {
    id: scene.id,
    sceneNumber: scene.sceneNumber,
    duration,
    imageData: scene.generatedImage,
    narration: scene.narration,
    narrationAudio: scene.narrationAudio,
    animation: { type: 'kenBurns', direction: 'in', intensity: 0.3 },
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

// ─── 씬 타이밍 (10초 그리드) ─────────────────────

interface SceneTiming {
  scene: RemotionSceneData;
  startFrame: number;
  durationFrames: number;
  segmentCount: number;
  subtitleSegments: string[];
  startTimeSec: number;
}

function calculateSceneTimings(scenes: RemotionSceneData[]): SceneTiming[] {
  const timings: SceneTiming[] = [];
  let currentFrame = 0;

  for (const scene of scenes) {
    const segmentCount = Math.round(scene.duration / SEGMENT_SEC);
    const durationFrames = segmentCount * SEGMENT_FRAMES;
    const subtitleSegments = splitNarrationFixed(scene.narration, segmentCount);

    timings.push({
      scene,
      startFrame: currentFrame,
      durationFrames,
      segmentCount,
      subtitleSegments,
      startTimeSec: currentFrame / FPS,
    });

    currentFrame += durationFrames;
  }

  return timings;
}

// ─── 나레이션 텍스트 분할 (고정 N등분) ────────────

function splitNarrationFixed(narration: string, segmentCount: number): string[] {
  if (!narration || segmentCount <= 0) return [];
  if (segmentCount === 1) return [narration.trim()];

  const targetLen = Math.ceil(narration.length / segmentCount);
  const segments: string[] = [];
  let remaining = narration;

  for (let i = 0; i < segmentCount - 1; i++) {
    if (!remaining) { segments.push(''); continue; }

    let cutIdx = Math.min(targetLen, remaining.length);

    // 문장 경계 우선 탐색
    let bestCut = -1;
    for (let j = Math.max(0, cutIdx - 15); j <= Math.min(remaining.length - 1, cutIdx + 15); j++) {
      if ('.!?。'.includes(remaining[j]) && j > 5) {
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

  // 부족한 세그먼트는 빈 문자열로 채움
  while (segments.length < segmentCount) segments.push('');

  return segments;
}

// ─── 프레임 → 씬/세그먼트 매핑 ──────────────────

function getSceneAtFrame(timings: SceneTiming[], frame: number): {
  timing: SceneTiming;
  sceneIndex: number;
  frameInScene: number;
  segmentIndex: number;
  frameInSegment: number;
} {
  for (let i = 0; i < timings.length; i++) {
    const t = timings[i];
    if (frame < t.startFrame + t.durationFrames) {
      const frameInScene = frame - t.startFrame;
      const segmentIndex = Math.min(
        Math.floor(frameInScene / SEGMENT_FRAMES),
        t.segmentCount - 1
      );
      const frameInSegment = frameInScene - segmentIndex * SEGMENT_FRAMES;
      return { timing: t, sceneIndex: i, frameInScene, segmentIndex, frameInSegment };
    }
  }
  const last = timings[timings.length - 1];
  return {
    timing: last,
    sceneIndex: timings.length - 1,
    frameInScene: last.durationFrames - 1,
    segmentIndex: last.segmentCount - 1,
    frameInSegment: SEGMENT_FRAMES - 1,
  };
}

// ─── 이미지 프리로딩 ───────────────────────────

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

// ─── 오디오 유틸 ───────────────────────────────

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

/** AudioBuffer를 10초 단위로 슬라이싱 */
function sliceAudioBuffer(
  audioContext: AudioContext,
  buffer: AudioBuffer,
  startSec: number,
  durationSec: number
): AudioBuffer | null {
  const startSample = Math.floor(startSec * buffer.sampleRate);
  const numSamples = Math.min(
    Math.floor(durationSec * buffer.sampleRate),
    buffer.length - startSample
  );
  if (numSamples <= 0) return null;

  const sliced = audioContext.createBuffer(
    buffer.numberOfChannels,
    numSamples,
    buffer.sampleRate
  );
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    sliced.getChannelData(ch).set(
      buffer.getChannelData(ch).subarray(startSample, startSample + numSamples)
    );
  }
  return sliced;
}

// ─── 이미지 드로잉 (뷰포트 기반) ────────────────

function drawImageWithViewport(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  scale: number,
  offsetXPercent: number
): void {
  const imgRatio = img.width / img.height;
  const canvasRatio = canvas.width / canvas.height;

  let drawW: number;
  let drawH: number;

  if (imgRatio > canvasRatio) {
    drawH = canvas.height;
    drawW = drawH * imgRatio;
  } else {
    drawW = canvas.width;
    drawH = drawW / imgRatio;
  }

  drawW *= scale;
  drawH *= scale;

  const offsetX = (offsetXPercent / 100) * canvas.width;
  const x = (canvas.width - drawW) / 2 + offsetX;
  const y = (canvas.height - drawH) / 2;

  ctx.drawImage(img, x, y, drawW, drawH);
}

// ─── 자막 드로잉 (10초 고정 세그먼트) ──────────

function drawSubtitle(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  text: string,
  frameInSegment: number
): void {
  if (!text) return;

  // 페이드: 처음 0.3초 fadeIn, 마지막 0.3초 fadeOut
  const fadeFrames = Math.round(FPS * 0.3);
  let opacity = 1;
  if (frameInSegment < fadeFrames) {
    opacity = frameInSegment / fadeFrames;
  } else if (frameInSegment > SEGMENT_FRAMES - fadeFrames) {
    opacity = (SEGMENT_FRAMES - frameInSegment) / fadeFrames;
  }
  opacity = Math.max(0, Math.min(1, opacity));

  const fontSize = Math.round(canvas.height * 0.055);
  ctx.font = `bold ${fontSize}px Pretendard, -apple-system, BlinkMacSystemFont, sans-serif`;
  ctx.textAlign = 'center';

  // 줄바꿈
  const maxLineWidth = canvas.width * 0.85;
  const lines: string[] = [];
  let currentLine = '';
  for (const char of text) {
    const testLine = currentLine + char;
    if (ctx.measureText(testLine).width > maxLineWidth && currentLine) {
      lines.push(currentLine);
      currentLine = char;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // 배경 박스
  const lineHeight = fontSize * 1.5;
  const padding = 20;
  const textX = canvas.width / 2;

  let maxWidth = 0;
  for (const line of lines) {
    const w = ctx.measureText(line).width;
    if (w > maxWidth) maxWidth = w;
  }

  const boxH = lines.length * lineHeight + padding;
  const boxY = canvas.height * 0.88 - boxH;
  const boxX = textX - maxWidth / 2 - padding;
  const boxW = maxWidth + padding * 2;

  ctx.globalAlpha = opacity;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 12);
  ctx.fill();

  // 텍스트
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;
  lines.forEach((line, i) => {
    ctx.fillText(line, textX, boxY + padding / 2 + fontSize + i * lineHeight);
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

// ─── 메인 렌더링 ───────────────────────────────

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
    // ── 1. 타이밍 계산 (10초 그리드) ──
    const timings = calculateSceneTimings(scenes);
    const totalFrames = timings.reduce((acc, t) => acc + t.durationFrames, 0);
    const totalDuration = totalFrames / FPS;

    // ── 2. Canvas 설정 ──
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context 생성 실패');

    // ── 3. 이미지 프리로드 ──
    const imageMap = await preloadSceneImages(scenes);
    onProgress?.({ status: 'preparing', progress: 10, totalFrames });

    // ── 4. 오디오: 10초 단위 슬라이싱 + 독립 스케줄링 ──
    let audioContext: AudioContext | null = null;
    let audioDestination: MediaStreamAudioDestinationNode | null = null;
    const audioSources: { source: AudioBufferSourceNode; startTime: number }[] = [];
    const hasAudio = scenes.some(s => s.narrationAudio?.data);

    if (hasAudio) {
      try {
        audioContext = new AudioContext({ sampleRate: 44100 });
        audioDestination = audioContext.createMediaStreamDestination();

        for (const timing of timings) {
          if (!timing.scene.narrationAudio?.data) continue;

          try {
            const fullBuffer = await base64ToAudioBuffer(
              audioContext,
              timing.scene.narrationAudio.data
            );

            // 10초 단위로 슬라이싱하여 각각 스케줄
            for (let seg = 0; seg < timing.segmentCount; seg++) {
              const sliceStart = seg * SEGMENT_SEC;
              const sliced = sliceAudioBuffer(audioContext, fullBuffer, sliceStart, SEGMENT_SEC);
              if (!sliced) continue;

              const source = audioContext.createBufferSource();
              source.buffer = sliced;
              source.connect(audioDestination);

              const absoluteStartSec = timing.startTimeSec + seg * SEGMENT_SEC;
              audioSources.push({ source, startTime: absoluteStartSec });
            }
          } catch (e) {
            console.warn(`Audio decode failed for scene ${timing.scene.id}:`, e);
          }
        }
      } catch (e) {
        console.warn('오디오 준비 실패:', e);
        audioContext = null;
        audioDestination = null;
      }
    }

    onProgress?.({ status: 'preparing', progress: 15, totalFrames });

    // ── 5. MediaRecorder 설정 ──
    const videoStream = canvas.captureStream(0);
    const videoTrack = videoStream.getVideoTracks()[0] as any;
    const canRequestFrame = videoTrack && typeof videoTrack.requestFrame === 'function';

    const combinedStream = audioDestination
      ? new MediaStream([
          ...videoStream.getVideoTracks(),
          ...audioDestination.stream.getAudioTracks(),
        ])
      : videoStream;

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

    // ── 6. 렌더링 루프 ──
    return new Promise<LongformRenderResult>((resolve) => {
      mediaRecorder.onstop = () => {
        for (const { source } of audioSources) {
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

      // 오디오: 10초 세그먼트별 독립 시작
      const audioStartTime = audioContext ? audioContext.currentTime : 0;
      for (const { source, startTime } of audioSources) {
        source.start(audioStartTime + startTime);
      }

      onProgress?.({ status: 'rendering', progress: 20, totalFrames, currentFrame: 0 });

      const renderLoop = async () => {
        for (let frame = 0; frame < totalFrames; frame++) {
          if (abortSignal?.aborted) { mediaRecorder.stop(); return; }

          const { timing, sceneIndex, frameInScene, segmentIndex, frameInSegment } =
            getSceneAtFrame(timings, frame);
          const img = imageMap.get(timing.scene.id);

          // 캔버스 클리어
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          if (img) {
            const isLastScene = sceneIndex >= timings.length - 1;
            const isInSceneTransition = !isLastScene &&
              frameInScene >= timing.durationFrames - SCENE_TRANSITION_FRAMES;

            if (isInSceneTransition) {
              // ── 씬 간 크로스페이드 ──
              const nextImg = imageMap.get(timings[sceneIndex + 1].scene.id);
              if (nextImg) {
                const tf = frameInScene - (timing.durationFrames - SCENE_TRANSITION_FRAMES);
                const tp = Math.min(1, Math.max(0, tf / SCENE_TRANSITION_FRAMES));

                // 현재 씬 (페이드 아웃)
                const currentVP = VIEWPORT_STATES[getViewportForSegment(segmentIndex)];
                ctx.globalAlpha = 1 - tp;
                drawImageWithViewport(ctx, canvas, img, currentVP.scale, currentVP.offsetXPercent);

                // 다음 씬 (전체 뷰로 페이드 인)
                ctx.globalAlpha = tp;
                drawImageWithViewport(ctx, canvas, nextImg, 1, 0);
                ctx.globalAlpha = 1;
              } else {
                const vp = VIEWPORT_STATES[getViewportForSegment(segmentIndex)];
                drawImageWithViewport(ctx, canvas, img, vp.scale, vp.offsetXPercent);
              }
            } else {
              // ── 뷰포트: 세그먼트 전환 시 1초 부드럽게 ──
              const currentVP = getViewportForSegment(segmentIndex);
              const prevVP = segmentIndex > 0
                ? getViewportForSegment(segmentIndex - 1)
                : currentVP;

              let scale: number;
              let offsetX: number;

              if (frameInSegment < VIEWPORT_TRANSITION_FRAMES && segmentIndex > 0) {
                // 부드러운 전환 (1초)
                const t = frameInSegment / VIEWPORT_TRANSITION_FRAMES;
                const fromState = VIEWPORT_STATES[prevVP];
                const toState = VIEWPORT_STATES[currentVP];
                scale = lerp(fromState.scale, toState.scale, t);
                offsetX = lerp(fromState.offsetXPercent, toState.offsetXPercent, t);
              } else {
                const state = VIEWPORT_STATES[currentVP];
                scale = state.scale;
                offsetX = state.offsetXPercent;
              }

              drawImageWithViewport(ctx, canvas, img, scale, offsetX);
            }

            // ── 자막 (10초 고정) ──
            const subtitleText = timing.subtitleSegments[segmentIndex] || '';
            drawSubtitle(ctx, canvas, subtitleText, frameInSegment);
          }

          // 프레임 푸시
          if (canRequestFrame) videoTrack.requestFrame();

          // 진행률 (1초마다 업데이트)
          if (frame % FPS === 0) {
            const pct = 20 + ((frame + 1) / totalFrames) * 75;
            onProgress?.({
              status: 'rendering',
              progress: Math.min(pct, 95),
              currentFrame: frame + 1,
              totalFrames,
            });
          }

          // ── 오디오 시간에 동기화 ──
          if (audioContext && audioContext.state !== 'closed') {
            const targetTime = audioStartTime + (frame + 1) / FPS;
            const waitMs = (targetTime - audioContext.currentTime) * 1000;
            if (waitMs > 2) {
              await new Promise<void>(r => setTimeout(r, waitMs));
            } else if (frame % 2 === 0) {
              await yieldToMain();
            }
          } else {
            if (frame % 2 === 0) await yieldToMain();
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
