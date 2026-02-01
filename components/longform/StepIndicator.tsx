import React from 'react';
import type { LongformStep } from '../../types/longform';

interface StepIndicatorProps {
  currentStep: LongformStep;
  completedSteps: LongformStep[];
}

const STEPS: { step: LongformStep; label: string }[] = [
  { step: 1, label: '기본 설정' },
  { step: 2, label: '시나리오' },
  { step: 3, label: '에셋 생성' },
  { step: 4, label: '미리보기' },
];

export const StepIndicator: React.FC<StepIndicatorProps> = ({ currentStep, completedSteps }) => {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 py-3">
      {STEPS.map((s, index) => {
        const isActive = currentStep === s.step;
        const isCompleted = completedSteps.includes(s.step);
        const isPast = s.step < currentStep;

        return (
          <React.Fragment key={s.step}>
            {index > 0 && (
              <div className={`h-0.5 w-6 sm:w-10 ${isPast || isCompleted ? 'bg-teal-500' : 'bg-gray-700'}`} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  transition-all duration-200
                  ${isActive ? 'bg-teal-500 text-white ring-2 ring-teal-400/50 ring-offset-2 ring-offset-gray-900' : ''}
                  ${isCompleted || isPast ? 'bg-teal-600 text-white' : ''}
                  ${!isActive && !isCompleted && !isPast ? 'bg-gray-700 text-gray-400' : ''}
                `}
              >
                {isCompleted || isPast ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  s.step
                )}
              </div>
              <span className={`text-xs ${isActive ? 'text-teal-400 font-semibold' : isPast || isCompleted ? 'text-gray-400' : 'text-gray-500'}`}>
                {s.label}
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};
