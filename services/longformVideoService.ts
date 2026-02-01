/**
 * Longform Video Service - 롱폼 비디오 클라이언트 사이드 렌더링
 *
 * Canvas + MediaRecorder 기반으로 롱폼 비디오를 렌더링합니다.
 * 시나리오를 파트 1, 파트 2로 분할하여 각각 렌더링합니다.
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

// ─── 씬 타이밍 상수 ─────────────────────────────
const BUFFER_SEC = 1;       // 오디오 끝 → 씬 전환까지 여유
const MIN_SCENE_SEC = 8;    // 오디오 없는 씬의 최소 표시 시간

// ─── 변환 유틸 ─────────────────────────────────

export function longformSceneToRemotionScene(scene: LongformScene): RemotionSceneData | null {
  if (!scene.generatedImage) return null;

  // 씬 duration: 오디오 길이 + 버퍼 (오디오 없으면 최소값)
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

// ─── 내부 헬퍼 ─────────────────────────────────

interface AudioSegment {
  buffer: AudioBuffer;
  startTime: number;
  duration: number;
}

async function preloadSceneImages(
  scenes: RemotionSceneData[]
): Promise<Map<string, HTMLImageElement>> {
  const imageMap = new Map<string, HTMLImageElement>();

  await Promise.all(scenes.map(scene =>
    new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        imageMap.set(scene.id, img);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = `data:${scene.imageData.mimeType};base64,${scene.imageData.data}`;
    })
  ));

  return imageMap;
}

async function base64ToAudioBuffer(
  audioContext: AudioContext,
  base64Data: string,
  mimeType: string = 'audio/wav'
): Promise<AudioBuffer> {
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return await audioContext.decodeAudioData(bytes.buffer);
}

async function prepareAudioSegments(
  audioContext: AudioContext,
  scenes: RemotionSceneData[]
): Promise<AudioSegment[]> {
  const segments: AudioSegment[] = [];
  let currentTime = 0;

  for (const scene of scenes) {
    if (scene.narrationAudio?.data) {
      try {
        const buffer = await base64ToAudioBuffer(
          audioContext,
          scene.narrationAudio.data,
          scene.narrationAudio.mimeType
        );
        segments.push({ buffer, startTime: currentTime, duration: scene.duration });
      } catch (error) {
        console.warn(`Failed to decode audio for scene ${scene.id}:`, error);
      }
    }
    currentTime += scene.duration;
  }

  return segments;
}

function mergeAudioSegments(
  audioContext: AudioContext,
  segments: AudioSegment[],
  totalDuration: number,
  sampleRate: number = 44100
): AudioBuffer {
  const totalSamples = Math.ceil(totalDuration * sampleRate);
  const mergedBuffer = audioContext.createBuffer(2, totalSamples, sampleRate);

  for (const segment of segments) {
    const startSample = Math.floor(segment.startTime * sampleRate);
    const sourceBuffer = segment.buffer;

    for (let channel = 0; channel < Math.min(2, sourceBuffer.numberOfChannels); channel++) {
      const sourceData = sourceBuffer.getChannelData(channel);
      const targetData = mergedBuffer.getChannelData(channel);

      for (let i = 0; i < sourceData.length && (startSample + i) < totalSamples; i++) {
        targetData[startSample + i] += sourceData[i];
      }
    }

    if (sourceBuffer.numberOfChannels === 1) {
      const sourceData = sourceBuffer.getChannelData(0);
      const targetData = mergedBuffer.getChannelData(1);
      for (let i = 0; i < sourceData.length && (startSample + i) < totalSamples; i++) {
        targetData[startSample + i] += sourceData[i];
      }
    }
  }

  return mergedBuffer;
}

function getSceneAtFrame(
  scenes: RemotionSceneData[],
  frame: number,
  fps: number
): { sceneIndex: number; frameInScene: number; sceneDurationFrames: number } {
  let accumulatedFrames = 0;

  for (let i = 0; i < scenes.length; i++) {
    const sceneDurationFrames = Math.round(scenes[i].duration * fps);
    if (frame < accumulatedFrames + sceneDurationFrames) {
      return {
        sceneIndex: i,
        frameInScene: frame - accumulatedFrames,
        sceneDurationFrames,
      };
    }
    accumulatedFrames += sceneDurationFrames;
  }

  const lastIndex = scenes.length - 1;
  const lastSceneDuration = Math.round(scenes[lastIndex].duration * fps);
  return {
    sceneIndex: lastIndex,
    frameInScene: lastSceneDuration - 1,
    sceneDurationFrames: lastSceneDuration,
  };
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  img: HTMLImageElement,
  scale: number = 1,
  offsetX: number = 0,
  offsetY: number = 0
): void {
  const imgRatio = img.width / img.height;
  const canvasRatio = canvas.width / canvas.height;

  let drawWidth, drawHeight;
  if (imgRatio > canvasRatio) {
    drawHeight = canvas.height * scale;
    drawWidth = drawHeight * imgRatio;
  } else {
    drawWidth = canvas.width * scale;
    drawHeight = drawWidth / imgRatio;
  }

  const drawX = (canvas.width - drawWidth) / 2 - offsetX;
  const drawY = (canvas.height - drawHeight) / 2 - offsetY;

  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}

function interpolateValue(
  value: number,
  inputRange: number[],
  outputRange: number[]
): number {
  const clampedValue = Math.max(inputRange[0], Math.min(inputRange[inputRange.length - 1], value));

  for (let i = 0; i < inputRange.length - 1; i++) {
    if (clampedValue >= inputRange[i] && clampedValue <= inputRange[i + 1]) {
      const inputSpan = inputRange[i + 1] - inputRange[i];
      if (inputSpan === 0) return outputRange[i];
      const t = (clampedValue - inputRange[i]) / inputSpan;
      return outputRange[i] + t * (outputRange[i + 1] - outputRange[i]);
    }
  }

  return outputRange[outputRange.length - 1];
}

// ─── 메인 렌더링 ───────────────────────────────

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const TRANSITION_FRAMES = 15;
const SEGMENT_SECONDS = 10; // 10초 단위 자막/애니메이션 세그먼트
const SEGMENT_FRAMES = SEGMENT_SECONDS * FPS;
const CHARS_PER_SEGMENT = 50; // 세그먼트당 표시할 대략적 글자 수

/**
 * 나레이션 텍스트를 10초 단위 세그먼트로 분할
 * 문장 경계(. ! ? 등) 또는 공백에서 자연스럽게 나눔
 */
function splitNarrationSegments(narration: string, sceneDurationSec: number): string[] {
  const segmentCount = Math.max(1, Math.floor(sceneDurationSec / SEGMENT_SECONDS));
  const targetLen = Math.ceil(narration.length / segmentCount);

  const segments: string[] = [];
  let remaining = narration;

  for (let i = 0; i < segmentCount - 1; i++) {
    if (!remaining) break;

    // 목표 길이 근처에서 문장 경계 찾기
    let cutIdx = Math.min(targetLen, remaining.length);

    // 먼저 문장 끝(. ! ?) 찾기 (targetLen ± 15 범위)
    let bestCut = -1;
    for (let j = Math.max(0, cutIdx - 15); j <= Math.min(remaining.length - 1, cutIdx + 15); j++) {
      if ('.!?。'.includes(remaining[j]) && j > 10) {
        bestCut = j + 1;
        break;
      }
    }

    // 문장 경계 없으면 쉼표/공백에서 자르기
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
 * 10초 세그먼트별 카메라 이동 방향 결정
 * 0: 오른쪽→왼쪽, 1: 위→아래, 2: 왼쪽→오른쪽, 3: 아래→위
 */
function getSegmentAnimation(segmentIndex: number, segmentProgress: number): { scale: number; offsetX: number; offsetY: number } {
  // 기본 줌: 모든 세그먼트에서 미세하게 확대
  const baseScale = 1.02 + segmentProgress * 0.04;
  const panAmount = segmentProgress * 30; // 10초간 30px 이동

  const direction = segmentIndex % 4;
  switch (direction) {
    case 0: // 오른쪽 → 왼쪽
      return { scale: baseScale, offsetX: panAmount, offsetY: 0 };
    case 1: // 위 → 아래
      return { scale: baseScale, offsetX: 0, offsetY: panAmount };
    case 2: // 왼쪽 → 오른쪽
      return { scale: baseScale, offsetX: -panAmount, offsetY: 0 };
    case 3: // 아래 → 위
      return { scale: baseScale, offsetX: 0, offsetY: -panAmount };
    default:
      return { scale: baseScale, offsetX: panAmount, offsetY: 0 };
  }
}

export async function renderLongformPart(
  scenes: RemotionSceneData[],
  onProgress?: LongformProgressCallback
): Promise<LongformRenderResult> {
  if (scenes.length === 0) {
    return { success: false, duration: 0, sceneCount: 0, error: '렌더링할 씬이 없습니다' };
  }

  onProgress?.({ status: 'preparing', progress: 0 });

  try {
    const totalDuration = scenes.reduce((acc, s) => acc + s.duration, 0);
    const totalFrames = Math.round(totalDuration * FPS);

    onProgress?.({ status: 'preparing', progress: 5, totalFrames });

    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context를 생성할 수 없습니다');

    // 오디오 준비
    let audioContext: AudioContext | null = null;
    let audioDestination: MediaStreamAudioDestinationNode | null = null;
    let audioSource: AudioBufferSourceNode | null = null;
    const hasAudio = scenes.some(s => s.narrationAudio?.data);

    if (hasAudio) {
      try {
        audioContext = new AudioContext({ sampleRate: 44100 });
        const segments = await prepareAudioSegments(audioContext, scenes);

        if (segments.length > 0) {
          const mergedBuffer = mergeAudioSegments(audioContext, segments, totalDuration, audioContext.sampleRate);
          audioDestination = audioContext.createMediaStreamDestination();
          audioSource = audioContext.createBufferSource();
          audioSource.buffer = mergedBuffer;
          audioSource.connect(audioDestination);
        }
      } catch (audioError) {
        console.warn('오디오 준비 실패, 오디오 없이 진행:', audioError);
        audioContext = null;
        audioDestination = null;
      }
    }

    onProgress?.({ status: 'preparing', progress: 10, totalFrames });

    // 이미지 프리로딩
    const imageMap = await preloadSceneImages(scenes);

    onProgress?.({ status: 'preparing', progress: 15, totalFrames });

    // 비디오 스트림 생성
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

    return new Promise((resolve) => {
      mediaRecorder.onstop = () => {
        if (audioSource) {
          try { audioSource.stop(); } catch { /* already stopped */ }
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

      const renderStartTime = audioContext ? audioContext.currentTime : performance.now() / 1000;
      if (audioSource) audioSource.start(0);

      mediaRecorder.start();

      onProgress?.({ status: 'rendering', progress: 20, totalFrames, currentFrame: 0 });

      let lastRenderedFrame = -1;

      const getElapsed = (): number => {
        if (audioContext && audioContext.state !== 'closed') {
          return audioContext.currentTime - renderStartTime;
        }
        return (performance.now() / 1000) - renderStartTime;
      };

      const renderFrame = () => {
        const elapsed = getElapsed();
        const currentFrame = Math.min(Math.floor(elapsed * FPS), totalFrames - 1);

        if (elapsed >= totalDuration) {
          mediaRecorder.stop();
          return;
        }

        if (currentFrame <= lastRenderedFrame) {
          const nextFrameTime = (lastRenderedFrame + 1) / FPS;
          const delay = Math.max(1, (nextFrameTime - elapsed) * 1000);
          setTimeout(renderFrame, delay);
          return;
        }

        lastRenderedFrame = currentFrame;

        const { sceneIndex, frameInScene, sceneDurationFrames } = getSceneAtFrame(scenes, currentFrame, FPS);
        const scene = scenes[sceneIndex];
        const img = imageMap.get(scene.id);

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        if (img) {
          const isInTransition = sceneIndex < scenes.length - 1 &&
            frameInScene >= sceneDurationFrames - TRANSITION_FRAMES;

          if (isInTransition) {
            const nextScene = scenes[sceneIndex + 1];
            const nextImg = imageMap.get(nextScene.id);

            if (nextImg) {
              const transitionFrame = frameInScene - (sceneDurationFrames - TRANSITION_FRAMES);
              const transitionProgress = Math.min(1, Math.max(0, transitionFrame / TRANSITION_FRAMES));

              // Fade transition
              ctx.globalAlpha = 1 - transitionProgress;
              drawImageCover(ctx, canvas, img);
              ctx.globalAlpha = transitionProgress;
              drawImageCover(ctx, canvas, nextImg);
              ctx.globalAlpha = 1;
            } else {
              const progress = frameInScene / sceneDurationFrames;
              drawImageCover(ctx, canvas, img, 1 + progress * 0.09, progress * 12);
            }
          } else {
            // 가변 씬 길이에 맞춰 Ken Burns 세그먼트 분할
            const totalKBSegments = Math.max(1, Math.ceil(sceneDurationFrames / SEGMENT_FRAMES));
            const actualSegFrames = sceneDurationFrames / totalKBSegments;
            const segmentIndex = Math.floor(frameInScene / actualSegFrames);
            const segmentProgress = (frameInScene % actualSegFrames) / actualSegFrames;
            const anim = getSegmentAnimation(segmentIndex, segmentProgress);
            drawImageCover(ctx, canvas, img, anim.scale, anim.offsetX, anim.offsetY);
          }

          // 자막 (오디오 재생 시간 내에서만 비례 분할 표시)
          if (scene.narration) {
            const sceneDurationSec = sceneDurationFrames / FPS;
            const audioDurationSec = scene.narrationAudio?.durationMs
              ? scene.narrationAudio.durationMs / 1000
              : sceneDurationSec;
            const audioDurationFrames = Math.round(audioDurationSec * FPS);

            // 오디오 범위 안에서만 자막 표시
            if (frameInScene < audioDurationFrames) {
              const segments = splitNarrationSegments(scene.narration, audioDurationSec);
              const segDurationFrames = audioDurationFrames / segments.length;
              const segmentIndex = Math.min(
                Math.floor(frameInScene / segDurationFrames),
                segments.length - 1
              );
              const currentText = segments[segmentIndex] || '';

            if (currentText) {
              const fontSize = Math.round(canvas.height * 0.05);
              ctx.font = `bold ${fontSize}px Pretendard, sans-serif`;
              ctx.textAlign = 'center';

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

              // 세그먼트 전환 시 페이드인 효과 (첫 10프레임)
              const frameInSegment = frameInScene % Math.round(segDurationFrames);
              const fadeAlpha = Math.min(1, frameInSegment / 10);

              ctx.globalAlpha = fadeAlpha;
              ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
              ctx.beginPath();
              ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 12);
              ctx.fill();

              ctx.fillStyle = '#fff';
              ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
              ctx.shadowBlur = 4;
              ctx.shadowOffsetX = 1;
              ctx.shadowOffsetY = 1;
              lines.forEach((line, index) => {
                const textY = boxY + padding / 2 + fontSize + (index * lineHeight);
                ctx.fillText(line, textX, textY);
              });
              ctx.shadowColor = 'transparent';
              ctx.shadowBlur = 0;
              ctx.globalAlpha = 1;
            }
            } // end: frameInScene < audioDurationFrames
          }
        }

        if (canRequestFrame) videoTrack.requestFrame();

        const progressPercent = 20 + ((currentFrame + 1) / totalFrames) * 75;
        onProgress?.({
          status: 'rendering',
          progress: Math.min(progressPercent, 95),
          currentFrame: currentFrame + 1,
          totalFrames,
        });

        const nextElapsed = getElapsed();
        const nextFrameTime = (currentFrame + 1) / FPS;
        const delay = Math.max(1, (nextFrameTime - nextElapsed) * 1000);
        setTimeout(renderFrame, delay);
      };

      setTimeout(renderFrame, 0);
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
