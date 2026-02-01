import { useState, useCallback, useRef } from 'react';
import type { LongformScenario, LongformConfig, GenerationProgress, AssetStatus } from '../types/longform';
import {
  generateHookImage,
  generateHookVideo,
  generateSceneImages,
  generateNarrations,
} from '../services/longformApiClient';

interface UseLongformGenerationReturn {
  progress: GenerationProgress | null;
  isGenerating: boolean;
  startGeneration: (scenario: LongformScenario, config: LongformConfig) => Promise<LongformScenario>;
  cancelGeneration: () => void;
}

function createInitialProgress(sceneCount: number): GenerationProgress {
  return {
    currentStep: 'hook-image',
    hookImage: 'pending',
    hookVideo: 'pending',
    sceneImages: { total: sceneCount, completed: 0, failed: 0, inProgress: 0 },
    narrations: { total: sceneCount, completed: 0, failed: 0, inProgress: 0 },
    overallPercent: 0,
  };
}

function calcPercent(p: GenerationProgress): number {
  const hookImageW = 5;
  const hookVideoW = 15;
  const imagesW = 50;
  const narrationsW = 30;

  let pct = 0;
  if (p.hookImage === 'completed') pct += hookImageW;
  else if (p.hookImage === 'generating') pct += hookImageW * 0.5;
  if (p.hookVideo === 'completed') pct += hookVideoW;
  else if (p.hookVideo === 'generating') pct += hookVideoW * 0.3;
  if (p.sceneImages.total > 0) pct += (p.sceneImages.completed / p.sceneImages.total) * imagesW;
  if (p.narrations.total > 0) pct += (p.narrations.completed / p.narrations.total) * narrationsW;

  return Math.min(Math.round(pct), 100);
}

export function useLongformGeneration(): UseLongformGenerationReturn {
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const cancelledRef = useRef(false);

  const updateProgress = useCallback((updater: (prev: GenerationProgress) => GenerationProgress) => {
    setProgress(prev => {
      if (!prev) return prev;
      const next = updater(prev);
      next.overallPercent = calcPercent(next);
      return next;
    });
  }, []);

  const startGeneration = useCallback(async (
    scenario: LongformScenario,
    config: LongformConfig
  ): Promise<LongformScenario> => {
    cancelledRef.current = false;
    setIsGenerating(true);
    const sceneCount = scenario.scenes.length;
    setProgress(createInitialProgress(sceneCount));

    let updatedScenario = { ...scenario };

    try {
      // Phase 1: Hook image
      updateProgress(p => ({ ...p, currentStep: 'hook-image', hookImage: 'generating' }));
      try {
        const hookResult = await generateHookImage(scenario.hookScene.visualDescription, config.imageModel);
        updatedScenario = {
          ...updatedScenario,
          hookScene: { ...updatedScenario.hookScene, generatedImage: hookResult.image, imageStatus: 'completed' },
        };
        updateProgress(p => ({ ...p, hookImage: 'completed' }));
      } catch {
        updateProgress(p => ({ ...p, hookImage: 'failed' }));
      }

      if (cancelledRef.current) throw new Error('Cancelled');

      // Phase 1: Hook video
      updateProgress(p => ({ ...p, currentStep: 'hook-video', hookVideo: 'generating' }));
      if (updatedScenario.hookScene.generatedImage) {
        try {
          const videoResult = await generateHookVideo(
            updatedScenario.hookScene.generatedImage.data,
            scenario.hookScene.motionPrompt
          );
          updatedScenario = {
            ...updatedScenario,
            hookScene: {
              ...updatedScenario.hookScene,
              generatedVideo: { url: videoResult.videoUrl, thumbnailUrl: videoResult.thumbnailUrl },
              videoStatus: 'completed',
            },
          };
          updateProgress(p => ({ ...p, hookVideo: 'completed' }));
        } catch {
          updateProgress(p => ({ ...p, hookVideo: 'failed' }));
        }
      } else {
        updateProgress(p => ({ ...p, hookVideo: 'failed' }));
      }

      if (cancelledRef.current) throw new Error('Cancelled');

      // Phase 2: Scene images + narrations in parallel
      updateProgress(p => ({ ...p, currentStep: 'scene-images' }));

      const sceneInputs = scenario.scenes.map(s => ({ sceneNumber: s.sceneNumber, imagePrompt: s.imagePrompt }));
      const narrationInputs = scenario.scenes.map(s => ({ sceneNumber: s.sceneNumber, narration: s.narration }));

      const [imageResults, narrationResults] = await Promise.all([
        generateSceneImages(sceneInputs, config.imageModel, 5),
        generateNarrations(
          narrationInputs,
          config.tts.provider,
          config.tts.model,
          config.tts.voice as string,
          5
        ),
      ]);

      // Apply image results
      const updatedScenes = [...updatedScenario.scenes];
      for (const r of imageResults.results) {
        const idx = updatedScenes.findIndex(s => s.sceneNumber === r.sceneNumber);
        if (idx >= 0) {
          updatedScenes[idx] = {
            ...updatedScenes[idx],
            generatedImage: r.success ? r.image : undefined,
            imageStatus: (r.success ? 'completed' : 'failed') as AssetStatus,
          };
        }
      }

      // Apply narration results
      for (const r of narrationResults.results) {
        const idx = updatedScenes.findIndex(s => s.sceneNumber === r.sceneNumber);
        if (idx >= 0) {
          updatedScenes[idx] = {
            ...updatedScenes[idx],
            narrationAudio: r.success ? r.audio : undefined,
            narrationStatus: (r.success ? 'completed' : 'failed') as AssetStatus,
          };
        }
      }

      updatedScenario = { ...updatedScenario, scenes: updatedScenes };

      const imgCompleted = imageResults.results.filter(r => r.success).length;
      const imgFailed = imageResults.results.filter(r => !r.success).length;
      const narCompleted = narrationResults.results.filter(r => r.success).length;
      const narFailed = narrationResults.results.filter(r => !r.success).length;

      updateProgress(p => ({
        ...p,
        currentStep: 'completed',
        sceneImages: { ...p.sceneImages, completed: imgCompleted, failed: imgFailed, inProgress: 0 },
        narrations: { ...p.narrations, completed: narCompleted, failed: narFailed, inProgress: 0 },
      }));

    } catch (err) {
      if ((err as Error).message !== 'Cancelled') {
        console.error('Generation error:', err);
      }
    } finally {
      setIsGenerating(false);
    }

    return updatedScenario;
  }, [updateProgress]);

  const cancelGeneration = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  return { progress, isGenerating, startGeneration, cancelGeneration };
}
