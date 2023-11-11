import { isHighContrastBlack } from '../theme';

describe('lib/utils/theme', () => {
  describe('isHighContrastBlack', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should return true when in high contrast black mode', () => {
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({ backgroundColor: 'rgb(0, 0, 0)' } as unknown as CSSStyleDeclaration);
      expect(isHighContrastBlack()).toBeTruthy();
    });

    it('should return false when not in high contrast black mode', () => {
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({ backgroundColor: 'rgb(255, 255, 255)' } as unknown as CSSStyleDeclaration);
      expect(isHighContrastBlack()).toBeFalsy();
    });
  });
});
