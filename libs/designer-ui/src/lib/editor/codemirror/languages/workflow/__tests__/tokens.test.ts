import { describe, it, expect } from 'vitest';
import { workflowLanguage, workflowHighlighting } from '../tokens';

describe('workflowLanguage', () => {
  it('should export a language support object', () => {
    expect(workflowLanguage).toBeDefined();
  });

  it('should export highlighting styles', () => {
    expect(workflowHighlighting).toBeDefined();
  });
});
