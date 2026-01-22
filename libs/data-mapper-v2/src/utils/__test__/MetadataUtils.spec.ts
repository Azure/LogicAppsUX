import { describe, it, expect } from 'vitest';
import { doesFunctionMetadataExist } from '../Metadata.Utils';
import type { MapMetadataV2 } from '@microsoft/logic-apps-shared';

describe('Metadata.Utils', () => {
  describe('doesFunctionMetadataExist', () => {
    it('should return falsy when metadata is undefined', () => {
      const result = doesFunctionMetadataExist(undefined);

      expect(result).toBeFalsy();
    });

    it('should return falsy when functionNodes is undefined', () => {
      const metadata = {} as MapMetadataV2;

      const result = doesFunctionMetadataExist(metadata);

      expect(result).toBeFalsy();
    });

    it('should return falsy when functionNodes is empty array', () => {
      const metadata: MapMetadataV2 = {
        functionNodes: [],
      };

      const result = doesFunctionMetadataExist(metadata);

      expect(result).toBeFalsy();
    });

    it('should return true when functionNodes has elements', () => {
      const metadata: MapMetadataV2 = {
        functionNodes: [
          {
            reactFlowGuid: 'Concat-12345',
            functionKey: 'Concat',
            positions: [{ targetKey: '/ns0:Root/Name', position: { x: 100, y: 100 } }],
            connections: [],
            connectionShorthand: 'Concat->Name',
          },
        ],
      };

      const result = doesFunctionMetadataExist(metadata);

      expect(result).toBe(true);
    });

    it('should return true when functionNodes has multiple elements', () => {
      const metadata: MapMetadataV2 = {
        functionNodes: [
          {
            reactFlowGuid: 'Concat-12345',
            functionKey: 'Concat',
            positions: [],
            connections: [],
            connectionShorthand: '',
          },
          {
            reactFlowGuid: 'ToLower-67890',
            functionKey: 'ToLower',
            positions: [],
            connections: [],
            connectionShorthand: '',
          },
        ],
      };

      const result = doesFunctionMetadataExist(metadata);

      expect(result).toBe(true);
    });
  });
});
