import type { ConnectionDictionary } from '../../models/Connection';
import { generateFunctionConnectionMetadata } from '../MapMetadataSerializer';

describe('mapMetadataSerializer', () => {
  describe('generateFunctionConnectionMetadata', () => {
    it('generates simple identifier', () => {
      const mockConnections: Partial<ConnectionDictionary> = {};
      const ans = generateFunctionConnectionMetadata('abc', mockConnections as ConnectionDictionary);
      console.log(ans);
    });
  });
});
