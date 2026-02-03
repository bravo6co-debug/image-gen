import React from 'react';
import type { GenerationProgress as ProgressType, BatchProgress } from '../../types/longform';

interface GenerationProgressProps {
  progress: ProgressType;
}

const BatchProgressBar: React.FC<{ label: string; progress: BatchProgress }> = ({ label, progress: p }) => {
  const percent = p.total > 0 ? Math.round((p.completed / p.total) * 100) : 0;
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-300">{label}</span>
        <span className="text-xs text-gray-400">{p.completed}/{p.total} 완료{p.failed > 0 && `, ${p.failed} 실패`}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="bg-teal-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export const GenerationProgress: React.FC<GenerationProgressProps> = ({ progress }) => {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-200 mb-2">에셋 생성 중...</h3>
        <div className="w-full bg-gray-700 rounded-full h-3 mb-1">
          <div
            className="bg-gradient-to-r from-teal-500 to-cyan-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${progress.overallPercent}%` }}
          />
        </div>
        <span className="text-sm text-teal-400">{progress.overallPercent}%</span>
      </div>

      <BatchProgressBar label="씬 이미지 생성" progress={progress.sceneImages} />
      <BatchProgressBar label="나레이션 TTS 생성" progress={progress.narrations} />
    </div>
  );
};
