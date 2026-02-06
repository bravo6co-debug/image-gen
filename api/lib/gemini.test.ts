/**
 * Tests for pure utility functions in gemini.ts
 * Note: Functions that depend on MongoDB or environment variables are not tested here
 */
import { describe, it, expect } from 'vitest';

// Test isGemini3Model logic (copied for isolated testing)
function isGemini3Model(modelId: string): boolean {
  return modelId.startsWith('gemini-3-');
}

// Test getThinkingConfig logic (copied for isolated testing)
function getThinkingConfig(modelId: string): Record<string, unknown> {
  if (isGemini3Model(modelId)) {
    return { thinkingConfig: { thinkingLevel: 'LOW' } };
  }
  return {};
}

// Test sanitizePrompt logic (copied for isolated testing)
const sanitizePrompt = (prompt: string, maxLength: number = 2000): string => {
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('Invalid prompt: must be a non-empty string');
  }

  let cleaned = prompt.trim();
  if (cleaned.length > maxLength) {
    throw new Error(`Prompt too long (max ${maxLength} characters)`);
  }

  cleaned = cleaned
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  if (cleaned.length === 0) {
    throw new Error('Invalid prompt: empty after sanitization');
  }

  return cleaned;
};

// Test extractSafetyError logic (copied for isolated testing)
const HARM_CATEGORY_MESSAGES: Record<string, string> = {
  HARM_CATEGORY_SEXUALLY_EXPLICIT: '성적 콘텐츠가 포함된 이미지는 생성할 수 없습니다.',
  HARM_CATEGORY_HATE_SPEECH: '혐오 표현이 포함된 이미지는 생성할 수 없습니다.',
  HARM_CATEGORY_HARASSMENT: '괴롭힘/폭력적 내용이 포함된 이미지는 생성할 수 없습니다.',
  HARM_CATEGORY_DANGEROUS_CONTENT: '위험한 내용이 포함된 이미지는 생성할 수 없습니다.',
  HARM_CATEGORY_CIVIC_INTEGRITY: '시민 윤리에 반하는 이미지는 생성할 수 없습니다.',
};

const BLOCK_REASON_MESSAGES: Record<string, string> = {
  SAFETY: '안전 정책에 의해 차단되었습니다.',
  BLOCKLIST: '금지된 용어가 포함되어 차단되었습니다.',
  PROHIBITED_CONTENT: '금지된 콘텐츠로 판단되어 차단되었습니다.',
  OTHER: '콘텐츠 정책에 의해 차단되었습니다.',
};

const FINISH_REASON_MESSAGES: Record<string, string> = {
  SAFETY: '안전 정책 위반으로 생성이 중단되었습니다.',
  PROHIBITED_CONTENT: '금지된 콘텐츠로 판단되어 생성이 중단되었습니다.',
  BLOCKLIST: '금지된 용어가 포함되어 생성이 중단되었습니다.',
};

function extractSafetyError(response: {
  promptFeedback?: { blockReason?: string; blockReasonMessage?: string; safetyRatings?: Array<{ category?: string; blocked?: boolean }> };
  candidates?: Array<{ finishReason?: string; safetyRatings?: Array<{ category?: string; blocked?: boolean }> }>;
}): { category?: string; message: string } | null {
  const pf = response.promptFeedback;
  if (pf?.blockReason && pf.blockReason !== 'BLOCKED_REASON_UNSPECIFIED') {
    const blockedCategory = pf.safetyRatings?.find(r => r.blocked)?.category;
    const categoryMsg = blockedCategory ? HARM_CATEGORY_MESSAGES[blockedCategory] : undefined;
    const reasonMsg = BLOCK_REASON_MESSAGES[pf.blockReason];
    return {
      category: blockedCategory || pf.blockReason,
      message: categoryMsg || reasonMsg || `프롬프트가 차단되었습니다: ${pf.blockReasonMessage || pf.blockReason}`,
    };
  }

  const candidate = response.candidates?.[0];
  if (candidate?.finishReason && FINISH_REASON_MESSAGES[candidate.finishReason]) {
    const blockedCategory = candidate.safetyRatings?.find(r => r.blocked)?.category;
    const categoryMsg = blockedCategory ? HARM_CATEGORY_MESSAGES[blockedCategory] : undefined;
    return {
      category: blockedCategory || candidate.finishReason,
      message: categoryMsg || FINISH_REASON_MESSAGES[candidate.finishReason],
    };
  }

  return null;
}

// ============================================
// TESTS
// ============================================

describe('isGemini3Model', () => {
  it('should return true for Gemini 3 models', () => {
    expect(isGemini3Model('gemini-3-flash-preview')).toBe(true);
    expect(isGemini3Model('gemini-3-pro')).toBe(true);
    expect(isGemini3Model('gemini-3-ultra')).toBe(true);
  });

  it('should return false for non-Gemini 3 models', () => {
    expect(isGemini3Model('gemini-2.5-flash')).toBe(false);
    expect(isGemini3Model('gemini-pro')).toBe(false);
    expect(isGemini3Model('gpt-4')).toBe(false);
    expect(isGemini3Model('')).toBe(false);
  });
});

describe('getThinkingConfig', () => {
  it('should return thinking config for Gemini 3 models', () => {
    const config = getThinkingConfig('gemini-3-flash-preview');
    expect(config).toHaveProperty('thinkingConfig');
    expect(config.thinkingConfig).toEqual({ thinkingLevel: 'LOW' });
  });

  it('should return empty object for non-Gemini 3 models', () => {
    const config = getThinkingConfig('gemini-2.5-flash');
    expect(config).toEqual({});
  });
});

describe('extractSafetyError', () => {
  it('should return null for responses without safety issues', () => {
    const response = {
      candidates: [{ finishReason: 'STOP' }],
    };
    expect(extractSafetyError(response)).toBeNull();
  });

  it('should extract error from promptFeedback.blockReason', () => {
    const response = {
      promptFeedback: {
        blockReason: 'SAFETY',
        blockReasonMessage: 'Content blocked',
      },
    };
    const error = extractSafetyError(response);
    expect(error).not.toBeNull();
    expect(error?.message).toContain('차단');
  });

  it('should extract error from candidate.finishReason SAFETY', () => {
    const response = {
      candidates: [{
        finishReason: 'SAFETY',
      }],
    };
    const error = extractSafetyError(response);
    expect(error).not.toBeNull();
    expect(error?.message).toContain('안전 정책');
  });

  it('should extract blocked category message for SEXUALLY_EXPLICIT', () => {
    const response = {
      promptFeedback: {
        blockReason: 'SAFETY',
        safetyRatings: [
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', blocked: true },
        ],
      },
    };
    const error = extractSafetyError(response);
    expect(error).not.toBeNull();
    expect(error?.category).toBe('HARM_CATEGORY_SEXUALLY_EXPLICIT');
    expect(error?.message).toContain('성적');
  });

  it('should extract blocked category message for HATE_SPEECH', () => {
    const response = {
      promptFeedback: {
        blockReason: 'SAFETY',
        safetyRatings: [
          { category: 'HARM_CATEGORY_HATE_SPEECH', blocked: true },
        ],
      },
    };
    const error = extractSafetyError(response);
    expect(error?.message).toContain('혐오');
  });

  it('should ignore BLOCKED_REASON_UNSPECIFIED', () => {
    const response = {
      promptFeedback: {
        blockReason: 'BLOCKED_REASON_UNSPECIFIED',
      },
    };
    expect(extractSafetyError(response)).toBeNull();
  });
});

describe('sanitizePrompt', () => {
  it('should return trimmed prompt', () => {
    expect(sanitizePrompt('  hello world  ')).toBe('hello world');
  });

  it('should throw for empty string', () => {
    expect(() => sanitizePrompt('')).toThrow('Invalid prompt');
  });

  it('should throw for whitespace-only string', () => {
    expect(() => sanitizePrompt('   ')).toThrow('empty after sanitization');
  });

  it('should throw for non-string input', () => {
    expect(() => sanitizePrompt(null as any)).toThrow('Invalid prompt');
    expect(() => sanitizePrompt(undefined as any)).toThrow('Invalid prompt');
    expect(() => sanitizePrompt(123 as any)).toThrow('Invalid prompt');
  });

  it('should throw for prompt exceeding max length', () => {
    const longPrompt = 'a'.repeat(2001);
    expect(() => sanitizePrompt(longPrompt)).toThrow('too long');
  });

  it('should allow custom max length', () => {
    const prompt = 'a'.repeat(100);
    expect(() => sanitizePrompt(prompt, 50)).toThrow('too long');
    expect(sanitizePrompt(prompt, 200)).toBe(prompt);
  });

  it('should remove script tags', () => {
    const input = 'Hello <script>alert("xss")</script> World';
    expect(sanitizePrompt(input)).toBe('Hello  World');
  });

  it('should remove javascript: protocol', () => {
    const input = 'Click javascript:alert(1)';
    expect(sanitizePrompt(input)).toBe('Click alert(1)');
  });

  it('should remove event handlers', () => {
    const input = 'Text onclick=alert(1)';
    expect(sanitizePrompt(input)).toBe('Text alert(1)');
  });

  it('should handle Korean text correctly', () => {
    const korean = '안녕하세요 세계';
    expect(sanitizePrompt(korean)).toBe(korean);
  });

  it('should handle mixed content', () => {
    const mixed = 'Hello 안녕 123';
    expect(sanitizePrompt(mixed)).toBe(mixed);
  });
});
