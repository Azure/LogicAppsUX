import { hasModifier, isDeleteKey, isDownArrowKey, isEnterKey, isEscapeKey, isSpaceKey, isUpArrowKey } from '../keyboardUtils';

describe('ui/utils/keyboardUtils', () => {
  describe('hasModifier', () => {
    it('should return true if the Alt key is pressed', () => {
      const e = {
        altKey: true,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        which: 46,
      } as unknown as React.KeyboardEvent<HTMLElement>;

      expect(hasModifier(e)).toBeTruthy();
    });

    it('should return true if the Meta key is pressed', () => {
      const e = {
        altKey: false,
        ctrlKey: false,
        metaKey: true,
        shiftKey: false,
        which: 46,
      } as unknown as React.KeyboardEvent<HTMLElement>;

      expect(hasModifier(e)).toBeTruthy();
    });
  });

  describe('isDeleteKey', () => {
    it('should return true if the Enter key is pressed by itself', () => {
      const e = {
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        shiftKey: false,
        which: 46,
      } as unknown as React.KeyboardEvent<HTMLElement>;

      expect(isDeleteKey(e)).toBeTruthy();
    });
  });

  describe('isDownArrowKey', () => {
    it('should return true if the Down Arrow key is pressed', () => {
      const e = {
        which: 40,
      } as unknown as React.KeyboardEvent<HTMLElement>;

      expect(isDownArrowKey(e)).toBeTruthy();
    });
  });

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

  describe('isUpArrowKey', () => {
    it('should return true if the Up Arrow key is pressed', () => {
      const e = {
        which: 38,
      } as unknown as React.KeyboardEvent<HTMLElement>;

      expect(isUpArrowKey(e)).toBeTruthy();
    });
  });
});
