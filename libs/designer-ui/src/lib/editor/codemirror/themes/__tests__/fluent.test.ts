import { describe, it, expect } from 'vitest';
import { createFluentTheme } from '../fluent';

describe('createFluentTheme', () => {
  it('should return an array of extensions for light theme', () => {
    const theme = createFluentTheme(false);
    expect(Array.isArray(theme)).toBe(true);
    expect(theme.length).toBeGreaterThan(0);
  });

  it('should return an array of extensions for dark theme', () => {
    const theme = createFluentTheme(true);
    expect(Array.isArray(theme)).toBe(true);
    expect(theme.length).toBeGreaterThan(0);
  });

  it('should return different themes for light and dark', () => {
    const lightTheme = createFluentTheme(false);
    const darkTheme = createFluentTheme(true);
    expect(lightTheme).not.toEqual(darkTheme);
  });
});
