import { isEnterKey, isEscapeKey, isSpaceKey } from '../keyboardUtils';

describe('ui/utils/keyboardUtils', () => {
  describe('isEnterKey', () => {
    it('should return true if the Enter key is pressed by itself', () => {
      const e = {
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        which: 13,
      } as unknown as React.KeyboardEvent<HTMLElement>;

      expect(isEnterKey(e)).toBeTruthy();
    });
  });

  describe('isSpaceKey', () => {
    it('should return true if the spacebar is pressed by itself', () => {
      const e = {
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        which: 32,
      } as unknown as React.KeyboardEvent<HTMLElement>;

      expect(isSpaceKey(e)).toBeTruthy();
    });
  });

  describe('isEscapeKey', () => {
    it('should return true if the escape key is pressed by itself', () => {
      const e = {
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        which: 27,
      } as unknown as React.KeyboardEvent<HTMLElement>;

      expect(isEscapeKey(e)).toBeTruthy();
    });
  });
});
