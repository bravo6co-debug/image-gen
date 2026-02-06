import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLogger } from './logger';

describe('Logger', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a logger with scope', () => {
    const log = createLogger('test-scope');
    expect(log).toBeDefined();
    expect(typeof log.info).toBe('function');
    expect(typeof log.error).toBe('function');
    expect(typeof log.warn).toBe('function');
    expect(typeof log.debug).toBe('function');
  });

  it('should log info messages', () => {
    const log = createLogger('test');
    log.info('Test message');
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('should log error messages', () => {
    const log = createLogger('test');
    log.error('Error message');
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should log warn messages', () => {
    const log = createLogger('test');
    log.warn('Warning message');
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('should include context in log output', () => {
    const log = createLogger('test');
    log.info('Test message', { userId: '123', action: 'test' });
    expect(consoleLogSpy).toHaveBeenCalled();
    const logOutput = consoleLogSpy.mock.calls[0][0];
    expect(logOutput).toContain('Test message');
  });

  it('should create child logger with merged context', () => {
    const parentLog = createLogger('parent', { service: 'api' });
    const childLog = parentLog.child({ requestId: 'req-123' });
    expect(childLog).toBeDefined();
    childLog.info('Child log message');
    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('should handle error objects', () => {
    const log = createLogger('test');
    const testError = new Error('Test error');
    log.error('An error occurred', {}, testError);
    expect(consoleErrorSpy).toHaveBeenCalled();
    const logOutput = consoleErrorSpy.mock.calls[0][0];
    expect(logOutput).toContain('Test error');
  });
});
