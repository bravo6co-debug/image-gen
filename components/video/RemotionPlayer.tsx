import React, { useMemo, useState, useCallback } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { ShortFormVideo } from '../../remotion/ShortFormVideo';
import { scenesToRemotionScenes, type RemotionSceneData, type TransitionConfig } from '../../remotion/types';
import type { Scene, AspectRatio } from '../../types';

interface RemotionPlayerProps {
  scenes: Scene[];
  aspectRatio?: AspectRatio;
  transitionType?: TransitionConfig['type'];
  transitionDuration?: number;
  showSubtitles?: boolean;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
}

export const RemotionPlayer: React.FC<RemotionPlayerProps> = ({
  scenes,
  aspectRatio = '9:16',
  transitionType = 'fade',
  transitionDuration = 15,
  showSubtitles = true,
  className = '',
  autoPlay = false,
  loop = false,
  onPlay,
  onPause,
  onEnded,
}) => {
  const playerRef = React.useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  // Scene 데이터를 Remotion 형식으로 변환
  const remotionScenes: RemotionSceneData[] = useMemo(() => {
    return scenesToRemotionScenes(scenes);
  }, [scenes]);

  // 총 재생 시간 계산 (프레임)
  const fps = 30;
  const totalDurationInFrames = useMemo(() => {
    return remotionScenes.reduce((acc, scene) => acc + Math.round(scene.duration * fps), 0);
  }, [remotionScenes]);

  // 비디오 크기 계산
  const videoDimensions = useMemo(() => {
    if (aspectRatio === '16:9') {
      return { width: 1920, height: 1080 };
    }
    return { width: 1080, height: 1920 };
  }, [aspectRatio]);

  // 재생 컨트롤
  const handlePlay = useCallback(() => {
    playerRef.current?.play();
    setIsPlaying(true);
    onPlay?.();
  }, [onPlay]);

  const handlePause = useCallback(() => {
    playerRef.current?.pause();
    setIsPlaying(false);
    onPause?.();
  }, [onPause]);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      handlePause();
    } else {
      handlePlay();
    }
  }, [isPlaying, handlePlay, handlePause]);

  const handleSeekToStart = useCallback(() => {
    playerRef.current?.seekTo(0);
  }, []);

  if (remotionScenes.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 rounded-lg ${className}`}>
        <div className="text-center text-gray-500 p-8">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-gray-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
            />
          </svg>
          <p className="text-sm">이미지가 있는 씬이 없습니다</p>
          <p className="text-xs text-gray-600 mt-1">
            시나리오 탭에서 이미지를 생성하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* 비디오 플레이어 */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <Player
          ref={playerRef}
          component={ShortFormVideo}
          inputProps={{
            scenes: remotionScenes,
            aspectRatio,
            transitionType,
            transitionDuration,
            showSubtitles,
          }}
          durationInFrames={Math.max(1, totalDurationInFrames)}
          compositionWidth={videoDimensions.width}
          compositionHeight={videoDimensions.height}
          fps={fps}
          style={{
            width: '100%',
            aspectRatio: aspectRatio === '16:9' ? '16/9' : '9/16',
          }}
          controls={false}
          loop={loop}
          autoPlay={autoPlay}
        />

        {/* 커스텀 컨트롤 오버레이 */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
          <button
            onClick={handleTogglePlay}
            className="w-16 h-16 flex items-center justify-center bg-white/90 rounded-full hover:bg-white transition-colors"
          >
            {isPlaying ? (
              <svg className="w-8 h-8 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 하단 컨트롤 바 */}
      <div className="flex items-center justify-between mt-3 px-2">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSeekToStart}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="처음으로"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleTogglePlay}
            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-500 transition-colors"
          >
            {isPlaying ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>

        <div className="text-sm text-gray-400">
          {remotionScenes.length}개 씬 · {Math.round(totalDurationInFrames / fps)}초
        </div>
      </div>
    </div>
  );
};

export default RemotionPlayer;
