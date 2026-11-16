import { describe, expect, it } from 'vitest';
import { deriveSharedEdgeRunState, type EdgeRunEvidence } from '../sharedEdgeRunState';

const selection = { runId: 'run-1', iterationKey: 'loop-0' };

describe('deriveSharedEdgeRunState', () => {
  it('returns default when no evidence exists', () => {
    expect(deriveSharedEdgeRunState(undefined, selection)).toBe('default');
  });

  it.each<EdgeRunEvidence['state']>(['taken', 'notTaken', 'running'])('returns %s for matching evidence', (state) => {
    expect(deriveSharedEdgeRunState({ state, ...selection }, selection)).toBe(state);
  });

  it('returns default for evidence from another run', () => {
    expect(deriveSharedEdgeRunState({ state: 'taken', runId: 'run-0', iterationKey: 'loop-0' }, selection)).toBe('default');
  });

  it('returns default for evidence from another iteration', () => {
    expect(deriveSharedEdgeRunState({ state: 'notTaken', runId: 'run-1', iterationKey: 'loop-1' }, selection)).toBe('default');
  });
});
