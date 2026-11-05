import type { ProgressStepperStep } from '@microsoft/designer-ui';
import type { WorkflowExtractionResult } from '../../../common/models/workflowExtraction';
import type { WorkflowExtractionExecutionProgress } from '../../../core/actions/bjsworkflow/workflowExtraction';

export const extractionSteps = ['preparing', 'creating-child', 'updating-parent'] as const;
type ExtractionStep = (typeof extractionSteps)[number];
type ExtractionPhase = WorkflowExtractionExecutionProgress['step'];
type PhaseStatus = 'pending' | WorkflowExtractionExecutionProgress['status'];

export interface ExtractionProgress {
  phases: Record<ExtractionPhase, PhaseStatus>;
  attemptPhases: Record<ExtractionPhase, PhaseStatus>;
  activePhase: ExtractionPhase;
  errors: Partial<Record<ExtractionStep, string>>;
  settled: boolean;
}

const pendingPhases = (): Record<ExtractionPhase, PhaseStatus> => ({
  preparing: 'pending',
  'validating-child': 'pending',
  'creating-child': 'pending',
  'saving-source': 'pending',
  'applying-source': 'pending',
});

export const initialExtractionProgress = (): ExtractionProgress => ({
  phases: pendingPhases(),
  attemptPhases: pendingPhases(),
  activePhase: 'preparing',
  errors: {},
  settled: false,
});

export const startExtractionAttempt = (previous?: ExtractionProgress): ExtractionProgress => ({
  ...initialExtractionProgress(),
  phases: {
    ...pendingPhases(),
    ...Object.fromEntries(Object.entries(previous?.phases ?? {}).filter(([, status]) => status === 'completed')),
    preparing: 'in-progress',
  },
  attemptPhases: { ...pendingPhases(), preparing: 'in-progress' },
});

export const reportExtractionProgress = (
  previous: ExtractionProgress,
  progress: WorkflowExtractionExecutionProgress
): ExtractionProgress => ({
  ...previous,
  phases: { ...previous.phases, [progress.step]: progress.status },
  attemptPhases: { ...previous.attemptPhases, [progress.step]: progress.status },
  activePhase: progress.step,
});

export const settleExtractionProgress = (
  previous: ExtractionProgress,
  result?: WorkflowExtractionResult,
  failure?: string
): ExtractionProgress => {
  const next = {
    ...previous,
    phases: { ...previous.phases },
    attemptPhases: { ...previous.attemptPhases },
    errors: { ...previous.errors },
    settled: true,
  };
  if (result?.status === 'completed') {
    next.errors = {};
    for (const phase of Object.keys(next.phases) as ExtractionPhase[]) {
      next.phases[phase] = 'completed';
      next.attemptPhases[phase] = 'completed';
    }
    return next;
  }
  const message = result?.message ?? failure;
  if (!message) {
    throw new Error('An unsuccessful extraction must include its contextual failure message.');
  }
  const childReadyThisAttempt = previous.attemptPhases['creating-child'] === 'completed';
  if (result) {
    next.phases.preparing = 'completed';
    next.attemptPhases.preparing = 'completed';
    if (result.status === 'source-saved') {
      next.phases['saving-source'] = 'completed';
      next.attemptPhases['saving-source'] = 'completed';
      // Durable persistence is not successful local application or finalization.
      next.errors['updating-parent'] = message;
    }
  }
  if (
    !childReadyThisAttempt &&
    (result || (previous.attemptPhases.preparing === 'completed' && previous.phases['creating-child'] !== 'pending'))
  ) {
    next.errors['creating-child'] = message;
  }
  const validationConfirmed =
    previous.attemptPhases['validating-child'] === 'completed' ||
    previous.attemptPhases['creating-child'] !== 'pending' ||
    previous.attemptPhases['saving-source'] !== 'pending' ||
    previous.attemptPhases['applying-source'] !== 'pending';
  if (next.attemptPhases.preparing !== 'completed' || next.attemptPhases['validating-child'] === 'in-progress' || !validationConfirmed) {
    next.errors.preparing = message;
  } else if (childReadyThisAttempt) {
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
  const { phases, attemptPhases } = progress;
  if (id === 'preparing') {
    const preparing = attemptPhases.preparing === 'in-progress' || attemptPhases['validating-child'] === 'in-progress';
    if (preparing && !progress.settled) {
      return { id, label, status: 'in-progress' };
    }
    if (attemptPhases.preparing === 'completed') {
      const hostAdvanced = attemptPhases['creating-child'] !== 'pending' || attemptPhases['saving-source'] !== 'pending';
      return {
        id,
        label,
        status: progress.settled || attemptPhases['validating-child'] === 'completed' || hostAdvanced ? 'success' : 'in-progress',
      };
    }
  } else if (id === 'creating-child') {
    if (phases['creating-child'] === 'completed') {
      return { id, label, status: 'success' };
    }
    if (phases['creating-child'] === 'in-progress' && !progress.settled) {
      return { id, label, status: 'in-progress' };
    }
  } else if (attemptPhases['applying-source'] === 'completed' && progress.settled) {
    return { id, label, status: 'success' };
  } else if ((attemptPhases['saving-source'] !== 'pending' || attemptPhases['applying-source'] !== 'pending') && !progress.settled) {
    return { id, label, status: 'in-progress' };
  }
  return { id, label };
};
