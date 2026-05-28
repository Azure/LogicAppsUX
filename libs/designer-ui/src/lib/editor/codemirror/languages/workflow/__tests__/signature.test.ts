import { describe, it, expect } from 'vitest';
import { workflowSignatureHelp, getSignatureAtPosition } from '../signature';

describe('workflowSignatureHelp', () => {
  it('should export signature help extension', () => {
    expect(workflowSignatureHelp).toBeDefined();
  });
});

describe('getSignatureAtPosition', () => {
  it('should return null for empty text', () => {
    const result = getSignatureAtPosition('', 0);
    expect(result).toBeNull();
  });

  it('should find function signature after opening paren', () => {
    const result = getSignatureAtPosition('concat(', 7);
    expect(result).not.toBeNull();
    expect(result?.functionName.toLowerCase()).toBe('concat');
    expect(result?.activeParameter).toBe(0);
  });

  it('should track active parameter with commas', () => {
    const result = getSignatureAtPosition("concat('a', ", 12);
    expect(result).not.toBeNull();
    expect(result?.activeParameter).toBe(1);
  });

  it('should handle nested function calls', () => {
    const result = getSignatureAtPosition('concat(toLower(', 15);
    expect(result).not.toBeNull();
    expect(result?.functionName.toLowerCase()).toBe('tolower');
  });
});
