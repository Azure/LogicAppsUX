import { describe, it, expect } from 'vitest';
import appReducer, { changeTheme, type AppState } from '../AppSlice';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';

describe('AppSlice', () => {
  const initialState: AppState = {
    theme: ThemeType.Light,
  };

  describe('initial state', () => {
    it('should return the initial state when called with undefined state', () => {
      const result = appReducer(undefined, { type: 'unknown' });

      expect(result).toEqual(initialState);
    });

    it('should have Light theme as default', () => {
      const result = appReducer(undefined, { type: 'unknown' });

      expect(result.theme).toBe(ThemeType.Light);
    });
  });

  describe('changeTheme action', () => {
    it('should change theme from Light to Dark', () => {
      const result = appReducer(initialState, changeTheme(ThemeType.Dark));

      expect(result.theme).toBe(ThemeType.Dark);
    });

    it('should change theme from Dark to Light', () => {
      const darkState: AppState = { theme: ThemeType.Dark };

      const result = appReducer(darkState, changeTheme(ThemeType.Light));

      expect(result.theme).toBe(ThemeType.Light);
    });

    it('should handle setting the same theme', () => {
      const result = appReducer(initialState, changeTheme(ThemeType.Light));

      expect(result.theme).toBe(ThemeType.Light);
    });
  });
});
