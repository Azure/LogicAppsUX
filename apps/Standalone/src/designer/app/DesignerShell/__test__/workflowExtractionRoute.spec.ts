import { describe, expect, it } from 'vitest';
import { getWorkflowExtractionRoute } from '../workflowExtractionRoute';

describe('workflow extraction route', () => {
  it('clears the opt-in state when navigation removes the extraction query flag', () => {
    expect(getWorkflowExtractionRoute('?extraction=true&local=ExtractSelection.json')).toEqual({
      enabled: true,
      localWorkflow: 'ExtractSelection.json',
    });
    expect(getWorkflowExtractionRoute('?local=ExtractSelection.json')).toEqual({
      enabled: false,
      localWorkflow: null,
    });
  });
});
