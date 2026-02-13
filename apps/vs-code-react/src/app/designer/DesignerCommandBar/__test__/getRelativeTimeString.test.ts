import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getRelativeTimeString } from '../utils';

const mockMessages = {
  secondsAgo: 'Autosaved seconds ago',
  minutesAgo: 'Autosaved minutes ago',
  oneHourAgo: 'Autosaved 1 hour ago',
  hoursAgo: vi.fn((values?: Record<string, any>) => `Autosaved ${values?.count} hours ago`),
};

describe('getRelativeTimeString', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return seconds ago for less than 1 minute', () => {
    const now = new Date('2025-01-15T10:00:30.000Z');
    vi.setSystemTime(now);

    const savedTime = new Date('2025-01-15T10:00:05.000Z'); // 25 seconds ago
    expect(getRelativeTimeString(savedTime, mockMessages)).toBe('Autosaved seconds ago');
  });

  it('should return seconds ago for exactly 0 seconds', () => {
    const now = new Date('2025-01-15T10:00:00.000Z');
    vi.setSystemTime(now);

    expect(getRelativeTimeString(now, mockMessages)).toBe('Autosaved seconds ago');
  });

  it('should return minutes ago for 1-59 minutes', () => {
    const now = new Date('2025-01-15T10:05:00.000Z');
    vi.setSystemTime(now);

    const savedTime = new Date('2025-01-15T10:00:00.000Z'); // 5 minutes ago
    expect(getRelativeTimeString(savedTime, mockMessages)).toBe('Autosaved minutes ago');
  });

  it('should return minutes ago for exactly 1 minute', () => {
    const now = new Date('2025-01-15T10:01:00.000Z');
    vi.setSystemTime(now);

    const savedTime = new Date('2025-01-15T10:00:00.000Z'); // 1 minute ago
    expect(getRelativeTimeString(savedTime, mockMessages)).toBe('Autosaved minutes ago');
  });

  it('should return one hour ago for exactly 1 hour', () => {
    const now = new Date('2025-01-15T11:00:00.000Z');
    vi.setSystemTime(now);

    const savedTime = new Date('2025-01-15T10:00:00.000Z'); // 1 hour ago
    expect(getRelativeTimeString(savedTime, mockMessages)).toBe('Autosaved 1 hour ago');
  });

  it('should return hours ago with count for 2+ hours', () => {
    const now = new Date('2025-01-15T13:00:00.000Z');
    vi.setSystemTime(now);

    const savedTime = new Date('2025-01-15T10:00:00.000Z'); // 3 hours ago
    expect(getRelativeTimeString(savedTime, mockMessages)).toBe('Autosaved 3 hours ago');
    expect(mockMessages.hoursAgo).toHaveBeenCalledWith({ count: 3 });
  });

  it('should return hours ago for large time differences', () => {
    const now = new Date('2025-01-16T10:00:00.000Z');
    vi.setSystemTime(now);

    const savedTime = new Date('2025-01-15T10:00:00.000Z'); // 24 hours ago
    expect(getRelativeTimeString(savedTime, mockMessages)).toBe('Autosaved 24 hours ago');
    expect(mockMessages.hoursAgo).toHaveBeenCalledWith({ count: 24 });
  });

  it('should return minutes ago at 59 minutes boundary', () => {
    const now = new Date('2025-01-15T10:59:59.000Z');
    vi.setSystemTime(now);

    const savedTime = new Date('2025-01-15T10:00:00.000Z'); // 59 min 59 sec ago
    expect(getRelativeTimeString(savedTime, mockMessages)).toBe('Autosaved minutes ago');
  });
});
