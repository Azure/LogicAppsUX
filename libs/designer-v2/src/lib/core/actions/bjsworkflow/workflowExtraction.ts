import type { Workflow } from '../../../common/models/workflow';
import type {
  WorkflowExtractionPlan,
  WorkflowExtractionRequest,
  WorkflowExtractionResult,
  WorkflowExtractionService,
} from '../../../common/models/workflowExtraction';
import { Deserialize } from '../../parsers/BJSWorkflow/BJSDeserializer';
import { initializeGraphState } from '../../parsers/ParseReduxAction';
import { initializeConnectionReferences } from '../../state/connection/connectionSlice';
import { setWorkflowExtractionBusy } from '../../state/designerView/designerViewSlice';
import { resetWorkflowState, setStateAfterUndoRedo } from '../../state/global';
import { initializeNotes } from '../../state/notes/notesSlice';
import { DynamicLoadStatus, ErrorLevel } from '../../state/operation/operationMetadataSlice';
import { setNodeSelection } from '../../state/panel/panelSlice';
import { initializeStaticResultProperties } from '../../state/staticresultschema/staticresultsSlice';
import { saveStateToHistory } from '../../state/undoRedo/undoRedoSlice';
import { initWorkflowSpec, setIsWorkflowDirty, setWorkflowKind } from '../../state/workflow/workflowSlice';
import { createDesignerStore, type AppStore, type RootState } from '../../store';
import { getCompressedSlicesFromRootState } from '../../utils/undoredo';
import { getTopLevelSelectedNodes } from '../../utils/multiselect';
import { parseWorkflowKind } from '../../utils/workflow';
import { getConnectionsApiAndMapping } from './connections';
import { updateWorkflowParameters } from './initialize';
import { initializeDynamicDataInNodes, initializeOperationMetadata } from './operationdeserializer';
import { serializeWorkflow } from './serializer';
import { getIntl } from '@microsoft/logic-apps-shared';

export const workflowExtractionFingerprint = (workflow: Workflow): string => JSON.stringify(workflow);

/**
 * Prepare against the current services, but never publish intermediate Redux state.
 * Unlike initializeGraphState's background load, every metadata stage is awaited.
 */
export async function prepareExtractedWorkflow(snapshot: RootState, workflow: Workflow): Promise<RootState> {
  const isolated = createDesignerStore({ ...snapshot, designerView: { ...snapshot.designerView, workflowExtractionBusy: false } });
  isolated.dispatch(resetWorkflowState());
  isolated.dispatch(initWorkflowSpec('BJS'));
  isolated.dispatch(setWorkflowKind(parseWorkflowKind(workflow.kind)));
  const deserializedWorkflow = Deserialize(workflow.definition, null, true, workflow.kind);
  isolated.dispatch(
    initializeGraphState.fulfilled({ deserializedWorkflow, originalDefinition: workflow.definition }, 'workflow-extraction', {
      workflowDefinition: workflow,
      runInstance: null,
    })
  );
  isolated.dispatch(initializeConnectionReferences(workflow.connectionReferences));
  isolated.dispatch(initializeStaticResultProperties(deserializedWorkflow.staticResults ?? {}));
  isolated.dispatch(initializeNotes(workflow.notes ?? {}));
  updateWorkflowParameters(workflow.parameters ?? {}, isolated.dispatch);
  await initializeOperationMetadata(
    deserializedWorkflow,
    workflow.connectionReferences,
    workflow.parameters ?? {},
    {},
    parseWorkflowKind(workflow.kind),
    isolated.dispatch
  );
  await getConnectionsApiAndMapping(deserializedWorkflow, isolated.dispatch);
  await initializeDynamicDataInNodes(isolated.getState, isolated.dispatch);
  const prepared = isolated.getState();
  for (const id of Object.keys(deserializedWorkflow.actionData)) {
    const errors = prepared.operations.errors[id];
    if (
      !prepared.operations.operationInfo[id] ||
      errors?.[ErrorLevel.Critical] ||
      errors?.[ErrorLevel.Connection] ||
      errors?.[ErrorLevel.DynamicInputs] ||
      errors?.[ErrorLevel.DynamicOutputs] ||
      prepared.operations.inputParameters[id]?.dynamicLoadStatus === DynamicLoadStatus.FAILED ||
      prepared.operations.outputParameters[id]?.dynamicLoadStatus === DynamicLoadStatus.FAILED
    ) {
      throw new Error(
        getIntl().formatMessage(
          {
            defaultMessage: 'Could not load the extracted workflow operation {id}. No source changes were applied.',
            id: 'workflowExtraction.operationLoadFailed',
            description: 'Extraction operation metadata preparation failure',
          },
          { id }
        )
      );
    }
  }
  await serializeWorkflow(prepared);
  return prepared;
}

export async function commitWorkflowExtraction(
  liveStore: AppStore,
  service: WorkflowExtractionService,
  request: WorkflowExtractionRequest,
  onStage: (stage: 'preparing' | 'saving' | 'refreshing') => void
): Promise<WorkflowExtractionResult> {
  const snapshot = liveStore.getState();
  const intl = getIntl();
  if (snapshot.designerView.workflowExtractionBusy || snapshot.designerOptions.readOnly || snapshot.designerOptions.isMonitoringView) {
    throw new Error(
      intl.formatMessage({
        id: 'NVB50O',
        defaultMessage: 'The designer is not available for extraction.',
        description: 'Extraction editability guard',
      })
    );
  }
  if (!snapshot.operations.loadStatus.nodesAndDynamicDataInitialized) {
    throw new Error(
      intl.formatMessage({
        defaultMessage: 'Wait for the workflow to finish loading before extracting.',
        id: 'sif2R5',
        description: 'Extraction readiness guard',
      })
    );
  }
  liveStore.dispatch(setWorkflowExtractionBusy(true));
  let release: (() => void) | undefined;
  let result: WorkflowExtractionResult | undefined;
  let failure: unknown;
  try {
    const current = await serializeWorkflow(snapshot);
    if (workflowExtractionFingerprint(current) !== request.sourceFingerprint) {
      throw new Error(
        intl.formatMessage({
          defaultMessage: 'The workflow changed. Cancel and review a new extraction preview.',
          id: 'ZHkvEu',
          description: 'Extraction stale preview guard',
        })
      );
    }
    onStage('preparing');
    release = service.prepare?.(request.plan);
    await prepareExtractedWorkflow(snapshot, request.plan.child);
    const prepared = await prepareExtractedWorkflow(snapshot, request.plan.source);
    const historyLimit = snapshot.designerOptions.hostOptions.maxStateHistorySize ?? 20;
    const history =
      historyLimit > 0
        ? getCompressedSlicesFromRootState({ ...snapshot, workflow: { ...snapshot.workflow, isDirty: true } }, true)
        : undefined;
    onStage('saving');
    result = await service.commit(request);
    if (result.status === 'completed') {
      try {
        onStage('refreshing');
        // A single Redux action swaps every authoring slice. The host has durably saved
        // the definitions; no remaining async initialization targets the live store.
        liveStore.dispatch({ ...setStateAfterUndoRedo(prepared), meta: { workflowExtraction: true } });
        if (history) {
          liveStore.dispatch({
            ...saveStateToHistory({ stateHistoryItem: { compressedSlices: history }, limit: historyLimit }),
            meta: { workflowExtraction: true },
          });
        }
        liveStore.dispatch({ ...setIsWorkflowDirty(false), meta: { workflowExtraction: true } });
        liveStore.dispatch({ ...setNodeSelection([request.plan.invocationId]), meta: { workflowExtraction: true } });
        service.onApplied?.(request.plan.source);
      } catch (cause) {
        result = {
          status: 'source-saved',
          child: result.child,
          message: intl.formatMessage(
            {
              id: 'PZIZAb',
              defaultMessage:
                'Both workflows were saved, but the designer could not refresh. Reload the source before editing. Details: {details}',
              description: 'Extraction persisted successfully but the local editor could not update',
            },
            { details: cause instanceof Error ? cause.message : String(cause) }
          ),
        };
      }
    }
  } catch (cause) {
    failure = cause;
  } finally {
    try {
      release?.();
    } catch (cause) {
      const cleanupMessage = intl.formatMessage(
        {
          id: 'w8ZizT',
          defaultMessage: 'Temporary extraction metadata could not be released. Reload the source before editing. Details: {details}',
          description: 'Extraction metadata cleanup failure',
        },
        { details: cause instanceof Error ? cause.message : String(cause) }
      );
      if (result) {
        result =
          result.status === 'completed'
            ? {
                status: 'source-saved',
                child: result.child,
                message: intl.formatMessage(
                  {
                    id: 'KZN5oW',
                    defaultMessage: 'Both workflows were saved. {cleanup}',
                    description: 'Durable extraction result with a metadata cleanup failure',
                  },
                  { cleanup: cleanupMessage }
                ),
              }
            : { ...result, message: `${result.message} ${cleanupMessage}` };
      } else {
        failure = new Error(`${failure instanceof Error ? failure.message : String(failure)} ${cleanupMessage}`);
      }
    } finally {
      liveStore.dispatch(setWorkflowExtractionBusy(false));
    }
  }
  if (result) {
    return result;
  }
  throw failure;
}

export const getExtractionSelectedIds = (state: RootState): string[] =>
  getTopLevelSelectedNodes(state.workflow, state.panel.operationContent.selectedNodeIds ?? []).map(
    (id) => state.workflow.idReplacements[id] ?? id
  );

export type { WorkflowExtractionPlan };
