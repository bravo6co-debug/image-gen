import React, { useMemo } from 'react';
import { LongformPlayer } from './LongformPlayer';
import { splitScenesForExport } from '../../services/longformVideoService';
import { calculateSplitPoint } from '../../types/longform';
import type { LongformScenario, LongformConfig } from '../../types/longform';
import type { PartExportState } from '../../hooks/useLongformExport';

interface Step4PreviewDownloadProps {
  scenario: LongformScenario;
  config: LongformConfig;
  part1State: PartExportState;
  part2State: PartExportState;
  isExporting: boolean;
  onExportPart1: () => void;
  onExportPart2: () => void;
  onCancelExport: () => void;
  onDownloadPart: (part: 'part1' | 'part2') => void;
  onReset: () => void;
}

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ExportProgressBar: React.FC<{ state: PartExportState; label: string }> = ({ state, label }) => {
  if (state.status !== 'rendering') return null;

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">{label} 렌더링 중...</span>
        <span className="text-white font-medium">{Math.round(state.progress)}%</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-500 transition-all duration-300"
          style={{ width: `${state.progress}%` }}
        />
      </div>
      {state.totalFrames && state.currentFrame && (
        <p className="text-xs text-gray-500">
          {state.currentFrame.toLocaleString()} / {state.totalFrames.toLocaleString()} 프레임
        </p>
      )}
    </div>
  );
};

export const Step4PreviewDownload: React.FC<Step4PreviewDownloadProps> = ({
  scenario,
  config,
  part1State,
  part2State,
  isExporting,
  onExportPart1,
  onExportPart2,
  onCancelExport,
  onDownloadPart,
  onReset,
}) => {
  const { part1, part2 } = useMemo(() => splitScenesForExport(scenario), [scenario]);
  const splitPoint = calculateSplitPoint(scenario.scenes.length);

  const part1Duration = part1.length; // 1분 x 씬 수
  const part2Duration = part2.length;

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* 헤더 */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">{scenario.metadata.title}</h2>
        <p className="text-sm text-gray-400 mt-1">
          총 {scenario.scenes.length}개 씬 · ~{config.duration}분
        </p>
      </div>

      {/* 파트 1 */}
      <section className="bg-gray-800/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-white">
              파트 1 (씬 1~{splitPoint})
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {part1.length}개 씬 · ~{part1Duration}분
            </p>
          </div>
          <div className="flex items-center gap-2">
            {part1State.status === 'complete' && (
              <button
                onClick={() => onDownloadPart('part1')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors min-h-[36px]"
              >
                <DownloadIcon className="w-4 h-4" />
                다운로드
              </button>
            )}
            {part1State.status !== 'rendering' && part1State.status !== 'complete' && (
              <button
                onClick={onExportPart1}
                disabled={isExporting}
                className="px-3 py-1.5 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[36px]"
              >
                내보내기
              </button>
            )}
          </div>
        </div>

        <LongformPlayer scenes={part1} />

        <ExportProgressBar state={part1State} label="파트 1" />

        {part1State.status === 'error' && (
          <p className="mt-2 text-sm text-red-400">{part1State.error}</p>
        )}

        {part1State.status === 'complete' && part1State.result && (
          <div className="mt-2 flex items-center gap-2 text-sm text-green-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            렌더링 완료 ({Math.round(part1State.result.duration / 60)}분 {Math.round(part1State.result.duration % 60)}초)
          </div>
        )}
      </section>

      {/* 파트 2 */}
      <section className="bg-gray-800/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-white">
              파트 2 (씬 {splitPoint + 1}~{scenario.scenes.length})
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {part2.length}개 씬 · ~{part2Duration}분
            </p>
          </div>
          <div className="flex items-center gap-2">
            {part2State.status === 'complete' && (
              <button
                onClick={() => onDownloadPart('part2')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors min-h-[36px]"
              >
                <DownloadIcon className="w-4 h-4" />
                다운로드
              </button>
            )}
            {part2State.status !== 'rendering' && part2State.status !== 'complete' && (
              <button
                onClick={onExportPart2}
                disabled={isExporting}
                className="px-3 py-1.5 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[36px]"
              >
                내보내기
              </button>
            )}
          </div>
        </div>

        <LongformPlayer scenes={part2} />

        <ExportProgressBar state={part2State} label="파트 2" />

        {part2State.status === 'error' && (
          <p className="mt-2 text-sm text-red-400">{part2State.error}</p>
        )}

        {part2State.status === 'complete' && part2State.result && (
          <div className="mt-2 flex items-center gap-2 text-sm text-green-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            렌더링 완료 ({Math.round(part2State.result.duration / 60)}분 {Math.round(part2State.result.duration % 60)}초)
          </div>
        )}
      </section>

      {/* 취소/초기화 버튼 */}
      <div className="flex items-center justify-center gap-3 pt-2">
        {isExporting && (
          <button
            onClick={onCancelExport}
            className="px-4 py-2 text-sm bg-red-600/80 text-white rounded-lg hover:bg-red-500 transition-colors min-h-[44px]"
          >
            렌더링 취소
          </button>
        )}
        <button
          onClick={onReset}
          disabled={isExporting}
          className="px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors min-h-[44px]"
        >
          처음으로
        </button>
      </div>

      {/* 안내 */}
      <div className="text-center">
        <p className="text-xs text-gray-500">
          비디오는 브라우저에서 실시간 렌더링됩니다. 렌더링 중에는 탭을 닫지 마세요.
        </p>
      </div>
    </div>
  );
};
