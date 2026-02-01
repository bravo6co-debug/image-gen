import React from 'react';
import type { GenerationProgress as ProgressType, BatchProgress } from '../../types/longform';

interface GenerationProgressProps {
  progress: ProgressType;
}

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  switch (status) {
    case 'completed':
      return <span className="text-green-400">&#10003;</span>;
    case 'generating':
      return <span className="animate-spin inline-block w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full" />;
    case 'failed':
      return <span className="text-red-400">&#10007;</span>;
    default:
      return <span className="text-gray-500">&#9711;</span>;
  }
};

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

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <StatusIcon status={progress.hookImage} />
          <span className="text-gray-300">후킹 이미지 생성</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <StatusIcon status={progress.hookVideo} />
          <span className="text-gray-300">후킹 영상 생성 (Hailuo AI)</span>
        </div>
      </div>

      <BatchProgressBar label="씬 이미지 생성" progress={progress.sceneImages} />
      <BatchProgressBar label="나레이션 TTS 생성" progress={progress.narrations} />
    </div>
  );
};
