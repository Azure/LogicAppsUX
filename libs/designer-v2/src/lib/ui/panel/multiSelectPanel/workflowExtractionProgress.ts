import type { WorkflowExtractionResult } from '../../../common/models/workflowExtraction';
import type { WorkflowExtractionExecutionProgress } from '../../../core/actions/bjsworkflow/workflowExtraction';

export const extractionSteps = ['preparing', 'validating-child', 'creating-child', 'saving-source', 'applying-source'] as const;
export type ExtractionStep = (typeof extractionSteps)[number];
export type ExtractionStepStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'partial' | 'unconfirmed';
export type ExtractionProgress = Record<ExtractionStep, ExtractionStepStatus>;

export const initialExtractionProgress = (): ExtractionProgress => ({
  preparing: 'pending',
  'validating-child': 'pending',
  'creating-child': 'pending',
  'saving-source': 'pending',
  'applying-source': 'pending',
});

export const startExtractionAttempt = (previous?: ExtractionProgress): ExtractionProgress => ({
  ...initialExtractionProgress(),
  ...Object.fromEntries(Object.entries(previous ?? {}).filter(([, status]) => status === 'completed')),
  preparing: 'in-progress',
});

export const reportExtractionProgress = (
  previous: ExtractionProgress,
  progress: WorkflowExtractionExecutionProgress
): ExtractionProgress => ({ ...previous, [progress.step]: progress.status });

export const settleExtractionProgress = (previous: ExtractionProgress, result?: WorkflowExtractionResult): ExtractionProgress => {
  const next = { ...previous };
  if (result) {
    next.preparing = 'completed';
    if (result.status === 'child-created') {
      if (next['creating-child'] !== 'completed') {
        next['creating-child'] = 'partial';
      }
      if (next['saving-source'] === 'in-progress') {
        next['saving-source'] = 'failed';
      }
    } else {
      next['creating-child'] = result.status === 'completed' || next['creating-child'] === 'completed' ? 'completed' : 'partial';
      next['saving-source'] = 'completed';
      if (result.status === 'completed') {
        next['applying-source'] = 'completed';
      } else if (next['applying-source'] !== 'completed') {
        next['applying-source'] = next['applying-source'] === 'in-progress' ? 'failed' : 'unconfirmed';
      }
    }
  }
  for (const step of extractionSteps) {
    if (next[step] === 'in-progress') {
      next[step] = result?.status === 'completed' ? 'unconfirmed' : 'failed';
    } else if (next[step] === 'pending' && step !== 'applying-source' && next.preparing === 'completed') {
      next[step] = 'unconfirmed';
    }
  }
  return next;
};
