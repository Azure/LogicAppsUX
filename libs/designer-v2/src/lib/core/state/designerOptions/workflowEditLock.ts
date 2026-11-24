import type { RootState } from '../../store';

// A host can open a run without separately setting the readOnly option.
export const isWorkflowEditLocked = ({ readOnly, isMonitoringView }: RootState['designerOptions']): boolean =>
  Boolean(readOnly || isMonitoringView);
