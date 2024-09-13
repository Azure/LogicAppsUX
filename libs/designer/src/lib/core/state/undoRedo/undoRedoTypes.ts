import { addForeachToNode } from '../../../core/utils/loops';
import type { RootState } from '../../store';
import { updateParameterAndDependencies } from '../../utils/parameters/helper';
import { updateStaticResults } from '../operation/operationMetadataSlice';
import {
  addEdgeFromRunAfter,
  addNode,
  addSwitchCase,
  deleteNode,
  deleteSwitchCase,
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
  stateHistoryItemIndex: number;
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
  | 'connections'
  | 'customCode'
  | 'operations'
  | 'panel'
  | 'panelV2'
  | 'settings'
  | 'staticResults'
  | 'tokens'
  | 'workflow'
  | 'workflowParameters'
>;

export const undoableWorkflowActionTypes = [
  addNode,
  moveNode,
  deleteNode,
  addSwitchCase,
  deleteSwitchCase,
  addForeachToNode.pending,
  pasteNode,
  pasteScopeNode,
  updateRunAfter,
  removeEdgeFromRunAfter,
  addEdgeFromRunAfter,
].map((action) => action.type);

export const undoablePanelActionTypes = [
  replaceId,
  updateParameterAndDependencies.pending,
  updateStaticResults,
  /*
   * The following two actions are not triggering state saves since they are dispatched for each keystroke for text input
   * updateNodeSettings // Settings tab - settings text field dispatches updateNodeSettings on change (i.e. on each keystroke)
   * setNodeDescription, // Add a note - onCommentChange in nodeDetailsPanel
   */
].map((action) => action.type);

export const undoableActionTypes = undoableWorkflowActionTypes.concat(undoablePanelActionTypes);
