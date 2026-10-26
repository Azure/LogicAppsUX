import { describe, expect, it } from 'vitest';
import type { WorkflowExtractionResult } from '../../../../common/models/workflowExtraction';
import {
  extractionSteps,
  getExtractionStep,
  initialExtractionProgress,
  reportExtractionProgress,
  settleExtractionProgress,
  startExtractionAttempt,
  type ExtractionProgress,
} from '../workflowExtractionProgress';

const child = { name: 'Child', href: '#child' };
const steps = (progress: ExtractionProgress) => extractionSteps.map((id) => getExtractionStep(progress, id, id));
const statuses = (progress: ExtractionProgress) => steps(progress).map((step) => step.status);
const hydrate = () => reportExtractionProgress(startExtractionAttempt(), { step: 'preparing', status: 'completed' });
const readyChild = () =>
  reportExtractionProgress(reportExtractionProgress(hydrate(), { step: 'validating-child', status: 'completed' }), {
    step: 'creating-child',
    status: 'completed',
  });

describe('three extraction milestones', () => {
  it('starts with exactly three neutral steps with no status', () => {
    expect(steps(initialExtractionProgress())).toEqual([
      { id: 'preparing', label: 'preparing' },
      { id: 'creating-child', label: 'creating-child' },
      { id: 'updating-parent', label: 'updating-parent' },
    ]);
  });

  it('keeps hydration and host validation in the same active preparation milestone', () => {
    expect(statuses(startExtractionAttempt())).toEqual(['in-progress', undefined, undefined]);
    expect(statuses(hydrate())).toEqual(['in-progress', undefined, undefined]);
    const validating = reportExtractionProgress(hydrate(), { step: 'validating-child', status: 'in-progress' });
    expect(statuses(validating)).toEqual(['in-progress', undefined, undefined]);
    const validated = reportExtractionProgress(validating, { step: 'validating-child', status: 'completed' });
    expect(statuses(validated)).toEqual(['success', undefined, undefined]);
  });

  it('completes preparation when a legacy host advances to creation and confirms all milestones only on full success', () => {
    const creating = reportExtractionProgress(hydrate(), { step: 'creating-child', status: 'in-progress' });
    expect(statuses(creating)).toEqual(['success', 'in-progress', undefined]);
    expect(statuses(settleExtractionProgress(hydrate(), { status: 'completed', child }))).toEqual(['success', 'success', 'success']);
  });

  it.each(['preparing', 'validating-child'] as const)('attaches %s errors to preparation', (phase) => {
    const active = reportExtractionProgress(startExtractionAttempt(), { step: phase, status: 'in-progress' });
    const failed = settleExtractionProgress(active, undefined, 'Validation details');
    expect(statuses(failed)).toEqual(['error', undefined, undefined]);
    expect(steps(failed)[0]).toMatchObject({ error: 'Validation details' });
  });

  it.each(['child-created', 'source-saved'] as const)('does not infer callable child readiness from %s', (status) => {
    const creating = reportExtractionProgress(hydrate(), { step: 'creating-child', status: 'in-progress' });
    const failed = settleExtractionProgress(creating, { status, child, message: 'Child readiness is unconfirmed; reload.' });
    expect(statuses(failed)).toEqual(['success', 'error', status === 'source-saved' ? 'error' : undefined]);
    expect(steps(failed)[1]).toMatchObject({ error: 'Child readiness is unconfirmed; reload.' });
    expect(failed.phases['saving-source']).toBe(status === 'source-saved' ? 'completed' : 'pending');
  });

  it('retains confirmed child success and shows the source conflict in the parent milestone', () => {
    const saving = reportExtractionProgress(readyChild(), { step: 'saving-source', status: 'in-progress' });
    const failed = settleExtractionProgress(saving, { status: 'child-created', child, message: 'Source conflict; reload.' });
    expect(statuses(failed)).toEqual(['success', 'success', 'error']);
    expect(steps(failed)[2]).toMatchObject({ error: 'Source conflict; reload.' });
  });

  it('keeps parent update active across durable save, apply, and required finalization', () => {
    let progress = reportExtractionProgress(readyChild(), { step: 'saving-source', status: 'in-progress' });
    expect(statuses(progress)).toEqual(['success', 'success', 'in-progress']);
    for (const notification of [
      { step: 'saving-source', status: 'completed' },
      { step: 'applying-source', status: 'in-progress' },
      { step: 'applying-source', status: 'completed' },
    ] as const) {
      progress = reportExtractionProgress(progress, notification);
      expect(statuses(progress)).toEqual(['success', 'success', 'in-progress']);
    }
    expect(statuses(settleExtractionProgress(progress, { status: 'completed', child }))).toEqual(['success', 'success', 'success']);
  });

  it.each(['in-progress', 'completed'] as const)('does not hide apply/finalization errors after apply is %s', (status) => {
    const applying = reportExtractionProgress(readyChild(), { step: 'applying-source', status });
    const failed = settleExtractionProgress(applying, { status: 'source-saved', child, message: 'Reload required after cleanup.' });
    expect(statuses(failed)).toEqual(['success', 'success', 'error']);
    expect(steps(failed)[2]).toMatchObject({ error: 'Reload required after cleanup.' });
  });

  it('does not infer host validation success from an older host exception after hydration', () => {
    expect(statuses(settleExtractionProgress(hydrate(), undefined, 'Unknown write; reload.'))).toEqual(['error', undefined, undefined]);
  });

  it('does not invent successful preparation or child readiness from partial older-host results', () => {
    const failed = settleExtractionProgress(hydrate(), { status: 'source-saved', child, message: 'Child readiness is unknown; reload.' });
    expect(statuses(failed)).toEqual(['error', 'error', 'error']);
    expect(failed.phases['saving-source']).toBe('completed');
  });

  it('preserves readiness on retry but re-enters real revalidation and never preserves its stale success', () => {
    const failed = settleExtractionProgress(readyChild(), { status: 'child-created', child, message: 'Parent conflict' });
    let retry = startExtractionAttempt(failed);
    expect(statuses(retry)).toEqual(['in-progress', 'success', undefined]);
    expect(retry.errors).toEqual({});
    retry = reportExtractionProgress(retry, { step: 'preparing', status: 'completed' });
    retry = reportExtractionProgress(retry, { step: 'creating-child', status: 'in-progress' });
    const result: WorkflowExtractionResult = { status: 'source-saved', child, message: 'Child readiness recheck failed.' };
    expect(statuses(settleExtractionProgress(retry, result))).toEqual(['success', 'error', 'error']);
  });

  it('keeps validation failure visible even when an ownership-verified retry confirms source persistence', () => {
    const previous = settleExtractionProgress(readyChild(), { status: 'child-created', child, message: 'Parent write failed.' });
    const retry = reportExtractionProgress(startExtractionAttempt(previous), { step: 'preparing', status: 'completed' });
    const validating = reportExtractionProgress(retry, { step: 'validating-child', status: 'in-progress' });
    const failed = settleExtractionProgress(validating, { status: 'source-saved', child, message: 'Retry validation failed.' });
    expect(statuses(failed)).toEqual(['error', 'error', 'error']);
    expect(failed.phases['saving-source']).toBe('completed');
    expect(steps(failed)[0]).toMatchObject({ error: 'Retry validation failed.' });
  });

  it.each([false, true])('separates retained success from retry validation evidence when validation starts = %s', (reportsValidation) => {
    const previous = settleExtractionProgress(readyChild(), { status: 'child-created', child, message: 'Parent conflict.' });
    let retry = reportExtractionProgress(startExtractionAttempt(previous), { step: 'preparing', status: 'completed' });
    expect(statuses(retry)).toEqual(['in-progress', 'success', undefined]);
    expect(retry.attemptPhases['validating-child']).toBe('pending');
    if (reportsValidation) {
      retry = reportExtractionProgress(retry, { step: 'validating-child', status: 'in-progress' });
    }
    const failed = settleExtractionProgress(retry, undefined, 'Child revalidation failed; reload.');
    expect(statuses(failed)).toEqual(['error', 'error', undefined]);
    expect(steps(failed)[0]).toMatchObject({ error: 'Child revalidation failed; reload.' });
    expect(steps(failed)[1]).toMatchObject({ error: 'Child revalidation failed; reload.' });
  });
});
