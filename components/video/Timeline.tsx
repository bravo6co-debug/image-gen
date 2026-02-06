import React, { useRef } from 'react';
import { VideoClip } from '../../types';

interface TimelineProps {
  clips: VideoClip[];
  currentTime: number;
  totalDuration: number;
  onSeek: (time: number) => void;
  selectedClipId: string | null;
  onSelectClip: (clipId: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  clips,
  currentTime,
  totalDuration,
  onSeek,
  selectedClipId,
  onSelectClip,
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timelineRef.current && totalDuration > 0) {
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const seekTime = percentage * totalDuration;
      onSeek(Math.max(0, Math.min(seekTime, totalDuration)));
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playheadPosition = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="bg-gray-900 rounded-lg p-2 sm:p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-2 text-xs sm:text-sm">
        <span className="text-white font-medium">{formatTime(currentTime)}</span>
        <span className="text-gray-500">/</span>
        <span className="text-gray-400">{formatTime(totalDuration)}</span>
      </div>

      {/* 타임라인 트랙 */}
      <div className="overflow-x-auto">
        <div
          ref={timelineRef}
          className="relative h-12 sm:h-16 bg-gray-800 rounded-lg cursor-pointer overflow-hidden min-w-[300px]"
          onClick={handleTimelineClick}
        >
          {/* 클립 블록들 */}
          <div className="absolute inset-0 flex">
            {clips.map((clip, index) => {
              const widthPercent = totalDuration > 0 ? (clip.duration / totalDuration) * 100 : 0;
              return (
                <div
                  key={clip.id}
                  style={{ width: `${widthPercent}%` }}
                  className={`h-full flex items-center justify-center border-r border-gray-700 transition-all min-h-[44px]
                    ${selectedClipId === clip.id ? 'bg-blue-600/50' : clip.generatedVideo ? 'bg-green-800/50' : 'bg-gray-700/50'}
                    ${clip.generatedVideo ? 'cursor-pointer hover:bg-green-700/50' : ''}
                  `}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectClip(clip.id);
                  }}
                >
                  <span className="text-[10px] sm:text-xs text-white/70 font-medium">#{index + 1}</span>
                </div>
              );
            })}
          </div>

          {/* 재생 헤드 */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
            style={{ left: `${playheadPosition}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-red-500" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
