import React, { useState, useEffect } from 'react';

interface WelcomeModalProps {
    onClose: () => void;
}

const SLIDES = [
    {
        title: 'S2V에 오신 것을 환영합니다!',
        subtitle: 'AI 영상 제작 도구',
        content: '주제만 입력하면 AI가 시나리오부터 영상까지 자동으로 생성합니다.',
        icon: (
            <svg className="w-16 h-16 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        title: '비용 효율적인 영상 제작 팁',
        subtitle: '권장 스타일 및 비용 안내',
        content: null,
        icon: (
            <svg className="w-16 h-16 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        ),
        customContent: (
            <div className="space-y-3 text-left">
                <div className="p-3 bg-green-900/30 rounded-lg border border-green-700/50">
                    <p className="text-green-400 font-semibold text-sm mb-1">권장 스타일</p>
                    <p className="text-gray-300 text-xs">
                        포토리얼리즘보다 <span className="text-green-300 font-medium">애니메이션, 일러스트, 수채화</span> 스타일 권장
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 bg-gray-700/50 rounded-lg">
                        <p className="text-gray-400">이미지 생성</p>
                        <p className="text-white font-semibold">장당 약 55원</p>
                    </div>
                    <div className="p-2 bg-red-900/30 rounded-lg border border-red-700/30">
                        <p className="text-gray-400">AI 영상(Veo)</p>
                        <p className="text-red-400 font-semibold">8초당 1,700~8,500원</p>
                    </div>
                </div>
                <div className="p-3 bg-indigo-900/30 rounded-lg border border-indigo-700/50">
                    <p className="text-indigo-400 font-semibold text-sm mb-1">Remotion 영상 내보내기</p>
                    <p className="text-gray-300 text-xs">
                        <span className="text-indigo-300 font-bold">무료!</span> - 3분 영상 = 약 18개 이미지 × 55원 = <span className="text-indigo-300 font-bold">약 1,000원</span>
                    </p>
                </div>
            </div>
        ),
    },
    {
        title: 'Step 1: 시나리오 생성',
        subtitle: 'AI가 스토리를 작성합니다',
        content: null,
        icon: (
            <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
        ),
        steps: [
            '로그인 후 주제 입력',
            '이미지 스타일 선택 (애니메이션/일러스트 권장)',
            'AI가 씬별 시나리오 자동 작성',
        ],
    },
    {
        title: 'Step 2: 이미지 생성',
        subtitle: '씬별 이미지를 만듭니다',
        content: null,
        icon: (
            <svg className="w-16 h-16 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
        steps: [
            '캐릭터/배경 에셋 생성',
            '씬별 이미지 일괄 생성',
        ],
    },
    {
        title: 'Step 3: 영상 내보내기',
        subtitle: '완성된 영상을 다운로드합니다',
        content: null,
        icon: (
            <svg className="w-16 h-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
        ),
        steps: [
            '영상 탭에서 미리보기',
            '"영상 내보내기"로 무료 다운로드 (Remotion)',
        ],
        warning: '※ "AI 영상 생성"은 Veo API 사용으로 고비용',
    },
];

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [dontShowAgain, setDontShowAgain] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
            if (e.key === 'ArrowRight' && currentSlide < SLIDES.length - 1) {
                setCurrentSlide(prev => prev + 1);
            }
            if (e.key === 'ArrowLeft' && currentSlide > 0) {
                setCurrentSlide(prev => prev - 1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        document.body.style.overflow = 'hidden';

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'auto';
        };
    }, [currentSlide]);

    const handleClose = () => {
        if (dontShowAgain) {
            localStorage.setItem('s2v_has_seen_welcome', 'true');
        }
        onClose();
    };

    const handleNext = () => {
        if (currentSlide < SLIDES.length - 1) {
            setCurrentSlide(prev => prev + 1);
        } else {
            handleClose();
        }
    };

    const handlePrev = () => {
        if (currentSlide > 0) {
            setCurrentSlide(prev => prev - 1);
        }
    };

    const slide = SLIDES[currentSlide];

    return (
        <div
            className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4"
            onClick={handleClose}
        >
            <div
                className="bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md h-[85vh] sm:h-auto sm:max-h-[85vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        {SLIDES.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentSlide(index)}
                                className={`w-2 h-2 rounded-full transition-colors ${
                                    index === currentSlide ? 'bg-indigo-500' : 'bg-gray-600 hover:bg-gray-500'
                                }`}
                            />
                        ))}
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-6">
                    <div className="flex flex-col items-center text-center">
                        {slide.icon}
                        <h2 className="text-xl font-bold text-white mt-4 mb-1">{slide.title}</h2>
                        <p className="text-sm text-indigo-400 mb-4">{slide.subtitle}</p>

                        {slide.content && (
                            <p className="text-gray-300 text-sm">{slide.content}</p>
                        )}

                        {slide.customContent}

                        {slide.steps && (
                            <ul className="text-left w-full space-y-2 mt-2">
                                {slide.steps.map((step, index) => (
                                    <li key={index} className="flex items-start gap-2 text-sm text-gray-300">
                                        <span className="flex-shrink-0 w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                            {index + 1}
                                        </span>
                                        <span>{step}</span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {slide.warning && (
                            <p className="mt-4 text-xs text-yellow-400 bg-yellow-900/20 px-3 py-2 rounded-lg">
                                {slide.warning}
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 space-y-3">
                    {currentSlide === SLIDES.length - 1 && (
                        <label className="flex items-center justify-center gap-2 text-sm text-gray-400 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={dontShowAgain}
                                onChange={(e) => setDontShowAgain(e.target.checked)}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-800"
                            />
                            다시 보지 않기
                        </label>
                    )}

                    <div className="flex gap-2">
                        {currentSlide > 0 && (
                            <button
                                onClick={handlePrev}
                                className="flex-1 min-h-[44px] px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                            >
                                이전
                            </button>
                        )}
                        <button
                            onClick={handleNext}
                            className="flex-1 min-h-[44px] px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
                        >
                            {currentSlide === SLIDES.length - 1 ? '시작하기' : '다음'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;
