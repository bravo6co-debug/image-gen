import React, { useMemo, useState } from 'react';
import { LongformPlayer } from './LongformPlayer';
import { splitScenesForExport, longformScenesToRemotionScenes } from '../../services/longformVideoService';
import { calculateSplitPoint } from '../../types/longform';
import type { LongformScenario, LongformConfig, LongformScene } from '../../types/longform';
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
  onRegenerateFailedScenes?: () => void;
  isRegenerating?: boolean;
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
  onRegenerateFailedScenes,
  isRegenerating = false,
}) => {
  const [showExportConfirm, setShowExportConfirm] = useState<'part1' | 'part2' | null>(null);

  const { part1, part2 } = useMemo(() => splitScenesForExport(scenario), [scenario]);
  const splitPoint = calculateSplitPoint(scenario.scenes.length);

  // 실패한 씬 찾기
  const failedScenes = useMemo(() =>
    scenario.scenes.filter((s: LongformScene) => s.imageStatus === 'failed'),
  [scenario.scenes]);

  // 각 파트별 실제 렌더링될 씬 수
  const part1Renderable = useMemo(() => longformScenesToRemotionScenes(part1).length, [part1]);
  const part2Renderable = useMemo(() => longformScenesToRemotionScenes(part2).length, [part2]);

  const part1Duration = part1.length; // 1분 x 씬 수
  const part2Duration = part2.length;

  // 내보내기 버튼 클릭 핸들러 (실패 씬 있으면 확인 모달)
  const handleExportClick = (part: 'part1' | 'part2') => {
    if (failedScenes.length > 0) {
      setShowExportConfirm(part);
    } else {
      part === 'part1' ? onExportPart1() : onExportPart2();
    }
  };

  const handleConfirmExport = () => {
    if (showExportConfirm === 'part1') onExportPart1();
    else if (showExportConfirm === 'part2') onExportPart2();
    setShowExportConfirm(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 py-4">
      {/* 헤더 */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-white">{scenario.metadata.title}</h2>
        <p className="text-sm text-gray-400 mt-1">
          총 {scenario.scenes.length}개 씬 · ~{config.duration}분
        </p>
      </div>

      {/* 실패 씬 경고 배너 */}
      {failedScenes.length > 0 && (
        <div className="bg-amber-900/30 border border-amber-600/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-amber-200 font-medium text-sm">
                {failedScenes.length}개 씬 이미지 생성 실패
              </p>
              <p className="text-amber-300/70 text-xs mt-1">
                씬 {failedScenes.map((s: LongformScene) => s.sceneNumber).join(', ')} — 해당 씬은 영상에서 제외됩니다.
              </p>
              {failedScenes.length <= 5 && (
                <ul className="mt-2 space-y-1">
                  {failedScenes.map((s: LongformScene) => (
                    <li key={s.id} className="text-xs text-gray-400">
                      <span className="text-amber-400">씬 {s.sceneNumber}:</span> {s.imageError || '알 수 없는 오류'}
                    </li>
                  ))}
                </ul>
              )}
              {onRegenerateFailedScenes && (
                <button
                  onClick={onRegenerateFailedScenes}
                  disabled={isRegenerating || isExporting}
                  className="mt-3 px-3 py-1.5 text-xs bg-amber-600 text-white rounded-lg hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-1.5"
                >
                  {isRegenerating ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      재생성 중...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      실패 씬 재생성
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

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
                onClick={() => handleExportClick('part1')}
                disabled={isExporting || isRegenerating}
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
                onClick={() => handleExportClick('part2')}
                disabled={isExporting || isRegenerating}
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

      {/* 내보내기 확인 모달 */}
      {showExportConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-gray-800 rounded-xl shadow-xl max-w-sm w-full p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">일부 씬이 제외됩니다</h3>
                <p className="text-gray-400 text-sm">
                  {failedScenes.length}개 씬 이미지 생성 실패
                </p>
              </div>
            </div>

            <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">원래 씬 수</span>
                <span className="text-white">{showExportConfirm === 'part1' ? part1.length : part2.length}개</span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">렌더링될 씬 수</span>
                <span className="text-amber-400">{showExportConfirm === 'part1' ? part1Renderable : part2Renderable}개</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">예상 영상 길이</span>
                <span className="text-white">~{showExportConfirm === 'part1' ? part1Renderable : part2Renderable}분</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowExportConfirm(null)}
                className="flex-1 px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleConfirmExport}
                className="flex-1 px-4 py-2 text-sm bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors"
              >
                그래도 내보내기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
