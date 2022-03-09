export const InitializeOperationMetadata = (
  operations: LogicAppsV2.Actions
): { graph: WorkflowGraph; actionData: Actions; nodesMetadata: NodesMetadata } => {
  throwIfMultipleTriggers(definition);

  //process Trigger
  let triggerNode: WorkflowNode | null = null;
  let allActions: Actions = {};
  let nodesMetadata: NodesMetadata = {};
  if (definition.triggers && !isNullOrEmpty(definition.triggers)) {
    const [[tID, trigger]] = Object.entries(definition.triggers);
    triggerNode = {
      id: tID,
      height: 0,
      width: 0,
    };
    allActions[tID] = { ...trigger };
    nodesMetadata[tID] = { graphId: 'root' };
  }

  const children = [];
  const rootEdges: WorkflowEdge[] = [];
  if (triggerNode) {
    children.push(triggerNode);
  }

  if (definition.actions) {
    const entries = Object.entries(definition.actions);
    const parentlessChildren = entries.filter(([, value]) => isNullOrEmpty(value.runAfter));
    for (const [key] of parentlessChildren) {
      rootEdges.push({
        id: `${triggerNode?.id}-${key}`,
        source: triggerNode?.id ?? '',
        target: key,
      });
    }
  }

  const [remainingChildren, edges, actions, actionNodesMetadata] = !isNullOrUndefined(definition.actions)
    ? buildGraphFromActions(definition.actions, 'root')
    : [[], [], {}];
  allActions = { ...allActions, ...actions };
  nodesMetadata = { ...nodesMetadata, ...actionNodesMetadata };
  const graph: WorkflowGraph = {
    id: 'root',
    children: [...children, ...remainingChildren],
    edges: [...rootEdges, ...edges],
  };

  return { graph, actionData: allActions, nodesMetadata };
};
