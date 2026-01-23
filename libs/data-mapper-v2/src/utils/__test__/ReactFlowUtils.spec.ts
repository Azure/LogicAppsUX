import { describe, it, expect } from 'vitest';
import {
  addReactFlowPrefix,
  addSourceReactFlowPrefix,
  addTargetReactFlowPrefix,
  isSourceNode,
  isTargetNode,
  isFunctionNode,
  getTreeNodeId,
  getSplitIdsFromReactFlowConnectionId,
  reactFlowConnectionIdSeparator,
  reactFlowConnectionPortSeparator,
} from '../ReactFlow.Util';
import { SchemaType } from '@microsoft/logic-apps-shared';

describe('ReactFlow.Util', () => {
  describe('addReactFlowPrefix', () => {
    it('should add source prefix for Source schema type', () => {
      const result = addReactFlowPrefix('/ns0:Root/Name', SchemaType.Source);

      expect(result).toBe('source-/ns0:Root/Name');
    });

    it('should add target prefix for Target schema type', () => {
      const result = addReactFlowPrefix('/ns0:Root/Name', SchemaType.Target);

      expect(result).toBe('target-/ns0:Root/Name');
    });

    it('should handle empty key', () => {
      const result = addReactFlowPrefix('', SchemaType.Source);

      expect(result).toBe('source-');
    });

    it('should handle complex paths', () => {
      const result = addReactFlowPrefix('/ns0:Root/Complex/Nested/Path', SchemaType.Target);

      expect(result).toBe('target-/ns0:Root/Complex/Nested/Path');
    });
  });

  describe('addSourceReactFlowPrefix', () => {
    it('should add source prefix to key', () => {
      const result = addSourceReactFlowPrefix('/ns0:Root/Name');

      expect(result).toBe('source-/ns0:Root/Name');
    });

    it('should handle empty key', () => {
      const result = addSourceReactFlowPrefix('');

      expect(result).toBe('source-');
    });
  });

  describe('addTargetReactFlowPrefix', () => {
    it('should add target prefix to key', () => {
      const result = addTargetReactFlowPrefix('/ns0:Root/Name');

      expect(result).toBe('target-/ns0:Root/Name');
    });

    it('should handle empty key', () => {
      const result = addTargetReactFlowPrefix('');

      expect(result).toBe('target-');
    });
  });

  describe('isSourceNode', () => {
    it('should return true for source-prefixed keys', () => {
      expect(isSourceNode('source-/ns0:Root/Name')).toBe(true);
    });

    it('should return false for target-prefixed keys', () => {
      expect(isSourceNode('target-/ns0:Root/Name')).toBe(false);
    });

    it('should return false for function keys', () => {
      expect(isSourceNode('Concat-12345')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isSourceNode('')).toBe(false);
    });
  });

  describe('isTargetNode', () => {
    it('should return true for target-prefixed keys', () => {
      expect(isTargetNode('target-/ns0:Root/Name')).toBe(true);
    });

    it('should return false for source-prefixed keys', () => {
      expect(isTargetNode('source-/ns0:Root/Name')).toBe(false);
    });

    it('should return false for function keys', () => {
      expect(isTargetNode('Concat-12345')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isTargetNode('')).toBe(false);
    });
  });

  describe('isFunctionNode', () => {
    it('should return true for function keys', () => {
      expect(isFunctionNode('Concat-12345-abcd')).toBe(true);
    });

    it('should return true for custom function keys', () => {
      expect(isFunctionNode('CustomXslt-aaaa-bbbb')).toBe(true);
    });

    it('should return false for source nodes', () => {
      expect(isFunctionNode('source-/ns0:Root/Name')).toBe(false);
    });

    it('should return false for target nodes', () => {
      expect(isFunctionNode('target-/ns0:Root/Name')).toBe(false);
    });

    it('should return true for empty string (not source, target, or intermediate)', () => {
      // Empty string is not a source, target, or intermediate node, so it's treated as a function node
      expect(isFunctionNode('')).toBe(true);
    });
  });

  describe('getTreeNodeId', () => {
    it('should remove source prefix', () => {
      const result = getTreeNodeId('source-/ns0:Root/Name');

      expect(result).toBe('/ns0:Root/Name');
    });

    it('should remove target prefix', () => {
      const result = getTreeNodeId('target-/ns0:Root/Name');

      expect(result).toBe('/ns0:Root/Name');
    });

    it('should return original key for function nodes', () => {
      const result = getTreeNodeId('Concat-12345');

      expect(result).toBe('Concat-12345');
    });

    it('should handle complex paths', () => {
      const result = getTreeNodeId('source-/ns0:Root/Complex/Nested/Path/Element');

      expect(result).toBe('/ns0:Root/Complex/Nested/Path/Element');
    });
  });

  describe('getSplitIdsFromReactFlowConnectionId', () => {
    it('should split simple connection ID', () => {
      const connectionId = `source-/ns0:Root/Name${reactFlowConnectionIdSeparator}target-/ns0:Root/Name`;

      const result = getSplitIdsFromReactFlowConnectionId(connectionId);

      expect(result.sourceId).toBe('source-/ns0:Root/Name');
      expect(result.destinationId).toBe('target-/ns0:Root/Name');
      expect(result.portId).toBeUndefined();
    });

    it('should split connection ID with port', () => {
      const connectionId = `source-/ns0:Root/Name${reactFlowConnectionIdSeparator}Concat-12345${reactFlowConnectionPortSeparator}input-0`;

      const result = getSplitIdsFromReactFlowConnectionId(connectionId);

      expect(result.sourceId).toBe('source-/ns0:Root/Name');
      expect(result.destinationId).toBe('Concat-12345');
      expect(result.portId).toBe('input-0');
    });

    it('should handle source-only connection ID', () => {
      const connectionId = 'source-/ns0:Root/Name';

      const result = getSplitIdsFromReactFlowConnectionId(connectionId);

      expect(result.sourceId).toBe('source-/ns0:Root/Name');
      expect(result.destinationId).toBeUndefined();
      expect(result.portId).toBeUndefined();
    });

    it('should handle function to target connection', () => {
      const connectionId = `Concat-12345${reactFlowConnectionIdSeparator}target-/ns0:Root/Result`;

      const result = getSplitIdsFromReactFlowConnectionId(connectionId);

      expect(result.sourceId).toBe('Concat-12345');
      expect(result.destinationId).toBe('target-/ns0:Root/Result');
    });
  });

  describe('constants', () => {
    it('should have correct connection ID separator', () => {
      expect(reactFlowConnectionIdSeparator).toBe('-to-');
    });

    it('should have correct port separator', () => {
      expect(reactFlowConnectionPortSeparator).toBe('-port-');
    });
  });
});
