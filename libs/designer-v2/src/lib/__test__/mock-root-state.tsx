import { RootState } from '../core';
import { initialConnectionsState } from '../core/state/connection/connectionSlice';
import { initialState as initialCustomCodeState } from '../core/state/customcode/customcodeSlice';
import { initialDesignerOptionsState } from '../core/state/designerOptions/designerOptionsSlice';
import { initialState as initialDesignerViewState } from '../core/state/designerView/designerViewSlice';
import { initialState as initialOperationsState } from '../core/state/operation/operationMetadataSlice';
import { initialState as initialPanelState } from '../core/state/panel/panelSlice';
import { initialState as initialSettingsState } from '../core/state/setting/settingSlice';
import { initialState as initialStaticResultsState } from '../core/state/staticresultschema/staticresultsSlice';
import { initialState as initialTokensState } from '../core/state/tokens/tokensSlice';
import { initialState as initialUndoRedoState } from '../core/state/undoRedo/undoRedoSlice';
import { UndoRedoPartialRootState } from '../core/state/undoRedo/undoRedoTypes';
import { initialWorkflowState } from '../core/state/workflow/workflowSlice';
import { initialState as initialWorkflowParametersState } from '../core/state/workflowparameters/workflowparametersSlice';

export const getMockedInitialRootState = (): RootState => {
  return {
    connections: initialConnectionsState,
    customCode: initialCustomCodeState,
    operations: initialOperationsState,
    panel: initialPanelState,
    settings: initialSettingsState,
    staticResults: initialStaticResultsState,
    tokens: initialTokensState,
    workflow: initialWorkflowState,
    workflowParameters: initialWorkflowParametersState,
    designerOptions: initialDesignerOptionsState,
    designerView: initialDesignerViewState,
    undoRedo: initialUndoRedoState,
  };
};

export const getMockedUndoRedoPartialRootState = (): UndoRedoPartialRootState => {
  return {
    connections: initialConnectionsState,
    customCode: initialCustomCodeState,
    operations: initialOperationsState,
    panel: initialPanelState,
    settings: initialSettingsState,
    staticResults: initialStaticResultsState,
    tokens: initialTokensState,
    workflow: initialWorkflowState,
    workflowParameters: initialWorkflowParametersState,
  };
};
