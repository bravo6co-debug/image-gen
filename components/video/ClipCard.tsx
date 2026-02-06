import React from 'react';
import { VideoClip } from '../../types';
import {
  TrashIcon,
  PlayIcon,
  DownloadIcon,
  RefreshIcon,
  FilmIcon,
} from '../Icons';

interface ClipCardProps {
  clip: VideoClip;
  isSelected: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
  isGenerating: boolean;
  onPlayVideo?: () => void;
  onDownload?: () => void;
}

export const ClipCard: React.FC<ClipCardProps> = ({
  clip,
  isSelected,
  isPlaying,
  onSelect,
  onRegenerate,
  onDelete,
  isGenerating,
  onPlayVideo,
  onDownload,
}) => {
  const thumbnailUrl = clip.generatedVideo?.thumbnailUrl || (clip.sourceImage ? `data:${clip.sourceImage.mimeType};base64,${clip.sourceImage.data}` : null);
  const hasVideo = clip.generatedVideo?.url;

  return (
    <div
      className={`relative group bg-gray-800 rounded-lg border-2 transition-all duration-200 cursor-pointer overflow-hidden
        ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-gray-700 hover:border-gray-600'}
        ${isPlaying ? 'ring-2 ring-green-500/50' : ''}
      `}
      onClick={onSelect}
    >
      {/* 썸네일 / 비디오 프리뷰 */}
      <div className="relative aspect-video bg-gray-900">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={`Clip ${clip.order + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FilmIcon className="w-8 h-8 text-gray-600" />
          </div>
        )}

        {/* 비디오 재생 버튼 (비디오가 있을 때만) */}
        {hasVideo && !isGenerating && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlayVideo?.();
            }}
            className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity min-h-[44px]"
          >
            <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center">
              <PlayIcon className="w-6 h-6 text-gray-900 ml-1" />
            </div>
          </button>
        )}

        {/* 상태 오버레이 */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 mx-auto text-blue-500" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-xs text-white mt-2">생성 중...</p>
            </div>
          </div>
        )}

        {/* 비디오 생성 상태 */}
        {clip.generatedVideo ? (
          <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-green-600/80 rounded text-[10px] sm:text-xs text-white font-medium">
            완료
          </div>
        ) : clip.sourceImage ? (
          <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-amber-600/80 rounded text-[10px] sm:text-xs text-white font-medium">
            대기
          </div>
        ) : (
          <div className="absolute top-1.5 sm:top-2 right-1.5 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-600/80 rounded text-[10px] sm:text-xs text-white font-medium">
            이미지 없음
          </div>
        )}

        {/* 클립 번호 */}
        <div className="absolute top-1.5 sm:top-2 left-1.5 sm:left-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-900/80 rounded text-[10px] sm:text-xs text-white font-bold">
          #{clip.order + 1}
        </div>

        {/* 길이 */}
        <div className="absolute bottom-1.5 sm:bottom-2 right-1.5 sm:right-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gray-900/80 rounded text-[10px] sm:text-xs text-white">
          {clip.duration}초
        </div>

        {/* 호버 액션 */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          {hasVideo && onDownload && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload();
              }}
              className="p-2 bg-green-600 rounded-full text-white hover:bg-green-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="비디오 다운로드"
            >
              <DownloadIcon className="w-5 h-5" />
            </button>
          )}
          {clip.sourceImage && !isGenerating && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRegenerate();
              }}
              className="p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="비디오 재생성"
            >
              <RefreshIcon className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-2 bg-red-600 rounded-full text-white hover:bg-red-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="삭제"
          >
            <TrashIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 클립 정보 */}
      <div className="p-1.5 sm:p-2">
        <p className="text-[10px] sm:text-xs text-gray-400 truncate">
          {clip.motionPrompt || '모션 프롬프트 없음'}
        </p>
      </div>
    </div>
  );
};

export default ClipCard;
