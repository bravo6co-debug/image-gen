import { describe, it, expect, vi } from 'vitest';
import {
  ApiError,
  QuotaExceededError,
  PermissionDeniedError,
  ModelNotFoundError,
  ValidationError,
  GenerationTimeoutError,
  NetworkError,
  ImageGenerationError,
  VideoGenerationError,
  SafetyViolationError,
  parseApiError,
  withRetry,
  getErrorMessage,
} from './errors';

describe('ApiError', () => {
  it('should create an ApiError with correct properties', () => {
    const error = new ApiError('Test error', 'TEST_CODE', 500, true);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(500);
    expect(error.retryable).toBe(true);
    expect(error.name).toBe('ApiError');
  });

  it('should default to non-retryable with status 500', () => {
    const error = new ApiError('Test', 'TEST');
    expect(error.statusCode).toBe(500);
    expect(error.retryable).toBe(false);
  });
});

describe('Specific Error Classes', () => {
  it('QuotaExceededError should be retryable with 429 status', () => {
    const error = new QuotaExceededError();
    expect(error.code).toBe('QUOTA_EXCEEDED');
    expect(error.statusCode).toBe(429);
    expect(error.retryable).toBe(true);
    expect(error.name).toBe('QuotaExceededError');
  });

  it('PermissionDeniedError should not be retryable with 403 status', () => {
    const error = new PermissionDeniedError();
    expect(error.code).toBe('PERMISSION_DENIED');
    expect(error.statusCode).toBe(403);
    expect(error.retryable).toBe(false);
  });

  it('ModelNotFoundError should include model name in message', () => {
    const error = new ModelNotFoundError('gpt-4-turbo');
    expect(error.message).toContain('gpt-4-turbo');
    expect(error.code).toBe('MODEL_NOT_FOUND');
    expect(error.statusCode).toBe(404);
  });

  it('ValidationError should have custom message', () => {
    const error = new ValidationError('Invalid input');
    expect(error.message).toBe('Invalid input');
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
  });

  it('GenerationTimeoutError should include elapsed seconds', () => {
    const error = new GenerationTimeoutError(120);
    expect(error.message).toContain('120');
    expect(error.code).toBe('TIMEOUT');
    expect(error.statusCode).toBe(408);
    expect(error.retryable).toBe(true);
  });

  it('NetworkError should be retryable with status 0', () => {
    const error = new NetworkError();
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.statusCode).toBe(0);
    expect(error.retryable).toBe(true);
  });

  it('ImageGenerationError should be retryable', () => {
    const error = new ImageGenerationError('Generation failed');
    expect(error.code).toBe('IMAGE_GENERATION_FAILED');
    expect(error.retryable).toBe(true);
  });

  it('VideoGenerationError should be retryable', () => {
    const error = new VideoGenerationError('Video failed');
    expect(error.code).toBe('VIDEO_GENERATION_FAILED');
    expect(error.retryable).toBe(true);
  });

  it('SafetyViolationError should not be retryable', () => {
    const error = new SafetyViolationError('NSFW', 'Content blocked');
    expect(error.category).toBe('NSFW');
    expect(error.code).toBe('SAFETY_VIOLATION');
    expect(error.retryable).toBe(false);
  });
});

describe('parseApiError', () => {
  it('should return existing ApiError as-is', () => {
    const original = new QuotaExceededError();
    const parsed = parseApiError(original);
    expect(parsed).toBe(original);
  });

  it('should parse safety-related errors', () => {
    const error = new Error('Content was blocked due to safety concerns');
    const parsed = parseApiError(error);
    expect(parsed).toBeInstanceOf(SafetyViolationError);
  });

  it('should parse quota/429 errors', () => {
    const error = new Error('Resource exhausted: quota exceeded');
    const parsed = parseApiError(error);
    expect(parsed).toBeInstanceOf(QuotaExceededError);
  });

  it('should parse permission/403 errors', () => {
    const error = new Error('403 Forbidden');
    const parsed = parseApiError(error);
    expect(parsed).toBeInstanceOf(PermissionDeniedError);
  });

  it('should parse 404 errors', () => {
    const error = new Error('Model not found (404)');
    const parsed = parseApiError(error);
    expect(parsed).toBeInstanceOf(ModelNotFoundError);
  });

  it('should parse timeout errors', () => {
    const error = new Error('Request timeout');
    const parsed = parseApiError(error);
    expect(parsed).toBeInstanceOf(GenerationTimeoutError);
  });

  it('should parse network/fetch errors', () => {
    const error = new Error('fetch failed');
    const parsed = parseApiError(error);
    expect(parsed).toBeInstanceOf(NetworkError);
  });

  it('should handle non-Error objects', () => {
    const parsed = parseApiError('string error');
    expect(parsed).toBeInstanceOf(ApiError);
    expect(parsed.code).toBe('UNKNOWN_ERROR');
  });

  it('should handle unknown errors', () => {
    const error = new Error('Some random error');
    const parsed = parseApiError(error);
    expect(parsed.code).toBe('UNKNOWN_ERROR');
  });
});

describe('getErrorMessage', () => {
  it('should return Korean message for QUOTA_EXCEEDED', () => {
    const error = new QuotaExceededError();
    const message = getErrorMessage(error);
    expect(message).toContain('API 사용량');
  });

  it('should return Korean message for PERMISSION_DENIED', () => {
    const error = new PermissionDeniedError();
    const message = getErrorMessage(error);
    expect(message).toContain('권한');
  });

  it('should return Korean message for TIMEOUT', () => {
    const error = new GenerationTimeoutError(60);
    const message = getErrorMessage(error);
    expect(message).toContain('시간');
  });

  it('should return Korean message for NETWORK_ERROR', () => {
    const error = new NetworkError();
    const message = getErrorMessage(error);
    expect(message).toContain('네트워크');
  });

  it('should return Korean message for SAFETY_VIOLATION', () => {
    const error = new SafetyViolationError(undefined, 'Blocked');
    const message = getErrorMessage(error);
    expect(message).toContain('Blocked');
  });

  it('should handle unknown error types', () => {
    const error = new Error('Unknown');
    const message = getErrorMessage(error);
    expect(message).toContain('오류');
  });
});

describe('withRetry', () => {
  it('should return result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success');
    const result = await withRetry(fn, { maxRetries: 3 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new QuotaExceededError())
      .mockRejectedValueOnce(new QuotaExceededError())
      .mockResolvedValue('success');

    const result = await withRetry(fn, { maxRetries: 3, initialDelay: 10 });
    expect(result).toBe('success');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('should not retry on non-retryable errors', async () => {
    const fn = vi.fn().mockRejectedValue(new PermissionDeniedError());

    await expect(withRetry(fn, { maxRetries: 3, initialDelay: 10 }))
      .rejects.toBeInstanceOf(PermissionDeniedError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('should throw after max retries exceeded', async () => {
    const fn = vi.fn().mockRejectedValue(new QuotaExceededError());

    await expect(withRetry(fn, { maxRetries: 2, initialDelay: 10 }))
      .rejects.toBeInstanceOf(QuotaExceededError);
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it('should respect custom shouldRetry function', async () => {
    const fn = vi.fn().mockRejectedValue(new QuotaExceededError());

    await expect(withRetry(fn, {
      maxRetries: 3,
      initialDelay: 10,
      shouldRetry: () => false,
    })).rejects.toBeInstanceOf(QuotaExceededError);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
