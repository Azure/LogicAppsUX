import { describe, it, expect } from 'vitest';
import { createEdgeId, createTemporaryEdgeId, splitEdgeId, isEdgeId } from '../Edge.Utils';

describe('Edge.Utils', () => {
  describe('createEdgeId', () => {
    it('should create edge ID from source and target', () => {
      const result = createEdgeId('source-/ns0:Root/Name', 'target-/ns0:Root/Name');

      expect(result).toBe('source-/ns0:Root/Name__edge__target-/ns0:Root/Name');
    });

    it('should handle function nodes', () => {
      const result = createEdgeId('source-/ns0:Root/Name', 'Concat-12345');

      expect(result).toBe('source-/ns0:Root/Name__edge__Concat-12345');
    });

    it('should handle empty source', () => {
      const result = createEdgeId('', 'target-/ns0:Root/Name');

      expect(result).toBe('__edge__target-/ns0:Root/Name');
    });

    it('should handle empty target', () => {
      const result = createEdgeId('source-/ns0:Root/Name', '');

      expect(result).toBe('source-/ns0:Root/Name__edge__');
    });

    it('should create consistent edge IDs', () => {
      const result1 = createEdgeId('source-/ns0:Root/Name', 'target-/ns0:Root/Output');
      const result2 = createEdgeId('source-/ns0:Root/Name', 'target-/ns0:Root/Output');

      expect(result1).toBe(result2);
    });
  });

  describe('createTemporaryEdgeId', () => {
    it('should create temporary edge ID with unique suffix', () => {
      const result = createTemporaryEdgeId('source-/ns0:Root/Name', 'target-/ns0:Root/Name');

      expect(result).toContain('source-/ns0:Root/Name__edge__target-/ns0:Root/Name__edge__');
      expect(result.length).toBeGreaterThan('source-/ns0:Root/Name__edge__target-/ns0:Root/Name__edge__'.length);
    });

    it('should create unique IDs for each call', () => {
      const result1 = createTemporaryEdgeId('source-/ns0:Root/Name', 'target-/ns0:Root/Name');
      const result2 = createTemporaryEdgeId('source-/ns0:Root/Name', 'target-/ns0:Root/Name');

      expect(result1).not.toBe(result2);
    });

    it('should contain the source and target in the ID', () => {
      const result = createTemporaryEdgeId('source-/ns0:Root/Input', 'Concat-func-123');

      expect(result).toContain('source-/ns0:Root/Input');
      expect(result).toContain('Concat-func-123');
    });
  });

  describe('splitEdgeId', () => {
    it('should split edge ID into parts', () => {
      const edgeId = 'source-/ns0:Root/Name__edge__target-/ns0:Root/Name';

      const result = splitEdgeId(edgeId);

      expect(result).toHaveLength(2);
      expect(result[0]).toBe('source-/ns0:Root/Name');
      expect(result[1]).toBe('target-/ns0:Root/Name');
    });

    it('should split temporary edge ID', () => {
      const tempEdgeId = 'source-/ns0:Root/Name__edge__target-/ns0:Root/Name__edge__guid-123';

      const result = splitEdgeId(tempEdgeId);

      expect(result).toHaveLength(3);
      expect(result[0]).toBe('source-/ns0:Root/Name');
      expect(result[1]).toBe('target-/ns0:Root/Name');
      expect(result[2]).toBe('guid-123');
    });

    it('should handle non-edge ID', () => {
      const nonEdgeId = 'source-/ns0:Root/Name';

      const result = splitEdgeId(nonEdgeId);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('source-/ns0:Root/Name');
    });

    it('should handle empty string', () => {
      const result = splitEdgeId('');

      expect(result).toHaveLength(1);
      expect(result[0]).toBe('');
    });
  });

  describe('isEdgeId', () => {
    it('should return true for valid edge ID', () => {
      const edgeId = 'source-/ns0:Root/Name__edge__target-/ns0:Root/Name';

      expect(isEdgeId(edgeId)).toBe(true);
    });

    it('should return false for temporary edge ID (has 3 parts)', () => {
      const tempEdgeId = 'source-/ns0:Root/Name__edge__target-/ns0:Root/Name__edge__guid-123';

      expect(isEdgeId(tempEdgeId)).toBe(false);
    });

    it('should return false for non-edge ID', () => {
      const nonEdgeId = 'source-/ns0:Root/Name';

      expect(isEdgeId(nonEdgeId)).toBe(false);
    });

    it('should return false for function node ID', () => {
      const functionId = 'Concat-12345-abcd';

      expect(isEdgeId(functionId)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isEdgeId('')).toBe(false);
    });

    it('should return true for function-to-target edge', () => {
      const edgeId = 'Concat-12345__edge__target-/ns0:Root/Output';

      expect(isEdgeId(edgeId)).toBe(true);
    });

    it('should return true for source-to-function edge', () => {
      const edgeId = 'source-/ns0:Root/Input__edge__Concat-12345';

      expect(isEdgeId(edgeId)).toBe(true);
    });
  });
});
