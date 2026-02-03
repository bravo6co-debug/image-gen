import React, { useState, useEffect } from 'react';

// ─── 6가지 핵심 기능 ─────────────────────────────────
const FEATURES = [
    {
        name: '시나리오',
        desc: 'AI 시나리오 자동 생성',
        color: 'from-purple-500/20 to-purple-600/5',
        border: 'border-purple-500/30',
        text: 'text-purple-300',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
        ),
    },
    {
        name: '영상제작',
        desc: 'Remotion 무료 렌더링',
        color: 'from-pink-500/20 to-pink-600/5',
        border: 'border-pink-500/30',
        text: 'text-pink-300',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        name: '롱폼',
        desc: '10~60분 긴 영상 제작',
        color: 'from-teal-500/20 to-teal-600/5',
        border: 'border-teal-500/30',
        text: 'text-teal-300',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 13l4-2-4-2v4z" />
            </svg>
        ),
    },
    {
        name: '음식영상',
        desc: '음식/먹방 영상 특화',
        color: 'from-amber-500/20 to-amber-600/5',
        border: 'border-amber-500/30',
        text: 'text-amber-300',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 8h1a4 4 0 010 8h-1" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
                <line x1="6" y1="1" x2="6" y2="4" />
                <line x1="10" y1="1" x2="10" y2="4" />
                <line x1="14" y1="1" x2="14" y2="4" />
            </svg>
        ),
    },
    {
        name: '광고',
        desc: 'HDSER 프레임 광고 제작',
        color: 'from-orange-500/20 to-orange-600/5',
        border: 'border-orange-500/30',
        text: 'text-orange-300',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
        ),
    },
    {
        name: '클립',
        desc: '30초~2분 숏폼 클립',
        color: 'from-cyan-500/20 to-cyan-600/5',
        border: 'border-cyan-500/30',
        text: 'text-cyan-300',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <rect x="2" y="3" width="20" height="18" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v18M17 3v18M2 9h20M2 15h20" />
            </svg>
        ),
    },
];

// ─── 인라인 스타일 (Tailwind에 없는 keyframes) ──────────
const animStyles = `
@keyframes welcomeFadeUp {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes welcomeSlideIn {
  from { opacity: 0; transform: translateX(24px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes welcomePulseGlow {
  0%, 100% { opacity: 0.5; }
  50%      { opacity: 0.8; }
}
.anim-fade-up   { animation: welcomeFadeUp 0.5s ease-out both; }
.anim-slide-in  { animation: welcomeSlideIn 0.4s ease-out both; }
.anim-pulse-glow { animation: welcomePulseGlow 3s ease-in-out infinite; }
`;

// ─── 컴포넌트 ────────────────────────────────────────
interface WelcomeModalProps {
    onClose: () => void;
}

const TOTAL_SLIDES = 3;

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
    const [slide, setSlide] = useState(0);
    const [dontShow, setDontShow] = useState(false);
    const [direction, setDirection] = useState<'next' | 'prev'>('next');
    const [animKey, setAnimKey] = useState(0);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleClose();
            if (e.key === 'ArrowRight' && slide < TOTAL_SLIDES - 1) goNext();
            if (e.key === 'ArrowLeft' && slide > 0) goPrev();
        };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = 'auto';
        };
    }, [slide]);

    const handleClose = () => {
        if (dontShow) localStorage.setItem('s2v_has_seen_welcome', 'true');
        onClose();
    };

    const goNext = () => {
        if (slide < TOTAL_SLIDES - 1) {
            setDirection('next');
            setAnimKey(k => k + 1);
            setSlide(s => s + 1);
        } else {
            handleClose();
        }
    };

    const goPrev = () => {
        if (slide > 0) {
            setDirection('prev');
            setAnimKey(k => k + 1);
            setSlide(s => s - 1);
        }
    };

    return (
        <>
            <style>{animStyles}</style>
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4"
                onClick={handleClose}
            >
                <div
                    className="relative bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md overflow-hidden flex flex-col h-[85vh] sm:h-auto sm:max-h-[85vh]"
                    onClick={e => e.stopPropagation()}
                >
                    {/* ── 배경 글로우 ── */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="anim-pulse-glow absolute -top-20 -left-20 w-60 h-60 rounded-full bg-indigo-600/20 blur-3xl" />
                        <div className="anim-pulse-glow absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-purple-600/15 blur-3xl" style={{ animationDelay: '1.5s' }} />
                    </div>

                    {/* ── 헤더: 프로그레스 바 + 닫기 ── */}
                    <div className="relative flex items-center justify-between px-5 pt-5 pb-2">
                        <div className="flex gap-1.5 flex-1 mr-4">
                            {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => { setDirection(i > slide ? 'next' : 'prev'); setAnimKey(k => k + 1); setSlide(i); }}
                                    className={`h-1 rounded-full transition-all duration-300 ${
                                        i === slide
                                            ? 'bg-indigo-400 flex-[2]'
                                            : i < slide
                                                ? 'bg-indigo-400/40 flex-1'
                                                : 'bg-gray-700 flex-1'
                                    }`}
                                />
                            ))}
                        </div>
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* ── 슬라이드 콘텐츠 ── */}
                    <div className="relative flex-grow overflow-y-auto px-6 pb-2">
                        <div
                            key={animKey}
                            className="anim-fade-up"
                            style={{ animationDirection: direction === 'prev' ? 'reverse' : 'normal' }}
                        >
                            {slide === 0 && <SlideWelcome />}
                            {slide === 1 && <SlideFeatures />}
                            {slide === 2 && <SlideCost />}
                        </div>
                    </div>

                    {/* ── 푸터 ── */}
                    <div className="relative px-5 pb-5 pt-3 space-y-3">
                        {slide === TOTAL_SLIDES - 1 && (
                            <label className="flex items-center justify-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
                                <input
                                    type="checkbox"
                                    checked={dontShow}
                                    onChange={e => setDontShow(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-gray-900"
                                />
                                다시 보지 않기
                            </label>
                        )}
                        <div className="flex gap-2">
                            {slide > 0 && (
                                <button
                                    onClick={goPrev}
                                    className="flex-1 min-h-[44px] px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition-colors border border-gray-700/60"
                                >
                                    이전
                                </button>
                            )}
                            <button
                                onClick={goNext}
                                className="flex-1 min-h-[44px] px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20"
                            >
                                {slide === TOTAL_SLIDES - 1 ? '시작하기' : '다음'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

// ─── 슬라이드 1: 환영 ───────────────────────────────
const SlideWelcome: React.FC = () => (
    <div className="flex flex-col items-center text-center py-6">
        {/* 로고 아이콘 */}
        <div className="relative mb-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-indigo-500/30">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            </div>
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight">
            S2V
        </h1>
        <p className="text-indigo-400 text-sm font-medium mt-1 mb-5">
            Script to Video
        </p>

        <p className="text-gray-300 text-sm leading-relaxed max-w-[280px]">
            주제 하나만 입력하면<br/>
            <span className="text-white font-semibold">시나리오 → 이미지 → 영상</span>까지<br/>
            AI가 자동으로 생성합니다.
        </p>

        {/* 워크플로우 화살표 */}
        <div className="flex items-center gap-2 mt-6 text-xs text-gray-500">
            <span className="px-2.5 py-1 bg-gray-800 rounded-lg border border-gray-700/60">주제 입력</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="px-2.5 py-1 bg-gray-800 rounded-lg border border-gray-700/60">AI 시나리오</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <span className="px-2.5 py-1 bg-indigo-600/30 rounded-lg border border-indigo-500/40 text-indigo-300">영상 완성</span>
        </div>
    </div>
);

// ─── 슬라이드 2: 6가지 기능 ──────────────────────────
const SlideFeatures: React.FC = () => (
    <div className="py-4">
        <h2 className="text-lg font-bold text-white text-center mb-1">6가지 제작 도구</h2>
        <p className="text-xs text-gray-500 text-center mb-5">목적에 맞는 탭을 선택하세요</p>

        <div className="grid grid-cols-2 gap-2.5">
            {FEATURES.map((f, i) => (
                <div
                    key={f.name}
                    className={`anim-slide-in p-3 rounded-xl bg-gradient-to-br ${f.color} border ${f.border} hover:scale-[1.02] transition-transform cursor-default`}
                    style={{ animationDelay: `${i * 60}ms` }}
                >
                    <div className={`${f.text} mb-1.5`}>{f.icon}</div>
                    <p className="text-white text-sm font-semibold leading-tight">{f.name}</p>
                    <p className="text-gray-400 text-[11px] mt-0.5 leading-snug">{f.desc}</p>
                </div>
            ))}
        </div>
    </div>
);

// ─── 슬라이드 3: 비용 팁 ─────────────────────────────
const SlideCost: React.FC = () => (
    <div className="py-4">
        <h2 className="text-lg font-bold text-white text-center mb-1">비용 안내</h2>
        <p className="text-xs text-gray-500 text-center mb-5">합리적인 영상 제작 비용</p>

        {/* 추천 스타일 */}
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mb-3">
            <div className="flex items-center gap-2 mb-1.5">
                <div className="w-5 h-5 rounded-md bg-emerald-500/20 flex items-center justify-center">
                    <svg className="w-3 h-3 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <p className="text-emerald-300 font-semibold text-sm">추천 스타일</p>
            </div>
            <p className="text-gray-400 text-xs pl-7">
                <span className="text-emerald-200">애니메이션, 일러스트, 수채화</span> 스타일이 가장 자연스럽고 비용 효율적입니다.
            </p>
        </div>

        {/* 비용 카드 */}
        <div className="grid grid-cols-2 gap-2.5 mb-3">
            <div className="p-3 rounded-xl bg-gray-800/80 border border-gray-700/60">
                <p className="text-gray-500 text-[11px] mb-0.5">이미지 생성</p>
                <p className="text-white font-bold text-base">~55원<span className="text-gray-500 font-normal text-[11px]"> /장</span></p>
            </div>
            <div className="p-3 rounded-xl bg-gray-800/80 border border-gray-700/60">
                <p className="text-gray-500 text-[11px] mb-0.5">Remotion 렌더링</p>
                <p className="text-emerald-400 font-bold text-base">무료</p>
            </div>
        </div>

        {/* 예시 */}
        <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
            <p className="text-indigo-300 text-xs font-semibold mb-1">3분 영상 예시</p>
            <p className="text-gray-400 text-xs">
                약 18장 이미지 × 55원 = <span className="text-indigo-200 font-bold">약 1,000원</span>
            </p>
            <p className="text-gray-500 text-[11px] mt-1">
                ※ AI 동영상(Veo)은 별도 과금 — 8초당 1,700~8,500원
            </p>
        </div>
    </div>
);

export default WelcomeModal;
