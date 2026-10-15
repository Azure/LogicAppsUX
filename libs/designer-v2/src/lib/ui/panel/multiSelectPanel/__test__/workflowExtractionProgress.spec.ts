import { describe, expect, it } from 'vitest';
import {
  initialExtractionProgress,
  reportExtractionProgress,
  settleExtractionProgress,
  startExtractionAttempt,
} from '../workflowExtractionProgress';

const child = { name: 'Child', href: '#child' };

describe('extraction execution checklist', () => {
  it('does not invent host success for a legacy completed result', () => {
    const progress = settleExtractionProgress(startExtractionAttempt(), { status: 'completed', child });
    expect(progress).toEqual({
      preparing: 'completed',
      'validating-child': 'unconfirmed',
      'creating-child': 'completed',
      'saving-source': 'completed',
      'applying-source': 'completed',
    });
  });

  it.each(['child-created', 'source-saved'] as const)('does not infer child readiness from %s', (status) => {
    const progress = settleExtractionProgress(
      { ...startExtractionAttempt(), preparing: 'completed', 'creating-child': 'in-progress' },
      { status, child, message: 'Child readiness could not be confirmed.' }
    );
    expect(progress['creating-child']).toBe('partial');
    expect(progress['validating-child']).toBe('unconfirmed');
    expect(progress['saving-source']).toBe(status === 'source-saved' ? 'completed' : 'unconfirmed');
    expect(progress['applying-source']).toBe(status === 'source-saved' ? 'unconfirmed' : 'pending');
  });

  it('retains confirmed readiness when saving the source fails and on retry', () => {
    const progress = settleExtractionProgress(
      { ...initialExtractionProgress(), preparing: 'completed', 'creating-child': 'completed', 'saving-source': 'in-progress' },
      { status: 'child-created', child, message: 'Source save failed.' }
    );
    expect(progress['creating-child']).toBe('completed');
    expect(progress['saving-source']).toBe('failed');
    const retry = startExtractionAttempt(progress);
    expect(retry.preparing).toBe('in-progress');
    expect(retry['creating-child']).toBe('completed');
    expect(retry['saving-source']).toBe('pending');
  });

  it('reflects real host revalidation even when the checkpoint completed on a previous attempt', () => {
    const progress = { ...initialExtractionProgress(), 'creating-child': 'completed' as const };
    const rechecking = reportExtractionProgress(progress, { step: 'creating-child', status: 'in-progress' });
    expect(rechecking['creating-child']).toBe('in-progress');
    expect(
      settleExtractionProgress(rechecking, { status: 'source-saved', child, message: 'Readiness revalidation failed.' })['creating-child']
    ).toBe('partial');
  });

  it('marks active validation failed without claiming later host steps succeeded', () => {
    const progress = settleExtractionProgress({
      ...initialExtractionProgress(),
      preparing: 'completed',
      'validating-child': 'in-progress',
    });
    expect(progress['validating-child']).toBe('failed');
    expect(progress['creating-child']).toBe('unconfirmed');
    expect(progress['saving-source']).toBe('unconfirmed');
    expect(progress['applying-source']).toBe('pending');
  });

  it.each(['in-progress', 'completed'] as const)('preserves actual apply %s on a terminal cleanup result', (status) => {
    const progress = settleExtractionProgress(
      { ...initialExtractionProgress(), 'creating-child': 'completed', 'applying-source': status },
      { status: 'source-saved', child, message: 'Reload required.' }
    );
    expect(progress['creating-child']).toBe('completed');
    expect(progress['saving-source']).toBe('completed');
    expect(progress['applying-source']).toBe(status === 'completed' ? 'completed' : 'failed');
  });
});
