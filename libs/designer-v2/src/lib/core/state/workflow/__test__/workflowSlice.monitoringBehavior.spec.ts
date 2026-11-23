import { describe, expect, it } from 'vitest';
import { MessageLevel } from '@microsoft/designer-ui';
import type { BoundParameters, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { Deserialize } from '../../../parsers/BJSWorkflow/BJSDeserializer';
import { fetchBuiltInToolRunData, initializeInputsOutputsBinding } from '../../../actions/bjsworkflow/monitoring';
import { resetWorkflowState } from '../../global';
import { updateNodeParameters, updateNodeSettings } from '../../operation/operationMetadataSlice';
import type { WorkflowState } from '../workflowInterfaces';
import { getNodeRunData } from '../workflowSelectors';
import reducer, { initialWorkflowState, workflowSlice } from '../workflowSlice';

const actions = workflowSlice.actions;
const fixture = (): WorkflowState => {
  const parsed = Deserialize(
    {
      ...initialWorkflowState.originalDefinition,
      actions: {
        A: { type: 'Compose', inputs: 'root' },
        Loop: { type: 'Foreach', foreach: '@createArray(1)', actions: { B: { type: 'Compose', inputs: 'nested' } } },
      },
    },
    null
  );
  return { ...initialWorkflowState, graph: parsed.graph, operations: parsed.actionData, nodesMetadata: parsed.nodesMetadata };
};
const run: LogicAppsV2.WorkflowRunAction = {
  startTime: '2026-01-01T00:00:00Z',
  endTime: '2026-01-01T00:00:02Z',
  status: 'Succeeded',
  code: 'OK',
  correlation: { actionTrackingId: 'action', clientTrackingId: 'tracking' },
  inputsLink: { contentSize: 0 },
  outputsLink: { contentSize: 0 },
  retryHistory: [],
};
const boundInputs = { input: { displayName: 'Input', value: 'actual request' } };
const boundOutputs = { result: { displayName: 'Result', value: 'actual response' } };

const toolId = 'code_interpreter';
const agentToolInvocation = { agentRepetitionIdentity: 'run|Agent|000000|0|', page: 1 };
const refreshBuiltInTool = (state: WorkflowState, identity = agentToolInvocation.agentRepetitionIdentity) =>
  reducer(
    state,
    actions.updateAgenticMetadata({
      nodeId: 'Agent',
      agentRepetitionIdentity: identity,
      scopeRepetitionRunData: { tools: { [toolId]: { status: 'Failed', iterations: 3 } } },
    })
  );
const selectBuiltInTool = () =>
  reducer(
    refreshBuiltInTool({
      ...fixture(),
      runInstance: { id: 'run' } as LogicAppsV2.RunInstanceDefinition,
      nodesMetadata: { Agent: { graphId: 'root', runIndex: 0 }, [toolId]: { graphId: 'Agent' } },
    }),
    actions.setRunIndex({ nodeId: toolId, page: 1 })
  );
const builtInToolResponse = fetchBuiltInToolRunData.fulfilled(
  { ...run, toolNodeId: toolId, inputs: boundInputs, outputs: boundOutputs },
  'built-in-request',
  {
    toolNodeId: toolId,
    agentNodeId: 'Agent',
    runId: 'run',
    repetitionName: '000000',
    agentToolInvocation,
  }
);

describe('workflow monitoring and host state transitions', () => {
  it('retains the selected built-in response and bound content across an aggregate refresh', () => {
    const selected = reducer(selectBuiltInTool(), builtInToolResponse);
    const refreshed = refreshBuiltInTool(selected);
    expect(refreshed.nodesMetadata[toolId].runData).toMatchObject({
      status: 'Succeeded',
      duration: '2s',
      repetitionCount: 3,
      inputs: boundInputs,
      outputs: boundOutputs,
    });
  });

  it('ignores a built-in response after the tool page changes', () => {
    const paged = reducer(selectBuiltInTool(), actions.setRunIndex({ nodeId: toolId, page: 2 }));
    expect(reducer(paged, builtInToolResponse)).toBe(paged);
  });

  it('ignores a built-in response when the Agent changes repetition before the new aggregate arrives', () => {
    const paged = reducer(selectBuiltInTool(), actions.setRunIndex({ nodeId: 'Agent', page: 1 }));
    expect(reducer(paged, builtInToolResponse)).toBe(paged);
  });

  it.each([false, true])('applies a chat-selected built-in response (response before aggregate: %s)', (responseFirst) => {
    const selected = selectBuiltInTool();
    const nextInvocation = { agentRepetitionIdentity: 'run|Agent|000001|1|', page: 2 };
    const request = { ...builtInToolResponse.meta.arg, repetitionName: '000001', agentToolInvocation: nextInvocation };
    const moved = reducer(selected, actions.setRunIndex({ nodeId: 'Agent', page: 1 }));
    const pending = reducer(moved, fetchBuiltInToolRunData.pending('chat-request', request));
    const response = fetchBuiltInToolRunData.fulfilled(builtInToolResponse.payload, 'chat-request', request);
    const refreshed = responseFirst
      ? refreshBuiltInTool(reducer(pending, response), nextInvocation.agentRepetitionIdentity)
      : reducer(refreshBuiltInTool(pending, nextInvocation.agentRepetitionIdentity), response);
    expect(refreshed.nodesMetadata[toolId]).toMatchObject({
      runIndex: 2,
      runData: { status: 'Succeeded', repetitionCount: 3, inputs: boundInputs, outputs: boundOutputs },
    });
  });

  it.each([false, true])(
    'keeps admitted built-in details when leaving an unloaded Agent repetition (response arrived: %s)',
    (responded) => {
      const selected = reducer(selectBuiltInTool(), builtInToolResponse);
      const request = {
        ...builtInToolResponse.meta.arg,
        repetitionName: '000001',
        agentToolInvocation: { agentRepetitionIdentity: 'run|Agent|000001|1|', page: 2 },
      };
      let state = reducer(selected, actions.setRunIndex({ nodeId: 'Agent', page: 1 }));
      state = reducer(state, fetchBuiltInToolRunData.pending('chat-request', request));
      expect(getNodeRunData(state, toolId)).toBeUndefined();
      const response = fetchBuiltInToolRunData.fulfilled({ ...builtInToolResponse.payload, status: 'Failed' }, 'chat-request', request);
      if (responded) {
        state = reducer(state, response);
      }
      state = reducer(state, actions.setRunIndex({ nodeId: 'Agent', page: 0 }));
      if (!responded) {
        state = reducer(state, response);
      }
      expect(state.nodesMetadata[toolId]).toEqual(selected.nodesMetadata[toolId]);
      expect(getNodeRunData(state, toolId)).toEqual(selected.nodesMetadata[toolId].runData);
    }
  );

  it('does not inherit Agent content when a scoped built-in tool page is clamped', () => {
    const selected = reducer(selectBuiltInTool(), builtInToolResponse);
    const agentInputs = { uri: 'https://example.test/agent/inputs' };
    const agentOutputs = { uri: 'https://example.test/agent/outputs' };
    const scopeRepetitionRunData = {
      inputsLink: agentInputs,
      outputsLink: agentOutputs,
      tools: { [toolId]: { status: 'Failed', iterations: 1 } },
    };
    const refreshed = reducer(
      selected,
      actions.updateAgenticMetadata({
        nodeId: 'Agent',
        agentRepetitionIdentity: agentToolInvocation.agentRepetitionIdentity,
        scopeRepetitionRunData,
      })
    );
    const tool = refreshed.nodesMetadata[toolId];
    expect(tool.runIndex).toBe(0);
    expect(tool.runData?.status).toBe('Failed');
    expect(tool.runData?.inputsLink?.uri).toBeUndefined();
    expect(tool.runData?.outputsLink?.uri).toBeUndefined();
    expect(tool.runData?.inputs).toBeUndefined();
    expect(tool.runData?.outputs).toBeUndefined();
    const legacy = reducer(selected, actions.updateAgenticMetadata({ nodeId: 'Agent', scopeRepetitionRunData }));
    expect(legacy.nodesMetadata[toolId].runData).toMatchObject({ inputsLink: agentInputs, outputsLink: agentOutputs });
  });

  it('updates repetition selection and timing, then clears nested run data while retaining root results', () => {
    let state = fixture();
    state = reducer(state, actions.setRunIndex({ nodeId: 'B', page: 2 }));
    state = reducer(state, actions.setToolRunIndex({ nodeId: 'B', page: 3 }));
    state = reducer(state, actions.setRepetitionRunData({ nodeId: 'A', runData: run }));
    state = reducer(state, actions.setRepetitionRunData({ nodeId: 'B', runData: run }));
    state = reducer(state, actions.setTimelineRepetitionArray([['iteration-0'], ['iteration-1']]));
    state = reducer(state, actions.setTimelineRepetitionIndex(1));
    expect(state.nodesMetadata.B).toMatchObject({ runIndex: 2, toolRunIndex: 3, runData: { status: 'Succeeded', duration: '2s' } });
    expect(state.timelineRepetitionArray[state.timelineRepetitionIndex]).toEqual(['iteration-1']);
    const cleared = reducer(state, actions.clearAllRepetitionRunData());
    expect(cleared.nodesMetadata.A.runData).toEqual(state.nodesMetadata.A.runData);
    expect(cleared.nodesMetadata.B.runData).toBeUndefined();
    expect(cleared.nodesMetadata.B.runIndex).toBeUndefined();
    expect(state.nodesMetadata.B.runData).toBeDefined();
  });

  it('indexes subgraph repetition results by their service names and replaces bound input/output data', () => {
    let state = reducer(
      fixture(),
      actions.setSubgraphRunData({
        nodeId: 'Loop',
        runData: [
          {
            id: '/runs/run/actions/Loop/repetitions/iteration-0',
            name: 'iteration-0',
            type: 'Microsoft.Logic/workflows/runs/actions/repetitions',
            properties: run,
          },
        ],
      })
    );
    expect(state.nodesMetadata.Loop.subgraphRunData?.['iteration-0']).toEqual(run);
    state = reducer(state, actions.setRepetitionRunData({ nodeId: 'B', runData: run }));
    state = reducer(state, actions.setRunDataInputOutputs({ nodeId: 'B', inputs: boundInputs, outputs: boundOutputs }));
    expect(state.nodesMetadata.B.runData).toMatchObject({ ...run, inputs: boundInputs, outputs: boundOutputs });
  });

  it('retains populated built-in tool data when later binding is empty, but accepts fresh content and regular empty results', () => {
    const payload = {
      toolNodeId: 'code_interpreter',
      inputsLink: undefined,
      outputsLink: undefined,
      inputs: boundInputs,
      outputs: boundOutputs,
      startTime: run.startTime,
      endTime: run.endTime,
      status: run.status,
      correlation: run.correlation,
    };
    let state = reducer(
      fixture(),
      fetchBuiltInToolRunData.fulfilled(payload, 'tool-request', {
        toolNodeId: 'code_interpreter',
        agentNodeId: 'Agent',
        runId: 'run',
        repetitionName: 'iteration-0',
      })
    );
    const bind = (nodeId: string, inputs: BoundParameters, outputs: BoundParameters) => {
      const inputsOutputs = { nodeId, inputs, outputs };
      return initializeInputsOutputsBinding.fulfilled(inputsOutputs, 'binding-request', { nodeId, inputsOutputs });
    };
    state = reducer(state, bind('code_interpreter', {}, {}));
    expect(state.nodesMetadata.code_interpreter.runData).toMatchObject({ inputs: boundInputs, outputs: boundOutputs });
    state = reducer(state, bind('code_interpreter', { input: { displayName: 'New input', value: 'replacement' } }, {}));
    expect(state.nodesMetadata.code_interpreter.runData?.inputs).toEqual({ input: { displayName: 'New input', value: 'replacement' } });
    expect(state.nodesMetadata.code_interpreter.runData?.outputs).toEqual(boundOutputs);
    state = reducer(state, bind('A', {}, {}));
    expect(state.nodesMetadata.A.runData).toMatchObject({ inputs: {}, outputs: {} });
  });

  it('removes handoffs by tool identity or target without losing unrelated handoffs', () => {
    let state = fixture();
    for (const [toolId, targetId] of [
      ['one', 'A'],
      ['two', 'A'],
      ['other', 'Loop'],
    ]) {
      state = reducer(state, actions.addHandoffMetadata({ sourceId: 'B', toolId, targetId }));
    }
    state = reducer(state, actions.removeHandoffMetadata({ sourceId: 'B', toolId: 'one' }));
    expect(state.nodesMetadata.B.handoffs).toEqual({ two: 'A', other: 'Loop' });
    state = reducer(state, actions.removeHandoffMetadata({ sourceId: 'B', targetId: 'A' }));
    expect(state.nodesMetadata.B.handoffs).toEqual({ other: 'Loop' });
  });

  it('tracks user changes but not initialization, normalizes renamed IDs and clears replacements when restored', () => {
    let state = reducer(fixture(), updateNodeParameters({ nodeId: 'A', parameters: [], isUserAction: false }));
    state = reducer(state, updateNodeSettings({ id: 'A', settings: {}, ignoreDirty: true }));
    expect(state).toMatchObject({ isDirty: false, changeCount: 0 });
    state = reducer(state, updateNodeParameters({ nodeId: 'A', parameters: [], isUserAction: true }));
    state = reducer(state, updateNodeSettings({ id: 'A', settings: {} }));
    state = reducer(state, actions.setNodeDescription({ nodeId: 'A', description: 'Explains the operation' }));
    expect(state).toMatchObject({ isDirty: true, changeCount: 3 });
    expect(state.operations.A.description).toBe('Explains the operation');
    state = reducer(state, actions.replaceId({ originalId: 'A', newId: 'Renamed operation' }));
    expect(state.idReplacements.A).toBe('Renamed_operation');
    state = reducer(state, actions.replaceId({ originalId: 'A', newId: 'A' }));
    expect(state.idReplacements.A).toBeUndefined();
    const count = state.changeCount;
    state = reducer(state, actions.setIsWorkflowDirty(false));
    expect(state).toMatchObject({ isDirty: false, changeCount: count });
    state = reducer(state, actions.setIsWorkflowDirty(true));
    expect(state).toMatchObject({ isDirty: true, changeCount: count + 1 });
  });

  it('isolates host error levels, replaces flow errors and preserves only Copilot highlights across reset', () => {
    const warning = { nodeId: 'A', level: MessageLevel.Warning, subtitle: 'Settings', content: 'Review input' };
    const error = { nodeId: 'B', level: MessageLevel.Error, subtitle: 'Parameters', content: 'Missing value' };
    let state = reducer(fixture(), actions.setHostErrorMessages({ level: MessageLevel.Warning, errorMessages: [warning] }));
    state = reducer(state, actions.setHostErrorMessages({ level: MessageLevel.Error, errorMessages: [error] }));
    state = reducer(state, actions.setHostErrorMessages({ level: MessageLevel.Error, errorMessages: undefined }));
    expect(state.hostData.errorMessages).toEqual({ [MessageLevel.Warning]: [warning] });
    state = reducer(state, actions.setFlowErrors({ flowErrors: { A: ['invalid expression'] } }));
    expect(state.flowErrors).toEqual({ A: ['invalid expression'] });
    state = reducer(state, actions.setCopilotModifiedNodeIds(['A', 'B', 'A']));
    const reset = reducer(state, resetWorkflowState());
    expect(reset).toEqual({ ...initialWorkflowState, copilotModifiedNodeIds: { A: true, B: true } });
    expect(reducer(reset, actions.clearCopilotModifiedNodeIds()).copilotModifiedNodeIds).toEqual({});
  });
});
