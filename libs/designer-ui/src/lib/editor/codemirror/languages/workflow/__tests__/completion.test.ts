import { describe, it, expect } from 'vitest';
import { workflowCompletion } from '../completion';
import { CompletionContext } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';

describe('workflowCompletion', () => {
  it('should export a completion source', () => {
    expect(workflowCompletion).toBeDefined();
    expect(typeof workflowCompletion).toBe('function');
  });

  it('should provide function completions', () => {
    const state = EditorState.create({ doc: 'con' });
    const context = new CompletionContext(state, 3, false);
    const result = workflowCompletion(context);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.options.some((opt) => opt.label.toLowerCase().includes('concat'))).toBe(true);
    }
  });

  it('should provide keyword completions', () => {
    const state = EditorState.create({ doc: 'nul' });
    const context = new CompletionContext(state, 3, false);
    const result = workflowCompletion(context);

    expect(result).not.toBeNull();
    if (result) {
      expect(result.options.some((opt) => opt.label === 'null')).toBe(true);
    }
  });
});
