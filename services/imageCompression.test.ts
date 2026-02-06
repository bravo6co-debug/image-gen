import { describe, it, expect } from 'vitest';
import { getBase64Size, formatBytes } from './imageCompression';

describe('getBase64Size', () => {
  it('should calculate size of base64 string correctly', () => {
    // "Hello" in base64 is "SGVsbG8=" (8 characters)
    // Decoded size: 5 bytes
    const base64 = 'SGVsbG8=';
    const size = getBase64Size(base64);
    expect(size).toBe(6); // ceil(8 * 0.75) = 6
  });

  it('should handle base64 with data URL prefix', () => {
    const dataUrl = 'data:image/png;base64,SGVsbG8=';
    const size = getBase64Size(dataUrl);
    expect(size).toBe(6);
  });

  it('should handle empty string', () => {
    const size = getBase64Size('');
    expect(size).toBe(0);
  });

  it('should calculate larger base64 correctly', () => {
    // Create a 100-character base64 string
    const base64 = 'A'.repeat(100);
    const size = getBase64Size(base64);
    expect(size).toBe(75); // ceil(100 * 0.75) = 75
  });

  it('should handle base64 with padding', () => {
    // "Hi" in base64 is "SGk=" (4 characters)
    const base64 = 'SGk=';
    const size = getBase64Size(base64);
    expect(size).toBe(3); // ceil(4 * 0.75) = 3
  });
});

describe('formatBytes', () => {
  it('should format bytes less than 1KB', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('should format kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(10240)).toBe('10.0 KB');
  });

  it('should format megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.0 MB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.5 MB');
    expect(formatBytes(100 * 1024 * 1024)).toBe('100.0 MB');
  });

  it('should handle edge cases at boundaries', () => {
    // Just under 1KB
    expect(formatBytes(1023)).toBe('1023 B');
    // Exactly 1KB
    expect(formatBytes(1024)).toBe('1.0 KB');
    // Just under 1MB
    expect(formatBytes(1024 * 1024 - 1)).toContain('KB');
    // Exactly 1MB
    expect(formatBytes(1024 * 1024)).toBe('1.0 MB');
  });
});

// Note: DOM-dependent functions (compressImage, compressImageFile, etc.)
// require a browser environment and are excluded from these unit tests.
// They can be tested using integration tests or browser-based testing tools.
