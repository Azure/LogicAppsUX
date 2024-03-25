import { isHighContrastBlack } from '../theme';

describe('lib/utils/theme', () => {
  describe('isHighContrastBlack', () => {
    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return true when in high contrast black mode', () => {
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ backgroundColor: 'rgb(0, 0, 0)' } as unknown as CSSStyleDeclaration);
      expect(isHighContrastBlack()).toBeTruthy();
    });

    it('should return false when not in high contrast black mode', () => {
      jest.spyOn(window, 'getComputedStyle').mockReturnValue({ backgroundColor: 'rgb(255, 255, 255)' } as unknown as CSSStyleDeclaration);
      expect(isHighContrastBlack()).toBeFalsy();
    });
  });
});
