import React from 'react';
import type { LongformScenario, LongformScene } from '../../types/longform';
import { SceneCard } from './SceneCard';

interface Step2ScenarioEditorProps {
  scenario: LongformScenario;
  onUpdateScene: (sceneNumber: number, updates: Partial<LongformScene>) => void;
  onUpdateHook: (updates: Partial<LongformScenario['hookScene']>) => void;
  onAdjustNarration: (sceneNumber: number) => void;
  isAdjustingNarration: number | null;
  onPrev: () => void;
  onNext: () => void;
  disabled: boolean;
}

export const Step2ScenarioEditor: React.FC<Step2ScenarioEditorProps> = ({
  scenario,
  onUpdateScene,
  onUpdateHook,
  onAdjustNarration,
  isAdjustingNarration,
  onPrev,
  onNext,
  disabled,
}) => {
  const { hookScene, scenes, metadata } = scenario;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-200">{metadata.title}</h3>
        <p className="text-sm text-gray-400">{scenes.length}개 씬 | {metadata.estimatedDuration}</p>
      </div>

      {/* Hook Scene */}
      <div className="bg-gray-800/70 border border-teal-700/50 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-teal-400 mb-3">후킹 씬 (10초 동영상)</h4>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">비주얼 (이미지 프롬프트)</label>
            <textarea
              value={hookScene.visualDescription}
              onChange={(e) => onUpdateHook({ visualDescription: e.target.value })}
              rows={2}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-xs text-gray-300 resize-none focus:ring-1 focus:ring-teal-500 focus:border-transparent focus:outline-none"
              disabled={disabled}
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">모션 프롬프트</label>
            <textarea
              value={hookScene.motionPrompt}
              onChange={(e) => onUpdateHook({ motionPrompt: e.target.value })}
              rows={2}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-xs text-gray-300 resize-none focus:ring-1 focus:ring-teal-500 focus:border-transparent focus:outline-none"
              disabled={disabled}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-500">후킹 자막</label>
              <span className="text-xs text-gray-500">{hookScene.hookText.length}/20자</span>
            </div>
            <input
              type="text"
              value={hookScene.hookText}
              onChange={(e) => onUpdateHook({ hookText: e.target.value })}
              maxLength={20}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded text-sm text-gray-200 focus:ring-1 focus:ring-teal-500 focus:border-transparent focus:outline-none"
              disabled={disabled}
            />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-700" />
        <span className="text-xs text-gray-500 font-medium">본편 씬 목록</span>
        <div className="flex-1 h-px bg-gray-700" />
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
