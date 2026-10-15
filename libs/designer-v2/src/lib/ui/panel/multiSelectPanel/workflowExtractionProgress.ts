import type { ProgressStepperStep } from '@microsoft/designer-ui';
import type { WorkflowExtractionResult } from '../../../common/models/workflowExtraction';
import type { WorkflowExtractionExecutionProgress } from '../../../core/actions/bjsworkflow/workflowExtraction';

export const extractionSteps = ['preparing', 'creating-child', 'updating-parent'] as const;
type ExtractionStep = (typeof extractionSteps)[number];
type ExtractionPhase = WorkflowExtractionExecutionProgress['step'];
type PhaseStatus = 'pending' | WorkflowExtractionExecutionProgress['status'];

export interface ExtractionProgress {
  phases: Record<ExtractionPhase, PhaseStatus>;
  activePhase: ExtractionPhase;
  childReadyThisAttempt: boolean;
  errors: Partial<Record<ExtractionStep, string>>;
  settled: boolean;
}

export const initialExtractionProgress = (): ExtractionProgress => ({
  phases: {
    preparing: 'pending',
    'validating-child': 'pending',
    'creating-child': 'pending',
    'saving-source': 'pending',
    'applying-source': 'pending',
  },
  activePhase: 'preparing',
  childReadyThisAttempt: false,
  errors: {},
  settled: false,
});

export const startExtractionAttempt = (previous?: ExtractionProgress): ExtractionProgress => ({
  ...initialExtractionProgress(),
  phases: {
    ...initialExtractionProgress().phases,
    ...Object.fromEntries(Object.entries(previous?.phases ?? {}).filter(([, status]) => status === 'completed')),
    preparing: 'in-progress',
  },
});

export const reportExtractionProgress = (
  previous: ExtractionProgress,
  progress: WorkflowExtractionExecutionProgress
): ExtractionProgress => ({
  ...previous,
  phases: { ...previous.phases, [progress.step]: progress.status },
  activePhase: progress.step,
  childReadyThisAttempt: progress.step === 'creating-child' ? progress.status === 'completed' : previous.childReadyThisAttempt,
});

export const settleExtractionProgress = (
  previous: ExtractionProgress,
  result?: WorkflowExtractionResult,
  failure?: string
): ExtractionProgress => {
  const next = { ...previous, phases: { ...previous.phases }, errors: { ...previous.errors }, settled: true };
  if (result?.status === 'completed') {
    next.errors = {};
    next.childReadyThisAttempt = true;
    for (const phase of Object.keys(next.phases) as ExtractionPhase[]) {
      next.phases[phase] = 'completed';
    }
    return next;
  }
  const message = result?.message ?? failure;
  if (!message) {
    throw new Error('An unsuccessful extraction must include its contextual failure message.');
  }
  if (result) {
    next.phases.preparing = 'completed';
    if (!next.childReadyThisAttempt) {
      next.errors['creating-child'] = message;
    }
    if (result.status === 'source-saved') {
      next.phases['saving-source'] = 'completed';
      // Durable persistence is not successful local application or finalization.
      next.errors['updating-parent'] = message;
    }
  }
  const validationConfirmed =
    previous.phases['validating-child'] === 'completed' ||
    previous.phases['creating-child'] !== 'pending' ||
    previous.phases['saving-source'] !== 'pending' ||
    previous.phases['applying-source'] !== 'pending';
  if (next.phases.preparing !== 'completed' || next.phases['validating-child'] === 'in-progress' || !validationConfirmed) {
    next.errors.preparing = message;
  } else if (next.childReadyThisAttempt) {
    next.errors['updating-parent'] = message;
  } else {
    next.errors['creating-child'] = message;
  }
  if (previous.activePhase === 'saving-source' || previous.activePhase === 'applying-source') {
    next.errors['updating-parent'] = message;
  }
  return next;
};

export const getExtractionStep = (progress: ExtractionProgress, id: ExtractionStep, label: string): ProgressStepperStep => {
  const error = progress.errors[id];
  if (error) {
    return { id, label, status: 'error', error };
  }
  const { phases } = progress;
  if (id === 'preparing') {
    const preparing = phases.preparing === 'in-progress' || phases['validating-child'] === 'in-progress';
    if (preparing && !progress.settled) {
      return { id, label, status: 'in-progress' };
    }
    if (phases.preparing === 'completed') {
      const hostAdvanced = phases['creating-child'] !== 'pending' || phases['saving-source'] !== 'pending';
      return {
        id,
        label,
        status: progress.settled || phases['validating-child'] === 'completed' || hostAdvanced ? 'success' : 'in-progress',
      };
    }
  } else if (id === 'creating-child') {
    if (phases['creating-child'] === 'completed') {
      return { id, label, status: 'success' };
    }
    if (phases['creating-child'] === 'in-progress' && !progress.settled) {
      return { id, label, status: 'in-progress' };
    }
  } else if (phases['applying-source'] === 'completed' && progress.settled) {
    return { id, label, status: 'success' };
  } else if ((phases['saving-source'] !== 'pending' || phases['applying-source'] !== 'pending') && !progress.settled) {
    return { id, label, status: 'in-progress' };
  }
  return { id, label };
};
