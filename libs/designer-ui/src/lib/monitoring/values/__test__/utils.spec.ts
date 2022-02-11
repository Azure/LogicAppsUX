import { ContentLink } from '../types';
import { isContentLink } from '../utils';

describe('libs/monitoring/values/utils', () => {
  describe('isContentLink', () => {
    it('should return true for a content link with secured data', () => {
      const contentLink: ContentLink = {
        contentHash: {
          algorithm: 'md5',
          value: '[REDACTED]',
        },
        contentSize: 512,
        contentVersion: '1',
        secureData: {
          properties: ['request', 'response'],
        },
        uri: '[REDACTED]',
      };

      expect(isContentLink(contentLink)).toBeTruthy();
    });
  });
});
