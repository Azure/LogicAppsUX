import { getDragStartHandlerWhenDisabled, isEdge, isFirefox } from '../helper';

describe('lib/helper', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDragStartHandlerWhenDisabled', () => {
    it('should return a handler for Firefox', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:97.0) Gecko/20100101 Firefox/97.0'
      );

      const handler = getDragStartHandlerWhenDisabled();
      expect(handler).toBeDefined();

      const e = { preventDefault: vi.fn() } as unknown as React.DragEvent<HTMLElement>;
      handler?.(e);
      expect(e.preventDefault).toHaveBeenCalled();
    });

    it('should not return a handler for other browsers', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.80 Safari/537.36 Edg/98.0.1108.50'
      );

      const handler = getDragStartHandlerWhenDisabled();
      expect(handler).toBeUndefined();
    });
  });

  describe('isEdge', () => {
    it('should return true for Edge', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.80 Safari/537.36 Edg/98.0.1108.50'
      );
      expect(isEdge()).toBeTruthy();
    });
  });

  describe('isFirefox', () => {
    it('should return true for Firefox', () => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:97.0) Gecko/20100101 Firefox/97.0'
      );
      expect(isFirefox()).toBeTruthy();
    });
  });
});
