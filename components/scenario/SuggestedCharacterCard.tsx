import React from 'react';
import type { SuggestedCharacter, ImageData } from '../../types';

interface SuggestedCharacterCardProps {
  character: SuggestedCharacter;
  isCreated: boolean;
  isGenerating?: boolean;
  createdThumbnail?: ImageData;
  onQuickGenerate: () => void;
}

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

export const SuggestedCharacterCard: React.FC<SuggestedCharacterCardProps> = ({
  character,
  isCreated,
  isGenerating = false,
  createdThumbnail,
  onQuickGenerate,
}) => {
  return (
    <div
      className={`p-3 rounded-lg border transition-all duration-200 ${
        isCreated
          ? 'border-green-500/50 bg-green-500/10'
          : isGenerating
          ? 'border-purple-500/50 bg-purple-500/10'
          : 'border-gray-600 bg-gray-700/50 hover:bg-gray-700'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* 썸네일 또는 플레이스홀더 */}
        <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-gray-600">
          {isCreated && createdThumbnail ? (
            <img
              src={`data:${createdThumbnail.mimeType};base64,${createdThumbnail.data}`}
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : isGenerating ? (
            <div className="w-full h-full flex items-center justify-center bg-purple-900/50">
              <SpinnerIcon className="w-5 h-5 text-purple-400" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          )}
        </div>

        {/* 캐릭터 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-white truncate">{character.name}</h4>
            <span className="text-xs text-gray-400 px-1.5 py-0.5 bg-gray-600 rounded flex-shrink-0">
              {character.role}
            </span>
          </div>
          <p className="text-sm text-gray-300 mt-1 line-clamp-2">{character.description}</p>
        </div>

        {/* 액션 버튼 */}
        <div className="flex-shrink-0">
          {isCreated ? (
            <CheckCircleIcon className="w-5 h-5 text-green-500" />
          ) : isGenerating ? (
            <span className="text-xs text-purple-400">생성중...</span>
          ) : (
            <button
              onClick={onQuickGenerate}
              disabled={isGenerating}
              className="px-2.5 py-1 text-xs font-medium text-white bg-purple-600 rounded hover:bg-purple-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              생성
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SuggestedCharacterCard;
