import React from 'react';
import type { LongformScene } from '../../types/longform';
import { NarrationCounter } from './NarrationCounter';

interface SceneCardProps {
  scene: LongformScene;
  onUpdate: (updates: Partial<LongformScene>) => void;
  onAdjustNarration: () => void;
  isAdjusting: boolean;
  disabled: boolean;
}

export const SceneCard: React.FC<SceneCardProps> = ({
  scene,
  onUpdate,
  onAdjustNarration,
  isAdjusting,
  disabled,
}) => {
  const charCount = scene.narration.length;
  const needsAdjustment = charCount < 360 || charCount > 370;

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-teal-400">
            씬 {scene.sceneNumber}
          </span>
          <span className="text-xs text-gray-500">({scene.timeRange})</span>
          <span className="px-2 py-0.5 bg-gray-700 rounded text-xs text-gray-400">
            {scene.storyPhase}
          </span>
        </div>
        <span className="text-xs text-gray-500">{scene.mood}</span>
      </div>

      {/* Image Prompt */}
      <div className="mb-3">
        <label className="block text-xs text-gray-500 mb-1">이미지 프롬프트</label>
        <textarea
          value={scene.imagePrompt}
          onChange={(e) => onUpdate({ imagePrompt: e.target.value })}
          rows={2}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-xs text-gray-300 resize-none focus:ring-1 focus:ring-teal-500 focus:border-transparent focus:outline-none"
          disabled={disabled}
        />
      </div>

      {/* Narration */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs text-gray-500">나레이션</label>
          <div className="flex items-center gap-2">
            <NarrationCounter charCount={charCount} />
            {needsAdjustment && (
              <button
                onClick={onAdjustNarration}
                disabled={disabled || isAdjusting}
                className="text-xs px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded hover:bg-yellow-600/30 disabled:opacity-50"
              >
                {isAdjusting ? '보정 중...' : '자동 보정'}
              </button>
            )}
          </div>
        </div>
        <textarea
          value={scene.narration}
          onChange={(e) => onUpdate({ narration: e.target.value, narrationCharCount: e.target.value.length })}
          rows={4}
          className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-200 resize-none focus:ring-1 focus:ring-teal-500 focus:border-transparent focus:outline-none"
          disabled={disabled}
        />
      </div>
    </div>
  );
};
