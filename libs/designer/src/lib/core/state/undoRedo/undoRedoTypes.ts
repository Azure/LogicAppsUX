import { updateNodeConnection } from '../../actions/bjsworkflow/connections';
import type { RootState } from '../../store';
import {
  addEdgeFromRunAfter,
  addImplicitForeachNode,
  addNode,
  addSwitchCase,
  deleteNode,
  deleteSwitchCase,
  moveNode,
  pasteNode,
  pasteScopeNode,
  removeEdgeFromRunAfter,
  updateRunAfter,
} from '../workflow/workflowSlice';

export interface StateHistory {
  past: string[];
  future: string[];
}

// Omitted slices: designerView, designerOptions, dev, undoRedo
export type UndoRedoPartialRootState = Pick<
  RootState,
  | 'connections'
  | 'customCode'
  | 'operations'
  | 'panel'
  | 'panel'
  | 'settings'
  | 'staticResults'
  | 'tokens'
  | 'workflow'
  | 'workflowParameters'
>;

export const undoableActionTypes = [
  addNode,
  moveNode,
  deleteNode,
  addSwitchCase,
  deleteSwitchCase,
  addImplicitForeachNode,
  pasteNode,
  pasteScopeNode,
  updateRunAfter,
  removeEdgeFromRunAfter,
  addEdgeFromRunAfter,
  updateNodeConnection.fulfilled,
  /*
   * TODO: Following actions to be added after bug fixes for:
   * 1. Parameters panel is not re-rendering on undo/redo click
   * 2. State history should be saved only when there is a change in state (clicking in/out of parameter is triggering save)
   *
   * Actions list:
   * replaceId, // renaming action, bug #1
   * setNodeDescription, // 'add a note', bug #2
   * updateNodeSettings, // settings tab, bug #2
   * updateStaticResults, // static result testing tab, bug #1
   * updateNodeParameters // parameters in panel, bug #1, #2
   */
].map((action) => action.type);
