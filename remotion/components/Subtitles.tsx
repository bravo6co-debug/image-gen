import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

const SEGMENT_SECONDS = 10;

interface SubtitlesProps {
  text: string;
  audioDurationMs?: number;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  position?: 'top' | 'center' | 'bottom';
  fadeIn?: boolean;
  fadeOut?: boolean;
}

/**
 * 나레이션 텍스트를 세그먼트로 분할 (문장 경계 우선)
 */
function splitNarrationSegments(narration: string, durationSec: number): string[] {
  const segmentCount = Math.max(1, Math.floor(durationSec / SEGMENT_SECONDS));
  const targetLen = Math.ceil(narration.length / segmentCount);

  const segments: string[] = [];
  let remaining = narration;

  for (let i = 0; i < segmentCount - 1; i++) {
    if (!remaining) break;

    let cutIdx = Math.min(targetLen, remaining.length);

    // 문장 끝(. ! ?) 찾기 (targetLen ± 15 범위)
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

export const Subtitles: React.FC<SubtitlesProps> = ({
  text,
  audioDurationMs,
  fontSize = 72,
  fontColor = '#ffffff',
  backgroundColor = 'rgba(0, 0, 0, 0.75)',
  position = 'bottom',
  fadeIn = true,
  fadeOut = true,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, height } = useVideoConfig();

  if (!text) return null;

  // 오디오 기반 자막 범위 계산
  const audioDurationFrames = audioDurationMs
    ? Math.round((audioDurationMs / 1000) * fps)
    : durationInFrames;

  // 오디오 범위 밖이면 자막 숨김
  if (frame >= audioDurationFrames) return null;

  // 세그먼트 분할
  const audioDurationSec = audioDurationMs
    ? audioDurationMs / 1000
    : durationInFrames / fps;
  const segments = splitNarrationSegments(text, audioDurationSec);
  const segFrames = audioDurationFrames / segments.length;
  const segIdx = Math.min(
    Math.floor(frame / segFrames),
    segments.length - 1
  );
  const currentText = segments[segIdx];

  // 세그먼트 내 로컬 프레임 (페이드 계산용)
  const localFrame = frame - segIdx * segFrames;
  const fadeFrames = Math.round(fps * 0.3);

  let opacity = 1;
  if (fadeIn && fadeOut) {
    opacity = interpolate(
      localFrame,
      [0, fadeFrames, segFrames - fadeFrames, segFrames],
      [0, 1, 1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  } else if (fadeIn) {
    opacity = interpolate(localFrame, [0, fadeFrames], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  } else if (fadeOut) {
    opacity = interpolate(
      localFrame,
      [segFrames - fadeFrames, segFrames],
      [1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }

  // 위치 스타일
  const positionStyles: React.CSSProperties = {
    top: position === 'top' ? '5%' : position === 'center' ? '50%' : undefined,
    bottom: position === 'bottom' ? '8%' : undefined,
    transform: position === 'center' ? 'translateY(-50%)' : undefined,
  };

  // 화면 높이 기준으로 폰트 크기 계산 (6% of height)
  const dynamicFontSize = Math.round(height * 0.06);

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-end',
        padding: '0 3%',
        zIndex: 100,
        pointerEvents: 'none',
        ...positionStyles,
      }}
    >
      <div
        style={{
          backgroundColor,
          padding: '20px 36px',
          borderRadius: 16,
          maxWidth: '94%',
          opacity,
        }}
      >
        <p
          style={{
            fontSize: dynamicFontSize,
            fontWeight: 700,
            color: fontColor,
            textAlign: 'center',
            margin: 0,
            lineHeight: 1.5,
            letterSpacing: '0.02em',
            fontFamily: 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif',
            wordBreak: 'keep-all',
            whiteSpace: 'pre-wrap',
            textShadow: '2px 2px 6px rgba(0, 0, 0, 0.9)',
          }}
        >
          {currentText}
        </p>
      </div>
    </AbsoluteFill>
  );
};
