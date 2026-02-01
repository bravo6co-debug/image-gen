import React, { useState, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLongformScenario } from '../../hooks/useLongformScenario';
import { useLongformGeneration } from '../../hooks/useLongformGeneration';
import { useLongformExport } from '../../hooks/useLongformExport';
import { useLongformCharacters } from '../../hooks/useLongformCharacters';
import { StepIndicator } from './StepIndicator';
import { Step1BasicSetup } from './Step1BasicSetup';
import { Step2ScenarioEditor } from './Step2ScenarioEditor';
import { Step3CharacterSetup } from './Step3CharacterSetup';
import { Step3AssetGeneration } from './Step3AssetGeneration';
import { Step4PreviewDownload } from './Step4PreviewDownload';
import type { LongformStep, LongformConfig, LongformOutput } from '../../types/longform';

export const LongformTab: React.FC = () => {
  const { canUseApi } = useAuth();

  // 시나리오 훅
  const {
    scenario,
    isGenerating: isGeneratingScenario,
    error: scenarioError,
    generateScenario,
    updateScene,
    updateHookScene,
    adjustNarration,
    isAdjustingNarration,
    setScenario,
    clearError,
  } = useLongformScenario();

  // 캐릭터 훅
  const {
    characters,
    extractionStatus,
    error: characterError,
    extractCharacters,
    updateCharacter,
    removeCharacter,
    addCharacter,
    generateImage: generateCharacterImage,
    generateAllImages: generateAllCharacterImages,
    setCharacters,
    clearError: clearCharacterError,
  } = useLongformCharacters();

  // 에셋 생성 훅
  const {
    progress,
    isGenerating: isGeneratingAssets,
    startGeneration,
    cancelGeneration,
  } = useLongformGeneration();

  // 내보내기 훅
  const {
    part1State,
    part2State,
    isExporting,
    startExportPart1,
    startExportPart2,
    cancelExport,
    downloadPart,
    downloadHookVideo,
  } = useLongformExport();

  // 워크플로우 상태
  const [currentStep, setCurrentStep] = useState<LongformStep>(1);
  const [completedSteps, setCompletedSteps] = useState<LongformStep[]>([]);
  const [config, setConfig] = useState<LongformConfig | null>(null);
  const [output, setOutput] = useState<LongformOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 통합 에러
  const displayError = scenarioError || characterError || error;

  // STEP 1: 시나리오 생성
  const handleGenerateScenario = useCallback(async (newConfig: LongformConfig) => {
    if (!canUseApi) return;

    setConfig(newConfig);
    setError(null);

    try {
      await generateScenario(newConfig);
      setCompletedSteps(prev => [...prev, 1 as LongformStep]);
      setCurrentStep(2);
    } catch {
      // error handled by hook
    }
  }, [canUseApi, generateScenario]);

  // STEP 2 → 3 전환 (캐릭터 설정)
  const handleProceedToCharacterSetup = useCallback(() => {
    setCompletedSteps(prev => [...prev, 2 as LongformStep]);
    setCurrentStep(3);
  }, []);

  // STEP 3 → 4 전환 (에셋 생성)
  const handleProceedToGeneration = useCallback(() => {
    // 캐릭터를 시나리오에 저장
    if (scenario && characters.length > 0) {
      setScenario({ ...scenario, characters });
    }
    setCompletedSteps(prev => [...prev, 3 as LongformStep]);
    setCurrentStep(4);
  }, [scenario, characters, setScenario]);

  // STEP 4: 에셋 생성 시작
  const handleStartGeneration = useCallback(async () => {
    if (!scenario || !config) return;
    try {
      const updatedScenario = await startGeneration(scenario, config);
      setScenario(updatedScenario);
    } catch {
      setError('에셋 생성 중 오류가 발생했습니다.');
    }
  }, [scenario, config, startGeneration, setScenario]);

  // STEP 4 완료 → 5 전환
  const handleGenerationComplete = useCallback(() => {
    setCompletedSteps(prev => [...prev, 4 as LongformStep]);
    setCurrentStep(5);
  }, []);

  // 처음으로
  const handleReset = useCallback(() => {
    setCurrentStep(1);
    setCompletedSteps([]);
    setConfig(null);
    setScenario(null);
    setCharacters([]);
    setOutput(null);
    setError(null);
    clearError();
    clearCharacterError();
  }, [setScenario, setCharacters, clearError, clearCharacterError]);

  // 스텝별 콘텐츠 렌더링
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <Step1BasicSetup onGenerate={handleGenerateScenario} isGenerating={isGeneratingScenario} />;
      case 2:
        if (!scenario) {
          return (
            <div className="max-w-2xl mx-auto text-center py-12">
              <p className="text-gray-400">시나리오가 없습니다.</p>
              <button onClick={() => setCurrentStep(1)} className="mt-4 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 min-h-[44px]">
                이전 단계
              </button>
            </div>
          );
        }
        return (
          <Step2ScenarioEditor
            scenario={scenario}
            onUpdateScene={updateScene}
            onUpdateHook={updateHookScene}
            onAdjustNarration={adjustNarration}
            isAdjustingNarration={isAdjustingNarration}
            onPrev={() => setCurrentStep(1)}
            onNext={handleProceedToCharacterSetup}
            disabled={false}
          />
        );
      case 3:
        if (!scenario || !config) {
          return (
            <div className="max-w-2xl mx-auto text-center py-12">
              <p className="text-gray-400">시나리오가 없습니다.</p>
              <button onClick={() => setCurrentStep(1)} className="mt-4 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 min-h-[44px]">
                처음으로
              </button>
            </div>
          );
        }
        return (
          <Step3CharacterSetup
            scenario={scenario}
            config={config}
            characters={characters}
            extractionStatus={extractionStatus}
            onExtractCharacters={extractCharacters}
            onUpdateCharacter={updateCharacter}
            onRemoveCharacter={removeCharacter}
            onAddCharacter={addCharacter}
            onGenerateImage={(id) => generateCharacterImage(id, config.imageModel)}
            onGenerateAllImages={() => generateAllCharacterImages(config.imageModel)}
            onPrev={() => setCurrentStep(2)}
            onNext={handleProceedToGeneration}
          />
        );
      case 4:
        if (!scenario || !config) {
          return (
            <div className="max-w-2xl mx-auto text-center py-12">
              <p className="text-gray-400">시나리오가 없습니다.</p>
              <button onClick={() => setCurrentStep(1)} className="mt-4 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 min-h-[44px]">
                처음으로
              </button>
            </div>
          );
        }
        return (
          <Step3AssetGeneration
            scenario={scenario}
            config={config}
            progress={progress}
            onStartGeneration={handleStartGeneration}
            onComplete={handleGenerationComplete}
            onCancel={cancelGeneration}
            isGenerating={isGeneratingAssets}
          />
        );
      case 5:
        if (!scenario || !config) {
          return (
            <div className="max-w-2xl mx-auto text-center py-12">
              <p className="text-gray-400">시나리오가 없습니다.</p>
              <button onClick={() => setCurrentStep(1)} className="mt-4 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 min-h-[44px]">
                처음으로
              </button>
            </div>
          );
        }
        return (
          <Step4PreviewDownload
            scenario={scenario}
            config={config}
            part1State={part1State}
            part2State={part2State}
            isExporting={isExporting}
            onExportPart1={() => startExportPart1(scenario)}
            onExportPart2={() => startExportPart2(scenario)}
            onCancelExport={cancelExport}
            onDownloadPart={(part) => downloadPart(part, scenario)}
            onDownloadHook={() => downloadHookVideo(scenario)}
            onReset={handleReset}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 단계 인디케이터 */}
      <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

      {/* 에러 표시 */}
      {displayError && (
        <div className="mx-4 mb-2 p-3 bg-red-900/30 border border-red-700/50 rounded-lg">
          <p className="text-red-400 text-sm">{displayError}</p>
          <button
            onClick={() => { setError(null); clearError(); clearCharacterError(); }}
            className="text-red-500 text-xs underline mt-1"
          >
            닫기
          </button>
        </div>
      )}

      {/* 스텝 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 pb-4">
        {renderStepContent()}
      </div>
    </div>
  );
};

export default LongformTab;
