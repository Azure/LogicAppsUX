import type { NodeLineState } from '@microsoft/designer-ui-v2';
import type { NodeLineArrowDirection } from '@microsoft/designer-ui-v2/metrics';
import { Position } from '@xyflow/react';

/**
 * Verified run evidence for a single edge. Produced only by interpreting the run payload
 * (for example, which Switch case or Condition branch actually executed) for one specific
 * run and iteration. It is intentionally not derived from downstream node status.
 */
export interface EdgeRunEvidence {
  state: 'taken' | 'notTaken' | 'running';
  runId: string;
  iterationKey: string;
}

export interface EdgeRunSelection {
  runId: string;
  iterationKey: string;
}

/**
 * Maps edge run evidence to the shared NodeLine state for the currently selected run/iteration.
 *
 * Why evidence-only: a downstream node being Skipped or Succeeded does not prove which branch
 * the engine took (run-after, nested scopes, and repetitions all break that inference). Emphasizing
 * the wrong branch is worse than showing none, so anything other than evidence that matches the
 * current selection falls back to 'default'. Stale evidence from a previous run or another loop
 * iteration is treated as absent rather than reused.
 * Wiring is a tracked follow-up: no branch-taken evidence producer currently feeds this mapper.
 * Selection highlighting remains independent and must not be used as run evidence.
 */
export const deriveSharedEdgeRunState = (evidence: EdgeRunEvidence | undefined, selection: EdgeRunSelection): NodeLineState => {
  if (!evidence) {
    return 'default';
  }
  if (evidence.runId !== selection.runId || evidence.iterationKey !== selection.iterationKey) {
    return 'default';
  }
  return evidence.state;
};

/** Shared inline arrow geometry is not marker-based, so target-side mapping stays explicit and local. */
export const getSharedEdgeArrowDirection = (targetPosition: Position | undefined): NodeLineArrowDirection => {
  switch (targetPosition) {
    case Position.Top:
      return 'down';
    case Position.Bottom:
      return 'up';
    case Position.Right:
      return 'left';
    case Position.Left:
    default:
      return 'right';
  }
};
