import React from 'react';

interface NarrationCounterProps {
  charCount: number;
  min?: number;
  max?: number;
}

export const NarrationCounter: React.FC<NarrationCounterProps> = ({
  charCount,
  min = 280,
  max = 300,
}) => {
  const isValid = charCount >= min && charCount <= max;
  const isTooShort = charCount < min;
  const isTooLong = charCount > max;

  return (
    <span
      className={`text-xs font-medium ${
        isValid ? 'text-green-400' : isTooShort ? 'text-yellow-400' : 'text-red-400'
      }`}
    >
      {charCount}/{max}자
      {isValid && ' ✓'}
      {isTooShort && ` (${min - charCount}자 부족)`}
      {isTooLong && ` (${charCount - max}자 초과)`}
    </span>
  );
};
