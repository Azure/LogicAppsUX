/* eslint-disable @typescript-eslint/no-unused-vars */
import { UnsupportedException, UnsupportedExceptionCode } from '@designer/common/exceptions/unsupported';
import { getIntl } from '@designer/common/i18n/intl';
import { Graphs, WorkflowState } from '@designer/core/state/workflowSlice';
import { WorkflowNode } from '../models/workflowNode';
const hasMultipleTriggers = (definition: LogicAppsV2.WorkflowDefinition): boolean => {
  return definition && definition.triggers ? Object.keys(definition.triggers).length > 1 : false;
};

export const Deserialize = (definition: LogicAppsV2.WorkflowDefinition): WorkflowState => {
  throwIfMultipleTriggers(definition);

  const nodes: WorkflowNode[] = [];
  const graphs = {};
  //process Trigger
  const stateToReturn: WorkflowState = {
    rootGraph: 'root',
    graphs,
    nodes,
  };
  //callToProcessActions
  return {} as any;
};

const ConvertActionsToGraph = (
  actionList: LogicAppsV2.Actions,
  currentGraph: string,
  graphId = 'root'
): {
  nodesInGraph: string[];
  childGraphs: Graphs;
  allNodes: WorkflowNode[];
} => {
  const childGraphs = {};
  const nodes = {};
  const nodesInThisGraph: string[] = [];

  for (const [id, action] of Object.entries(actionList)) {
    nodesInThisGraph.push(id);
    
  }
  return {} as any;
};

const throwIfMultipleTriggers = (definition: LogicAppsV2.WorkflowDefinition) => {
  const intl = getIntl();
  if (hasMultipleTriggers(definition)) {
    const triggerNames = Object.keys(definition.triggers ?? []);
    throw new UnsupportedException(
      intl.formatMessage({
        defaultMessage: 'Cannot render designer due to multiple triggers in definition.',
        id: '8L+oIz',
        description:
          "This is an error message shown when a user tries to load a workflow defintion that contains Multiple entry points which isn't supported",
      }),
      UnsupportedExceptionCode.RENDER_MULTIPLE_TRIGGERS,
      {
        triggerNames,
      }
    );
  }
};
