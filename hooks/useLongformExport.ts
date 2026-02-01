import { useState, useCallback, useRef } from 'react';
import type { LongformScenario, LongformOutput } from '../types/longform';
import {
  longformScenesToRemotionScenes,
  splitScenesForExport,
  renderLongformPart,
  downloadLongformVideo,
  type LongformRenderProgress,
  type LongformRenderResult,
} from '../services/longformVideoService';

export interface PartExportState {
  status: 'idle' | 'rendering' | 'complete' | 'error';
  progress: number;
  currentFrame?: number;
  totalFrames?: number;
  result?: LongformRenderResult;
  error?: string;
}

interface UseLongformExportReturn {
  output: LongformOutput | null;
  part1State: PartExportState;
  part2State: PartExportState;
  isExporting: boolean;
  startExportPart1: (scenario: LongformScenario) => Promise<void>;
  startExportPart2: (scenario: LongformScenario) => Promise<void>;
  cancelExport: () => void;
  downloadPart: (part: 'part1' | 'part2', scenario: LongformScenario) => void;
  downloadHookVideo: (scenario: LongformScenario) => void;
}

const INITIAL_PART_STATE: PartExportState = { status: 'idle', progress: 0 };

export function useLongformExport(): UseLongformExportReturn {
  const [output, setOutput] = useState<LongformOutput | null>(null);
  const [part1State, setPart1State] = useState<PartExportState>(INITIAL_PART_STATE);
  const [part2State, setPart2State] = useState<PartExportState>(INITIAL_PART_STATE);
  const cancelledRef = useRef(false);

  const isExporting = part1State.status === 'rendering' || part2State.status === 'rendering';

  const startExportPart1 = useCallback(async (scenario: LongformScenario) => {
    cancelledRef.current = false;
    const { part1 } = splitScenesForExport(scenario);
    const remotionScenes = longformScenesToRemotionScenes(part1);

    if (remotionScenes.length === 0) {
      setPart1State({ status: 'error', progress: 0, error: '이미지가 생성된 씬이 없습니다' });
      return;
    }

    setPart1State({ status: 'rendering', progress: 0 });

    const result = await renderLongformPart(remotionScenes, (p: LongformRenderProgress) => {
      if (cancelledRef.current) return;
      setPart1State(prev => ({
        ...prev,
        progress: p.progress,
        currentFrame: p.currentFrame,
        totalFrames: p.totalFrames,
      }));
    });

    if (cancelledRef.current) return;

    if (result.success) {
      setPart1State({
        status: 'complete',
        progress: 100,
        totalFrames: result.duration * 30,
        currentFrame: result.duration * 30,
        result,
      });
      setOutput(prev => ({
        hookVideo: prev?.hookVideo ?? null,
        partOne: {
          blob: result.videoBlob,
          duration: result.duration,
          sceneCount: result.sceneCount,
          format: 'webm',
        },
        partTwo: prev?.partTwo ?? null,
      }));
    } else {
      setPart1State({ status: 'error', progress: 0, error: result.error });
    }
  }, []);

  const startExportPart2 = useCallback(async (scenario: LongformScenario) => {
    cancelledRef.current = false;
    const { part2 } = splitScenesForExport(scenario);
    const remotionScenes = longformScenesToRemotionScenes(part2);

    if (remotionScenes.length === 0) {
      setPart2State({ status: 'error', progress: 0, error: '이미지가 생성된 씬이 없습니다' });
      return;
    }

    setPart2State({ status: 'rendering', progress: 0 });

    const result = await renderLongformPart(remotionScenes, (p: LongformRenderProgress) => {
      if (cancelledRef.current) return;
      setPart2State(prev => ({
        ...prev,
        progress: p.progress,
        currentFrame: p.currentFrame,
        totalFrames: p.totalFrames,
      }));
    });

    if (cancelledRef.current) return;

    if (result.success) {
      setPart2State({
        status: 'complete',
        progress: 100,
        totalFrames: result.duration * 30,
        currentFrame: result.duration * 30,
        result,
      });
      setOutput(prev => ({
        hookVideo: prev?.hookVideo ?? null,
        partOne: prev?.partOne ?? null,
        partTwo: {
          blob: result.videoBlob,
          duration: result.duration,
          sceneCount: result.sceneCount,
          format: 'webm',
        },
      }));
    } else {
      setPart2State({ status: 'error', progress: 0, error: result.error });
    }
  }, []);

  const cancelExport = useCallback(() => {
    cancelledRef.current = true;
    if (part1State.status === 'rendering') {
      setPart1State(INITIAL_PART_STATE);
    }
    if (part2State.status === 'rendering') {
      setPart2State(INITIAL_PART_STATE);
    }
  }, [part1State.status, part2State.status]);

  const downloadPart = useCallback((part: 'part1' | 'part2', scenario: LongformScenario) => {
    const state = part === 'part1' ? part1State : part2State;
    if (state.result?.videoBlob) {
      const title = scenario.metadata.title.replace(/[^a-zA-Z0-9가-힣]/g, '_');
      const partLabel = part === 'part1' ? '파트1' : '파트2';
      downloadLongformVideo(state.result.videoBlob, `${title}_${partLabel}.webm`);
    }
  }, [part1State, part2State]);

  const downloadHookVideo = useCallback(async (scenario: LongformScenario) => {
    const hookUrl = scenario.hookScene.generatedVideo?.url;
    if (!hookUrl) return;

    try {
      const response = await fetch(hookUrl);
      const blob = await response.blob();
      const title = scenario.metadata.title.replace(/[^a-zA-Z0-9가-힣]/g, '_');
      downloadLongformVideo(blob, `${title}_후킹.mp4`);
    } catch (error) {
      console.error('Hook video download failed:', error);
    }
  }, []);

  return {
    output,
    part1State,
    part2State,
    isExporting,
    startExportPart1,
    startExportPart2,
    cancelExport,
    downloadPart,
    downloadHookVideo,
  };
}
