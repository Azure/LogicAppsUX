import { addForeachToNode } from '../../../core/utils/loops';
import type { RootState } from '../../store';
import { updateParameterAndDependencies } from '../../utils/parameters/helper';
import { updateStaticResults } from '../operation/operationMetadataSlice';
import {
  addAgentTool,
  addEdgeFromRunAfter,
  addNode,
  addSwitchCase,
  moveNode,
  pasteNode,
  pasteScopeNode,
  removeEdgeFromRunAfter,
  replaceId,
  updateRunAfter,
} from '../workflow/workflowSlice';

export interface StateHistory {
  past: StateHistoryItem[];
  future: StateHistoryItem[];
  // Toggle whenever undo/redo is clicked. This is needed to re-render parameter panel on undo/redo
  undoRedoClickToggle: number;
  // On undo/redo, we don't want to lose track of what the edited panel was for past/future state when we change the current state
  currentEditedPanelTab?: string;
  currentEditedPanelNode?: string;
}

export interface StateHistoryItem {
  compressedState: Uint8Array;
  // Track which panel triggered the state save to set it back on undo/redo to show users where the change was.
  editedPanelTab?: string;
  editedPanelNode?: string;
}

// Omitted slices: designerView, designerOptions, dev, undoRedo
export type UndoRedoPartialRootState = Pick<
  RootState,
  'connections' | 'customCode' | 'operations' | 'panel' | 'settings' | 'staticResults' | 'tokens' | 'workflow' | 'workflowParameters'
>;

export const undoableWorkflowActionTypes = [
  addNode,
  moveNode,
  addSwitchCase,
  addAgentTool,
  addForeachToNode.pending,
  pasteNode,
  pasteScopeNode,
  updateRunAfter,
  removeEdgeFromRunAfter,
  addEdgeFromRunAfter,
  /**
   * Following operations trigger state save outside of middleware:
   * 1. Delete node operations are tracked through DeleteModal since there are different delete actions for different node types
   * 2. updateParameterConditionalVisibility is tracked through settingsection to avoid storing multiple states on hide/show all
   */
].map((action) => action.type);

export const undoablePanelActionTypes = [
  replaceId,
  updateParameterAndDependencies.pending,
  updateStaticResults,
  /*
   * The following two actions are not triggering state saves since they are dispatched for each keystroke for text input
   * updateNodeSettings // Settings tab - settings text field dispatches updateNodeSettings on change (i.e. on each keystroke)
   * setNodeDescription, // Add a description - onCommentChange in nodeDetailsPanel
   */
].map((action) => action.type);

export const undoableActionTypes = undoableWorkflowActionTypes.concat(undoablePanelActionTypes);
