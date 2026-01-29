import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

interface SubtitlesProps {
  text: string;
  fontSize?: number;
  fontColor?: string;
  backgroundColor?: string;
  position?: 'top' | 'center' | 'bottom';
  fadeIn?: boolean;
  fadeOut?: boolean;
}

export const Subtitles: React.FC<SubtitlesProps> = ({
  text,
  fontSize = 72,  // 기본 폰트 크기 (height 기준으로 조정됨)
  fontColor = '#ffffff',
  backgroundColor = 'rgba(0, 0, 0, 0.75)',
  position = 'bottom',
  fadeIn = true,
  fadeOut = true,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, height } = useVideoConfig();

  if (!text) return null;

  // 페이드 인/아웃 효과
  const fadeFrames = Math.round(fps * 0.3);
  let opacity = 1;

  if (fadeIn && fadeOut) {
    opacity = interpolate(
      frame,
      [0, fadeFrames, durationInFrames - fadeFrames, durationInFrames],
      [0, 1, 1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  } else if (fadeIn) {
    opacity = interpolate(frame, [0, fadeFrames], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  } else if (fadeOut) {
    opacity = interpolate(
      frame,
      [durationInFrames - fadeFrames, durationInFrames],
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

  // 화면 높이 기준으로 폰트 크기 계산 (6% of height, 2.5배 큰 크기)
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
          {text}
        </p>
      </div>
    </AbsoluteFill>
  );
};
