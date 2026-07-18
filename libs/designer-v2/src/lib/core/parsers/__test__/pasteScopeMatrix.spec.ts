// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { pasteScopeInWorkflow } from '../pasteScopeInWorkflow';
import type { WorkflowNode } from '../models/workflowNode';
import { createWorkflowNode, createWorkflowEdge, getUpstreamNodeIds } from '../../utils/graph';
import { getAvailableVariables } from '../../utils/variables';
import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';

// End-to-end scope-correctness matrix for the pasted Set Variable dropdown.
//
// Reproduces the customer's screenshots: a Set Variable is nested inside a copied Condition or
// Scope, and that block is pasted into a Condition, a plain Scope, or a For each. The copied top
// node arrives with a placeholder parentNodeId that points at the paste target's edge-placement
// card (`<scope>-#subgraph` / `<scope>-#scope`) — NOT a nodesMetadata key. Each test drives the
// real `pasteScopeInWorkflow` reducer (which carries the fix), then resolves the nested Set
// Variable's upstream via `getUpstreamNodeIds` and the visible variables via
// `getAvailableVariables`.
//
// A separate-path `Initialize_variables_1` (varB) guards scope: it must NOT leak into targets that
// are not downstream of it, while the in-path `Initialize_variables` (varA) must always resolve.
// WITHOUT the fix the reducer keeps the card-id parentNodeId, the parent-chain walk dead-ends at
// the pasted top node, and these assertions fail.

const VAR_A = 'Initialize_variables';
const VAR_B = 'Initialize_variables_1';
const VAR_A_NAME = 'varA';
const VAR_B_NAME = 'varB';

const variablesMap = {
  [VAR_A]: [{ name: VAR_A_NAME, type: 'string' }],
  [VAR_B]: [{ name: VAR_B_NAME, type: 'string' }],
} as any;

type WrapperKind = 'condition' | 'scope';
type TargetKind = 'condition' | 'scope' | 'foreach';

interface TargetBuild {
  targetId: string;
  container: WorkflowNode;
  workflowGraph: WorkflowNode;
  graphId: string;
  parentId: string;
  targetMetadata: Record<string, any>;
}

const buildTarget = (kind: TargetKind): TargetBuild => {
  if (kind === 'condition') {
    const targetId = 'TargetCondition';
    const subgraphId = `${targetId}-elseActions`;
    const subgraphCardId = `${subgraphId}-#subgraph`;
    const subgraph: WorkflowNode = {
      id: subgraphId,
      type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
      children: [createWorkflowNode(subgraphCardId, WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE)],
      edges: [],
    } as any;
    const container: WorkflowNode = {
      id: targetId,
      type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
      children: [createWorkflowNode(`${targetId}-#scope`, WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE), subgraph],
      edges: [],
    } as any;
    return {
      targetId,
      container,
      workflowGraph: subgraph,
      graphId: subgraphId,
      parentId: subgraphCardId,
      targetMetadata: {
        [targetId]: { graphId: 'root', parentNodeId: undefined },
        [subgraphId]: { graphId: targetId, parentNodeId: targetId, subgraphType: 'CONDITIONAL_FALSE' },
      },
    };
  }

  // Plain Scope and For each are both single-flow scopes: the graph node id === the scope action
  // name, and children paste directly into that graph node's body.
  const targetId = kind === 'scope' ? 'TargetScope' : 'TargetForeach';
  const container: WorkflowNode = {
    id: targetId,
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children: [createWorkflowNode(`${targetId}-#scope`, WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE)],
    edges: [],
  } as any;
  return {
    targetId,
    container,
    workflowGraph: container,
    graphId: targetId,
    parentId: `${targetId}-#scope`,
    targetMetadata: { [targetId]: { graphId: 'root', parentNodeId: undefined } },
  };
};

interface PasteBuild {
  topId: string;
  setVarId: string;
  scopeNode: WorkflowNode;
  pasteNodesMetadata: Record<string, any>;
  operations: Record<string, any>;
}

// The pasted subtree always ends in a Set Variable nested inside a Condition or a Scope. The top
// node carries the BROKEN placeholder parentNodeId (the target's card id) exactly as copypaste
// seeds it before the reducer corrects it. Nested children carry correct parentNodeIds relative to
// the pasted top node (as buildGraphFromActions produces them).
const buildPastedSubtree = (wrapper: WrapperKind, graphId: string, brokenParentId: string): PasteBuild => {
  const setVarId = 'Pasted_SetVariable';

  if (wrapper === 'condition') {
    const topId = 'Pasted_Condition';
    const subId = `${topId}-actions`;
    const subCardId = `${subId}-#subgraph`;
    const scopeNode: WorkflowNode = {
      id: topId,
      type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
      children: [
        createWorkflowNode(`${topId}-#scope`, WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE),
        {
          id: subId,
          type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
          children: [createWorkflowNode(subCardId, WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE), createWorkflowNode(setVarId)],
          edges: [],
        } as any,
      ],
      edges: [],
    } as any;
    return {
      topId,
      setVarId,
      scopeNode,
      pasteNodesMetadata: {
        [topId]: { graphId, parentNodeId: brokenParentId, isRoot: false },
        [subId]: { graphId: topId, parentNodeId: topId, subgraphType: 'CONDITIONAL_TRUE' },
        [setVarId]: { graphId: subId, parentNodeId: topId },
      },
      operations: { [topId]: {}, [setVarId]: {} },
    };
  }

  // Scope wrapper: the copied Scope contains a Condition, and the Set Variable lives inside that
  // Condition (chain Set Variable -> Condition -> Scope -> target).
  const topId = 'Pasted_Scope';
  const innerCondId = 'Pasted_InnerCondition';
  const innerSubId = `${innerCondId}-actions`;
  const innerSubCardId = `${innerSubId}-#subgraph`;
  const scopeNode: WorkflowNode = {
    id: topId,
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children: [
      createWorkflowNode(`${topId}-#scope`, WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE),
      {
        id: innerCondId,
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        children: [
          createWorkflowNode(`${innerCondId}-#scope`, WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE),
          {
            id: innerSubId,
            type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
            children: [createWorkflowNode(innerSubCardId, WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE), createWorkflowNode(setVarId)],
            edges: [],
          } as any,
        ],
        edges: [],
      } as any,
    ],
    edges: [],
  } as any;
  return {
    topId,
    setVarId,
    scopeNode,
    pasteNodesMetadata: {
      [topId]: { graphId, parentNodeId: brokenParentId, isRoot: false },
      [innerCondId]: { graphId: topId, parentNodeId: topId },
      [innerSubId]: { graphId: innerCondId, parentNodeId: innerCondId, subgraphType: 'CONDITIONAL_TRUE' },
      [setVarId]: { graphId: innerSubId, parentNodeId: innerCondId },
    },
    operations: { [topId]: {}, [innerCondId]: {}, [setVarId]: {} },
  };
};

const resolveVariableNames = (wrapper: WrapperKind, target: TargetKind, varBInPath: boolean): string[] => {
  const targetBuild = buildTarget(target);
  const paste = buildPastedSubtree(wrapper, targetBuild.graphId, targetBuild.parentId);

  // Root graph: varA is always an ancestor of the target. varB is either sequentially in-path
  // (before the target) or on a parallel branch that never reaches the target.
  const rootEdges = varBInPath
    ? [createWorkflowEdge(VAR_A, VAR_B), createWorkflowEdge(VAR_B, targetBuild.targetId)]
    : [createWorkflowEdge(VAR_A, targetBuild.targetId), createWorkflowEdge(VAR_A, VAR_B)];

  const root: WorkflowNode = {
    id: 'root',
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children: [createWorkflowNode(VAR_A), createWorkflowNode(VAR_B), targetBuild.container],
    edges: rootEdges,
  } as any;

  const state = {
    operations: { ...paste.operations },
    nodesMetadata: {
      [VAR_A]: { graphId: 'root' },
      [VAR_B]: { graphId: 'root' },
      ...targetBuild.targetMetadata,
    },
    newlyAddedOperations: {},
  } as any;

  const relationshipIds = { graphId: targetBuild.graphId, parentId: targetBuild.parentId, childId: undefined } as any;

  pasteScopeInWorkflow(
    paste.scopeNode,
    targetBuild.workflowGraph,
    relationshipIds,
    paste.operations,
    paste.pasteNodesMetadata,
    [paste.topId, paste.setVarId],
    state,
    false
  );

  const operationMap: Record<string, string> = Object.fromEntries(
    [VAR_A, VAR_B, targetBuild.targetId, paste.topId, paste.setVarId].map((id) => [id, id])
  );

  const upstream = getUpstreamNodeIds(paste.setVarId, root, state.nodesMetadata, operationMap);
  return getAvailableVariables(variablesMap, upstream).map((variable) => variable.name as string);
};

// ---------------------------------------------------------------------------------------------
// Deep multi-level nesting (rev 9)
//
// The customer's screenshots bury the paste target many scope layers deep, e.g.
//   Scope -> Scope -> Scope -> Scope -> Condition            (pure scope chain)
//   Scope -> Condition -> For each -> Condition -> Scope -> For each -> Condition   (mixed)
// These builders nest an arbitrary chain of scope kinds (outermost first) and paste the
// Set-Variable block into the innermost layer. The in-path root Initialize Variable (varA) must
// still resolve through the whole chain, while a separate-path Initialize Variable (varB) must
// stay excluded even when it lives on a sibling branch high in the tree.
// ---------------------------------------------------------------------------------------------

interface NestedBuild {
  outerId: string;
  outerContainer: WorkflowNode;
  targetId: string;
  workflowGraph: WorkflowNode;
  graphId: string;
  parentId: string;
  nodesMetadata: Record<string, any>;
}

// Builds a nested chain of scope containers. `chain[0]` is nested directly in the root graph and
// `chain[chain.length - 1]` is the innermost paste target. When `siblingVarB` is set and the
// outermost layer is a condition, varB is dropped into that condition's opposite (TRUE) branch so
// the deep chain (in the FALSE branch) must not see it.
const buildNestedTarget = (chain: TargetKind[], siblingVarB = false): NestedBuild => {
  const meta: Record<string, any> = {};
  let outerId = '';
  let outerContainer: WorkflowNode | undefined;
  let prevInsert: WorkflowNode[] | null = null;
  // graphId / parentNodeId assigned to whatever node is placed at the current insertion point.
  let childGraphId = 'root';
  let childParentNodeId: string | undefined;
  let innermost: { targetId: string; workflowGraph: WorkflowNode; graphId: string; parentId: string } | undefined;

  chain.forEach((kind, i) => {
    const containerId = `Nest${i}`;
    const isInnermost = i === chain.length - 1;
    meta[containerId] = { graphId: childGraphId, parentNodeId: childParentNodeId };

    let container: WorkflowNode;
    let nextInsert: WorkflowNode[];
    let nextGraphId: string;
    let nextParentNodeId: string;
    let seed: { workflowGraph: WorkflowNode; graphId: string; parentId: string };

    if (kind === 'condition') {
      const subgraphId = `${containerId}-elseActions`;
      const subgraphCardId = `${subgraphId}-#subgraph`;
      const subgraph: WorkflowNode = {
        id: subgraphId,
        type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
        children: [createWorkflowNode(subgraphCardId, WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE)],
        edges: [],
      } as any;
      meta[subgraphId] = { graphId: containerId, parentNodeId: containerId, subgraphType: 'CONDITIONAL_FALSE' };
      const children: WorkflowNode[] = [createWorkflowNode(`${containerId}-#scope`, WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE), subgraph];

      if (i === 0 && siblingVarB) {
        const trueSubId = `${containerId}-actions`;
        const trueSubCardId = `${trueSubId}-#subgraph`;
        const trueSub: WorkflowNode = {
          id: trueSubId,
          type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
          children: [createWorkflowNode(trueSubCardId, WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE), createWorkflowNode(VAR_B)],
          edges: [],
        } as any;
        meta[trueSubId] = { graphId: containerId, parentNodeId: containerId, subgraphType: 'CONDITIONAL_TRUE' };
        meta[VAR_B] = { graphId: trueSubId, parentNodeId: containerId };
        children.push(trueSub);
      }

      container = { id: containerId, type: WORKFLOW_NODE_TYPES.GRAPH_NODE, children, edges: [] } as any;
      nextInsert = subgraph.children as WorkflowNode[];
      nextGraphId = subgraphId;
      nextParentNodeId = containerId;
      seed = { workflowGraph: subgraph, graphId: subgraphId, parentId: subgraphCardId };
    } else {
      // Plain Scope and For each are single-flow graphs: children nest directly in the body.
      container = {
        id: containerId,
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        children: [createWorkflowNode(`${containerId}-#scope`, WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE)],
        edges: [],
      } as any;
      nextInsert = container.children as WorkflowNode[];
      nextGraphId = containerId;
      nextParentNodeId = containerId;
      seed = { workflowGraph: container, graphId: containerId, parentId: `${containerId}-#scope` };
    }

    if (i === 0) {
      outerId = containerId;
      outerContainer = container;
    } else {
      (prevInsert as WorkflowNode[]).push(container);
    }
    prevInsert = nextInsert;
    childGraphId = nextGraphId;
    childParentNodeId = nextParentNodeId;
    if (isInnermost) {
      innermost = { targetId: containerId, ...seed };
    }
  });

  return {
    outerId,
    outerContainer: outerContainer as WorkflowNode,
    targetId: (innermost as any).targetId,
    workflowGraph: (innermost as any).workflowGraph,
    graphId: (innermost as any).graphId,
    parentId: (innermost as any).parentId,
    nodesMetadata: meta,
  };
};

type VarBMode = 'parallel' | 'inpath' | 'sibling';

const resolveVariableNamesNested = (chain: TargetKind[], wrapper: WrapperKind, varBMode: VarBMode): string[] => {
  const nested = buildNestedTarget(chain, varBMode === 'sibling');
  const paste = buildPastedSubtree(wrapper, nested.graphId, nested.parentId);

  let rootChildren: WorkflowNode[];
  let rootEdges: any[];
  const varAMeta = { [VAR_A]: { graphId: 'root' } } as Record<string, any>;
  const rootVarBMeta = varBMode === 'sibling' ? {} : { [VAR_B]: { graphId: 'root' } };

  if (varBMode === 'inpath') {
    rootChildren = [createWorkflowNode(VAR_A), createWorkflowNode(VAR_B), nested.outerContainer];
    rootEdges = [createWorkflowEdge(VAR_A, VAR_B), createWorkflowEdge(VAR_B, nested.outerId)];
  } else if (varBMode === 'sibling') {
    // varB lives inside the outermost condition's opposite branch (built by buildNestedTarget).
    rootChildren = [createWorkflowNode(VAR_A), nested.outerContainer];
    rootEdges = [createWorkflowEdge(VAR_A, nested.outerId)];
  } else {
    rootChildren = [createWorkflowNode(VAR_A), createWorkflowNode(VAR_B), nested.outerContainer];
    rootEdges = [createWorkflowEdge(VAR_A, nested.outerId), createWorkflowEdge(VAR_A, VAR_B)];
  }

  const root: WorkflowNode = {
    id: 'root',
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children: rootChildren,
    edges: rootEdges,
  } as any;

  const state = {
    operations: { ...paste.operations },
    nodesMetadata: {
      ...varAMeta,
      ...rootVarBMeta,
      ...nested.nodesMetadata,
    },
    newlyAddedOperations: {},
  } as any;

  const relationshipIds = { graphId: nested.graphId, parentId: nested.parentId, childId: undefined } as any;

  pasteScopeInWorkflow(
    paste.scopeNode,
    nested.workflowGraph,
    relationshipIds,
    paste.operations,
    paste.pasteNodesMetadata,
    [paste.topId, paste.setVarId],
    state,
    false
  );

  const operationMap: Record<string, string> = Object.fromEntries(
    [VAR_A, VAR_B, paste.topId, paste.setVarId, ...chain.map((_, i) => `Nest${i}`)].map((id) => [id, id])
  );

  const upstream = getUpstreamNodeIds(paste.setVarId, root, state.nodesMetadata, operationMap);
  return getAvailableVariables(variablesMap, upstream).map((variable) => variable.name as string);
};

const wrappers: WrapperKind[] = ['condition', 'scope'];
const targets: TargetKind[] = ['condition', 'scope', 'foreach'];

describe('pasteScopeInWorkflow variable-dropdown scope correctness (paste matrix)', () => {
  describe('excludes a separate-path Initialize Variable', () => {
    for (const wrapper of wrappers) {
      for (const target of targets) {
        it(`Set Variable in a copied ${wrapper} pasted into a ${target} sees only in-path variables`, () => {
          const names = resolveVariableNames(wrapper, target, false);
          expect(names).toContain(VAR_A_NAME);
          expect(names).not.toContain(VAR_B_NAME);
        });
      }
    }
  });

  describe('includes every Initialize Variable that is genuinely upstream', () => {
    it('Set Variable in a copied condition pasted into a condition downstream of both vars sees both', () => {
      const names = resolveVariableNames('condition', 'condition', true);
      expect(names).toContain(VAR_A_NAME);
      expect(names).toContain(VAR_B_NAME);
    });

    it('Set Variable in a copied scope pasted into a for each downstream of both vars sees both', () => {
      const names = resolveVariableNames('scope', 'foreach', true);
      expect(names).toContain(VAR_A_NAME);
      expect(names).toContain(VAR_B_NAME);
    });
  });
});

describe('pasteScopeInWorkflow variable-dropdown scope correctness (deep nesting)', () => {
  describe('resolves the in-path root variable and excludes a separate-path variable at depth', () => {
    const deepChains: { name: string; chain: TargetKind[] }[] = [
      {
        name: 'N1 Scope -> Scope -> Scope -> Scope -> Condition (pure scope depth 5)',
        chain: ['scope', 'scope', 'scope', 'scope', 'condition'],
      },
      {
        name: 'N2 Condition -> Condition -> Condition -> Condition (pure subgraph chain depth 4)',
        chain: ['condition', 'condition', 'condition', 'condition'],
      },
      {
        name: 'N3 Scope -> Condition -> For each -> Condition -> Scope -> For each -> Condition (mixed depth 7)',
        chain: ['scope', 'condition', 'foreach', 'condition', 'scope', 'foreach', 'condition'],
      },
      { name: 'N4 Condition -> Scope -> For each -> Condition (mixed depth 4)', chain: ['condition', 'scope', 'foreach', 'condition'] },
    ];

    for (const { name, chain } of deepChains) {
      it(`${name} sees only the in-path variable`, () => {
        const names = resolveVariableNamesNested(chain, 'condition', 'parallel');
        expect(names).toContain(VAR_A_NAME);
        expect(names).not.toContain(VAR_B_NAME);
      });
    }

    it('N5 deep chain in a condition True branch excludes a variable initialized in the sibling False branch', () => {
      // Outermost condition: main chain nests in one branch; Initialize_variables_1 (varB) lives in
      // the opposite branch. The pasted Set Variable deep in the chain must not see it.
      const names = resolveVariableNamesNested(['condition', 'scope', 'foreach', 'condition'], 'condition', 'sibling');
      expect(names).toContain(VAR_A_NAME);
      expect(names).not.toContain(VAR_B_NAME);
    });
  });

  describe('still includes every variable that is genuinely upstream at depth', () => {
    it('N6 deep chain downstream of both root variables sees both', () => {
      const names = resolveVariableNamesNested(['scope', 'scope', 'condition'], 'condition', 'inpath');
      expect(names).toContain(VAR_A_NAME);
      expect(names).toContain(VAR_B_NAME);
    });
  });

  describe('scope-wrapped paste blocks resolve at depth', () => {
    it('N7 a copied Scope>Condition>Set Variable pasted into a deeply nested For each sees only the in-path variable', () => {
      const names = resolveVariableNamesNested(['scope', 'condition', 'foreach'], 'scope', 'parallel');
      expect(names).toContain(VAR_A_NAME);
      expect(names).not.toContain(VAR_B_NAME);
    });
  });
});
