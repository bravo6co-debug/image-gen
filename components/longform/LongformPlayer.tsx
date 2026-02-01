import React, { useMemo, useState, useCallback } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { LongformVideo } from '../../remotion/LongformVideo';
import { longformScenesToRemotionScenes } from '../../services/longformVideoService';
import type { LongformScene } from '../../types/longform';
import type { RemotionSceneData } from '../../remotion/types';

interface LongformPlayerProps {
  scenes: LongformScene[];
  className?: string;
  autoPlay?: boolean;
}

export const LongformPlayer: React.FC<LongformPlayerProps> = ({
  scenes,
  className = '',
  autoPlay = false,
}) => {
  const playerRef = React.useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);

  const remotionScenes: RemotionSceneData[] = useMemo(() => {
    return longformScenesToRemotionScenes(scenes);
  }, [scenes]);

  const fps = 30;
  const totalDurationInFrames = useMemo(() => {
    return remotionScenes.reduce((acc, scene) => acc + Math.round(scene.duration * fps), 0);
  }, [remotionScenes]);

  const totalMinutes = Math.round(totalDurationInFrames / fps / 60);

  const hasAudio = useMemo(() => {
    return scenes.some(s => s.narrationAudio?.data);
  }, [scenes]);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      playerRef.current?.pause();
      setIsPlaying(false);
    } else {
      playerRef.current?.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeekToStart = useCallback(() => {
    playerRef.current?.seekTo(0);
  }, []);

  if (remotionScenes.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 rounded-lg p-8 ${className}`}>
        <p className="text-gray-500 text-sm">이미지가 생성된 씬이 없습니다</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      <div className="relative bg-black rounded-lg overflow-hidden">
        <Player
          ref={playerRef}
          component={LongformVideo}
          inputProps={{
            scenes: remotionScenes,
            showSubtitles: true,
            playAudio: !isMuted,
            audioVolume: isMuted ? 0 : 1,
          }}
          durationInFrames={Math.max(1, totalDurationInFrames)}
          compositionWidth={1920}
          compositionHeight={1080}
          fps={fps}
          style={{ width: '100%', aspectRatio: '16/9' }}
          controls={false}
          loop={false}
          autoPlay={autoPlay}
        />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
          <button
            onClick={handleTogglePlay}
            className="w-14 h-14 flex items-center justify-center bg-white/90 rounded-full hover:bg-white transition-colors"
          >
            {isPlaying ? (
              <svg className="w-7 h-7 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-7 h-7 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 px-1">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleSeekToStart}
            className="p-1.5 text-gray-400 hover:text-white transition-colors"
            title="처음으로"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleTogglePlay}
            className="p-1.5 bg-teal-600 text-white rounded-full hover:bg-teal-500 transition-colors"
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {hasAudio && (
            <button
              onClick={() => setIsMuted(m => !m)}
              className="p-1.5 text-gray-400 hover:text-white transition-colors"
              title={isMuted ? '음소거 해제' : '음소거'}
            >
              {isMuted ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              )}
            </button>
          )}
        </div>

        <div className="text-xs text-gray-400">
          {remotionScenes.length}개 씬 · ~{totalMinutes}분
        </div>
      </div>
    </div>
  );
};
