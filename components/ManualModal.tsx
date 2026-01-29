
import React, { useEffect } from 'react';

interface ManualModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ManualModal: React.FC<ManualModalProps> = ({ isOpen, onClose }) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4 transition-opacity duration-300"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
        >
            <div
                className="bg-gray-800 text-gray-300 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-4xl h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-700 sticky top-0 bg-gray-800 rounded-t-2xl sm:rounded-t-xl z-10 flex-shrink-0">
                    <h2 className="text-lg sm:text-2xl font-bold text-indigo-400">S2V 사용 설명서</h2>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center bg-gray-700 rounded-full text-white hover:bg-gray-600 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-white"
                        aria-label="Close manual"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </header>
                <main className="overflow-y-auto flex-grow p-4 sm:p-6 space-y-6 sm:space-y-8">
                    {/* 앱 개요 */}
                    <section>
                        <h3 className="text-xl sm:text-2xl font-semibold text-yellow-400 mb-3">1. 앱 개요</h3>
                        <p className="text-gray-400 leading-relaxed text-sm sm:text-base">
                            <strong className="text-white">S2V (Scenario to Video)</strong>는 AI를 활용하여 시나리오부터 영상까지 자동으로 제작하는 도구입니다.
                            주제를 입력하면 AI가 시나리오를 작성하고, 씬별 이미지를 생성하여 완성된 영상을 만들어 드립니다.
                        </p>
                    </section>

                    {/* 비용 안내 */}
                    <section>
                        <h3 className="text-xl sm:text-2xl font-semibold text-yellow-400 mb-3">2. 비용 안내</h3>
                        <div className="p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-4">
                            <div className="p-3 bg-green-900/30 rounded-lg border border-green-700/50">
                                <p className="text-green-400 font-semibold mb-1">권장 스타일</p>
                                <p className="text-gray-300 text-sm">
                                    포토리얼리즘보다 <span className="text-green-300 font-medium">애니메이션, 일러스트, 수채화</span> 스타일을 권장합니다.
                                    비용 효율적이고 일관된 품질의 영상을 제작할 수 있습니다.
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-gray-400 border-b border-gray-700">
                                            <th className="pb-2 pr-4">서비스</th>
                                            <th className="pb-2 pr-4">단위</th>
                                            <th className="pb-2 pr-4">비용</th>
                                            <th className="pb-2">비고</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-gray-300">
                                        <tr className="border-b border-gray-700/50">
                                            <td className="py-2 pr-4 font-medium text-white">이미지 생성</td>
                                            <td className="py-2 pr-4">1장</td>
                                            <td className="py-2 pr-4">약 55원</td>
                                            <td className="py-2">Nano Banana</td>
                                        </tr>
                                        <tr className="border-b border-gray-700/50">
                                            <td className="py-2 pr-4">4K 고해상도</td>
                                            <td className="py-2 pr-4">1장</td>
                                            <td className="py-2 pr-4">약 340원</td>
                                            <td className="py-2">고품질</td>
                                        </tr>
                                        <tr className="border-b border-gray-700/50 text-red-400">
                                            <td className="py-2 pr-4">Veo 3.1 Fast</td>
                                            <td className="py-2 pr-4">8초</td>
                                            <td className="py-2 pr-4">약 1,700원</td>
                                            <td className="py-2">SNS/초안용</td>
                                        </tr>
                                        <tr className="border-b border-gray-700/50 text-red-400">
                                            <td className="py-2 pr-4">Veo 3.1 Standard</td>
                                            <td className="py-2 pr-4">8초</td>
                                            <td className="py-2 pr-4">약 4,500원</td>
                                            <td className="py-2">마케팅/광고용</td>
                                        </tr>
                                        <tr className="border-b border-gray-700/50 text-red-400">
                                            <td className="py-2 pr-4">Veo 3.0 Full</td>
                                            <td className="py-2 pr-4">8초</td>
                                            <td className="py-2 pr-4">약 8,500원</td>
                                            <td className="py-2">전문가용</td>
                                        </tr>
                                        <tr className="text-indigo-400 font-semibold">
                                            <td className="py-2 pr-4">Remotion 내보내기</td>
                                            <td className="py-2 pr-4">무제한</td>
                                            <td className="py-2 pr-4">무료</td>
                                            <td className="py-2">권장!</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-3 bg-indigo-900/30 rounded-lg border border-indigo-700/50">
                                <p className="text-indigo-400 font-semibold mb-1">비용 예시</p>
                                <p className="text-gray-300 text-sm">
                                    3분 영상 = 약 18개 이미지 × 55원 = <span className="text-indigo-300 font-bold">약 1,000원</span>
                                    <br />
                                    <span className="text-xs text-gray-400">(Remotion 영상 내보내기 사용 시, Veo API 미사용)</span>
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* 사용 방법 */}
                    <section>
                        <h3 className="text-xl sm:text-2xl font-semibold text-yellow-400 mb-3">3. 사용 방법 (Step-by-Step)</h3>
                        <div className="p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-6">
                            <div>
                                <h5 className="font-semibold text-white text-base sm:text-lg mb-2">Step 1: 시나리오 생성</h5>
                                <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm">
                                    <li><strong className="text-white">로그인:</strong> 상단 우측의 로그인 버튼을 클릭하여 로그인합니다.</li>
                                    <li><strong className="text-white">스타일 선택:</strong> 상단 드롭다운에서 이미지 스타일을 선택합니다. (애니메이션/일러스트 권장)</li>
                                    <li><strong className="text-white">주제 입력:</strong> "시나리오 생성" 버튼을 누르고 영상 주제를 입력합니다.</li>
                                    <li><strong className="text-white">시나리오 확인:</strong> AI가 생성한 씬별 시나리오를 확인하고 필요시 수정합니다.</li>
                                </ul>
                            </div>

                            <div>
                                <h5 className="font-semibold text-white text-base sm:text-lg mb-2">Step 2: 에셋 및 이미지 생성</h5>
                                <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm">
                                    <li><strong className="text-white">캐릭터 생성:</strong> "제안된 캐릭터"에서 캐릭터 이미지를 생성합니다.</li>
                                    <li><strong className="text-white">배경 생성:</strong> 필요한 배경 이미지를 생성합니다.</li>
                                    <li><strong className="text-white">씬 이미지 생성:</strong> "전체 씬 이미지 생성" 버튼으로 모든 씬의 이미지를 일괄 생성합니다.</li>
                                </ul>
                            </div>

                            <div>
                                <h5 className="font-semibold text-white text-base sm:text-lg mb-2">Step 3: 나레이션 생성 (선택)</h5>
                                <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm">
                                    <li><strong className="text-white">TTS 음성 선택:</strong> 드롭다운에서 원하는 음성을 선택합니다.</li>
                                    <li><strong className="text-white">나레이션 생성:</strong> "전체 나레이션 생성" 버튼으로 모든 씬의 나레이션을 생성합니다.</li>
                                </ul>
                            </div>

                            <div>
                                <h5 className="font-semibold text-white text-base sm:text-lg mb-2">Step 4: 영상 내보내기</h5>
                                <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm">
                                    <li><strong className="text-white">영상 탭 이동:</strong> 상단의 "영상 제작" 탭을 클릭합니다.</li>
                                    <li><strong className="text-white">미리보기:</strong> Remotion 플레이어에서 영상을 미리 확인합니다.</li>
                                    <li><strong className="text-yellow-300">영상 내보내기:</strong> "영상 내보내기" 버튼을 눌러 무료로 영상을 다운로드합니다.</li>
                                </ul>
                                <div className="mt-3 p-2 bg-yellow-900/20 rounded-lg">
                                    <p className="text-yellow-400 text-xs">
                                        ※ "AI 영상 생성"은 Veo API를 사용하며 고비용이 발생합니다.
                                        비용 절감을 위해 "영상 내보내기(Remotion)"를 권장합니다.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 팁 */}
                    <section>
                        <h3 className="text-xl sm:text-2xl font-semibold text-yellow-400 mb-3">4. 유용한 팁</h3>
                        <div className="p-3 sm:p-4 bg-gray-900/50 rounded-lg border border-gray-700 space-y-3">
                            <div className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">✓</span>
                                <p className="text-gray-300 text-sm">
                                    <strong className="text-white">일러스트/애니메이션 스타일</strong>을 사용하면 일관된 캐릭터 품질을 유지할 수 있습니다.
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">✓</span>
                                <p className="text-gray-300 text-sm">
                                    <strong className="text-white">시나리오 수정</strong>은 이미지 생성 전에 하는 것이 좋습니다.
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-green-400 mt-0.5">✓</span>
                                <p className="text-gray-300 text-sm">
                                    <strong className="text-white">캐릭터 이미지</strong>를 먼저 생성한 후 씬 이미지를 생성하면 일관성이 높아집니다.
                                </p>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="text-yellow-400 mt-0.5">!</span>
                                <p className="text-gray-300 text-sm">
                                    <strong className="text-white">Remotion 영상 내보내기</strong>는 무료이며, Veo AI 영상 생성은 고비용입니다.
                                </p>
                            </div>
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};
