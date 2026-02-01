import React, { useEffect, useRef } from 'react';
import type { LongformScenario, LongformConfig, GenerationProgress as ProgressType } from '../../types/longform';
import { GenerationProgress } from './GenerationProgress';

interface Step3AssetGenerationProps {
  scenario: LongformScenario;
  config: LongformConfig;
  progress: ProgressType | null;
  onStartGeneration: () => void;
  onComplete: () => void;
  onCancel: () => void;
  isGenerating: boolean;
}

export const Step3AssetGeneration: React.FC<Step3AssetGenerationProps> = ({
  scenario,
  config,
  progress,
  onStartGeneration,
  onComplete,
  onCancel,
  isGenerating,
}) => {
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!hasStarted.current) {
      hasStarted.current = true;
      onStartGeneration();
    }
  }, [onStartGeneration]);

  const isComplete = progress?.currentStep === 'completed';

  useEffect(() => {
    if (isComplete) {
      hasStarted.current = false;
    }
  }, [isComplete]);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-4">
      {progress ? (
        <GenerationProgress progress={progress} />
      ) : (
        <div className="text-center py-8">
          <div className="animate-spin w-8 h-8 border-2 border-teal-400 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-400">에셋 생성을 준비 중입니다...</p>
        </div>
      )}

      <div className="flex justify-center gap-3 pt-4">
        {isComplete ? (
          <button
            onClick={onComplete}
            className="px-6 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-lg hover:from-teal-600 hover:to-cyan-700 min-h-[44px]"
          >
            다음 단계: 미리보기
          </button>
        ) : (
          <button
            onClick={onCancel}
            disabled={!isGenerating}
            className="px-5 py-2.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 min-h-[44px]"
          >
            중단하기
          </button>
        )}
      </div>
    </div>
  );
};
