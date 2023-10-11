import type { ConnectionDictionary } from '../../models/Connection';
import { generateFunctionConnectionMetadata } from '../MapMetadataSerializer';

describe('mapMetadataSerializer', () => {
  describe('generateFunctionConnectionMetadata', () => {
    it('generates simple identifier', () => {
      const mockConnections: Partial<ConnectionDictionary> = {};
      const ans = generateFunctionConnectionMetadata('abc', mockConnections as ConnectionDictionary);
      console.log(ans);
      // this will be used later- next PR to load and save position data
    });
  });
});
