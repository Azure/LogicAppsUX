import { addWorkflowNode, createNodeWithDefaultSize, insertMiddleWorkflowEdge, setWorkflowEdge } from '../addNodeToWorkflow';
import type { WorkflowNode } from '../models/workflowNode';
import { mockGraph } from './mocks/workflowMock';

describe('edit workflow', () => {
  let graph: WorkflowNode;

  const nodeToAdd = createNodeWithDefaultSize('post_in_teams');

  beforeEach(() => {
    graph = mockGraph;
  });

  // The null coalescing operators are just to avoid linting errors, all the nodes exist in the mock

  it('adds middle workflow node', () => {
    // insert as new second node
    addWorkflowNode(nodeToAdd, graph);
    const parentNode = graph?.children?.[0].id ?? '';
    const childNode = graph?.children?.[1].id ?? '';
    setWorkflowEdge(parentNode, nodeToAdd.id, graph);

    insertMiddleWorkflowEdge(parentNode, nodeToAdd.id, childNode, graph);

    expect(graph?.edges?.find((edge) => edge.source === parentNode && edge.target === nodeToAdd.id)).toBeDefined();
    expect(graph?.edges?.find((edge) => edge.source === nodeToAdd.id && edge.target === childNode)).toBeDefined();
    // edge from parent to original child should be undefined
    expect(graph?.edges?.find((edge) => edge.source === parentNode && edge.target === childNode)).toBeUndefined();
  });

  it('adds workflow edge to insert node as last', () => {
    addWorkflowNode(nodeToAdd, graph);
    const parentNode = graph?.children?.[3].id ?? '';
    expect(!!parentNode).toBeTruthy();
    setWorkflowEdge(parentNode, nodeToAdd.id, graph);
    expect(graph?.edges?.find((edge) => edge.source === parentNode && edge.target === nodeToAdd.id)).toBeDefined();
  });
});
