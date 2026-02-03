import React from 'react';
import type { LongformScenario, LongformScene } from '../../types/longform';
import { SceneCard } from './SceneCard';

interface Step2ScenarioEditorProps {
  scenario: LongformScenario;
  onUpdateScene: (sceneNumber: number, updates: Partial<LongformScene>) => void;
  onAdjustNarration: (sceneNumber: number) => void;
  isAdjustingNarration: number | null;
  onPrev: () => void;
  onNext: () => void;
  disabled: boolean;
}

export const Step2ScenarioEditor: React.FC<Step2ScenarioEditorProps> = ({
  scenario,
  onUpdateScene,
  onAdjustNarration,
  isAdjustingNarration,
  onPrev,
  onNext,
  disabled,
}) => {
  const { scenes, metadata } = scenario;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-200">{metadata.title}</h3>
        <p className="text-sm text-gray-400">{scenes.length}개 씬 | {metadata.estimatedDuration}</p>
      </div>

      {/* Scene List */}
      <div className="space-y-3">
        {scenes.map((scene) => (
          <SceneCard
            key={scene.id}
            scene={scene}
            onUpdate={(updates) => onUpdateScene(scene.sceneNumber, updates)}
            onAdjustNarration={() => onAdjustNarration(scene.sceneNumber)}
            isAdjusting={isAdjustingNarration === scene.sceneNumber}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onPrev}
          className="px-5 py-2.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors min-h-[44px]"
        >
          이전 단계
        </button>
        <button
          onClick={onNext}
          className="px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all min-h-[44px]"
        >
          다음 단계: 캐릭터 설정
        </button>
      </div>
    </div>
  );
};
