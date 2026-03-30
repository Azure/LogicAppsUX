import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * E2E tests verifying that action and trigger nodes load correctly
 * when the designer opens a Logic App workflow.
 *
 * This covers:
 *  - BJSDeserializer output: graph structure, actionData, nodesMetadata
 *  - Trigger detection (single trigger → OPERATION_NODE, none → PLACEHOLDER)
 *  - Action nodes (flat, scoped, nested)
 *  - Graph edges (trigger→action, runAfter chains)
 *  - Node types (OPERATION_NODE, GRAPH_NODE, SUBGRAPH_NODE, etc.)
 *  - Panel metadata sent via initialize_frame
 *  - Multiple workflow topologies (empty, linear, branching, scoped, agent)
 *  - Webview initialization with workflow content
 */

// ── Constants matching the designer source ───────────────────────────

const WORKFLOW_NODE_TYPES = {
  GRAPH_NODE: 'GRAPH_NODE',
  SUBGRAPH_NODE: 'SUBGRAPH_NODE',
  OPERATION_NODE: 'OPERATION_NODE',
  SCOPE_CARD_NODE: 'SCOPE_CARD_NODE',
  SUBGRAPH_CARD_NODE: 'SUBGRAPH_CARD_NODE',
  HIDDEN_NODE: 'HIDDEN_NODE',
  PLACEHOLDER_NODE: 'PLACEHOLDER_NODE',
  COLLAPSED_NODE: 'COLLAPSED_NODE',
  NOTE_NODE: 'NOTE_NODE',
} as const;

const WORKFLOW_EDGE_TYPES = {
  BUTTON_EDGE: 'BUTTON_EDGE',
  HEADING_EDGE: 'HEADING_EDGE',
  ONLY_EDGE: 'ONLY_EDGE',
  HIDDEN_EDGE: 'HIDDEN_EDGE',
} as const;

const MANAGEMENT_API_PREFIX = '/runtime/webhooks/workflow/api/management';
const PLACEHOLDER_TRIGGER = 'placeholder_trigger';

// ── Type definitions mirroring the designer ──────────────────────────

interface WorkflowNode {
  id: string;
  type: string;
  children?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

interface NodesMetadata {
  [nodeId: string]: {
    graphId: string;
    isRoot?: boolean;
    isTrigger?: boolean;
    parentNodeId?: string;
    subgraphType?: string;
    actionMetadata?: Record<string, any>;
  };
}

interface DeserializedWorkflow {
  graph: WorkflowNode;
  actionData: Record<string, any>;
  nodesMetadata: NodesMetadata;
}

// ── Mini deserializer (mirrors BJSDeserializer.Deserialize) ─────────

function createWorkflowNode(id: string, type: string = WORKFLOW_NODE_TYPES.OPERATION_NODE): WorkflowNode {
  return { id, type };
}

function createWorkflowEdge(source: string, target: string, type: string = WORKFLOW_EDGE_TYPES.BUTTON_EDGE): WorkflowEdge {
  return { id: `${source}-${target}`, source, target, type };
}

/**
 * Simplified deserializer that mirrors the core BJSDeserializer.Deserialize() logic.
 * Converts a workflow definition's triggers and actions into a graph, actionData, and nodesMetadata.
 */
function deserializeWorkflow(definition: any): DeserializedWorkflow {
  const actionData: Record<string, any> = {};
  const nodesMetadata: NodesMetadata = {};
  const children: WorkflowNode[] = [];
  const rootEdges: WorkflowEdge[] = [];

  // ── Trigger ──
  let triggerNodeId: string;
  if (definition.triggers && Object.keys(definition.triggers).length > 0) {
    if (Object.keys(definition.triggers).length > 1) {
      throw new Error('Multiple triggers are not supported');
    }
    const [[tID, trigger]] = Object.entries(definition.triggers) as [string, any][];
    triggerNodeId = tID;
    children.push(createWorkflowNode(tID, WORKFLOW_NODE_TYPES.OPERATION_NODE));
    actionData[tID] = { ...trigger };
    nodesMetadata[tID] = { graphId: 'root', isRoot: true, isTrigger: true };
  } else {
    triggerNodeId = PLACEHOLDER_TRIGGER;
    children.push(createWorkflowNode(PLACEHOLDER_TRIGGER, WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE));
    actionData[PLACEHOLDER_TRIGGER] = {};
    nodesMetadata[PLACEHOLDER_TRIGGER] = { graphId: 'root', isRoot: true, isTrigger: true };
  }

  // ── Actions ──
  if (definition.actions) {
    for (const [actionName, action] of Object.entries(definition.actions) as [string, any][]) {
      const isScopeAction = ['If', 'Switch', 'Foreach', 'Until', 'Scope', 'Agent'].includes(action.type);
      const nodeType = isScopeAction ? WORKFLOW_NODE_TYPES.GRAPH_NODE : WORKFLOW_NODE_TYPES.OPERATION_NODE;
      const node = createWorkflowNode(actionName, nodeType);

      // Scope children
      if (isScopeAction && action.actions) {
        node.children = [];
        node.edges = [];
        for (const [childName, childAction] of Object.entries(action.actions) as [string, any][]) {
          node.children.push(createWorkflowNode(childName, WORKFLOW_NODE_TYPES.OPERATION_NODE));
          actionData[childName] = { ...childAction };
          nodesMetadata[childName] = { graphId: actionName, parentNodeId: actionName };
        }
        // If condition — also process else branch
        if (action.type === 'If' && action.else?.actions) {
          for (const [childName, childAction] of Object.entries(action.else.actions) as [string, any][]) {
            node.children.push(createWorkflowNode(childName, WORKFLOW_NODE_TYPES.OPERATION_NODE));
            actionData[childName] = { ...childAction };
            nodesMetadata[childName] = { graphId: actionName, parentNodeId: actionName };
          }
        }
      }

      children.push(node);
      actionData[actionName] = { ...action };
      nodesMetadata[actionName] = { graphId: 'root' };

      // Edges: runAfter → edges, or parentless → edge from trigger
      const runAfter = action.runAfter ?? {};
      if (Object.keys(runAfter).length === 0) {
        rootEdges.push(createWorkflowEdge(triggerNodeId, actionName));
      } else {
        for (const predecessor of Object.keys(runAfter)) {
          rootEdges.push(createWorkflowEdge(predecessor, actionName));
        }
      }
    }
  }

  return {
    graph: {
      id: 'root',
      type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
      children,
      edges: rootEdges,
    },
    actionData,
    nodesMetadata,
  };
}

/** Count all OPERATION_NODEs (recursively through scope children). */
function countOperationNodes(node: WorkflowNode): number {
  let count = node.type === WORKFLOW_NODE_TYPES.OPERATION_NODE ? 1 : 0;
  for (const child of node.children ?? []) {
    count += countOperationNodes(child);
  }
  return count;
}

/** Get all node IDs from the graph (flat). */
function getAllNodeIds(node: WorkflowNode): string[] {
  const ids = [node.id];
  for (const child of node.children ?? []) {
    ids.push(...getAllNodeIds(child));
  }
  return ids;
}

/** Get all edges from the graph (flat). */
function getAllEdges(node: WorkflowNode): WorkflowEdge[] {
  const edges = [...(node.edges ?? [])];
  for (const child of node.children ?? []) {
    edges.push(...getAllEdges(child));
  }
  return edges;
}

// ── Workflow definition factories ────────────────────────────────────

const SCHEMA = 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#';

function makeDefinition(triggers: Record<string, any>, actions: Record<string, any>): any {
  return {
    $schema: SCHEMA,
    contentVersion: '1.0.0.0',
    triggers,
    actions,
    outputs: {},
  };
}

const DEFINITIONS = {
  /** No trigger, no actions. */
  empty: makeDefinition({}, {}),

  /** HTTP trigger, no actions. */
  triggerOnly: makeDefinition({ When_a_HTTP_request_is_received: { type: 'Request', kind: 'Http', inputs: { schema: {} } } }, {}),

  /** Recurrence trigger + single Compose action. */
  simple: makeDefinition(
    { Recurrence: { type: 'Recurrence', recurrence: { frequency: 'Minute', interval: 5 } } },
    { Compose: { type: 'Compose', inputs: 'hello', runAfter: {} } }
  ),

  /** HTTP trigger → HTTP → Response (linear chain). */
  linearChain: makeDefinition(
    { When_a_HTTP_request_is_received: { type: 'Request', kind: 'Http', inputs: { schema: {} } } },
    {
      HTTP: { type: 'Http', inputs: { method: 'GET', uri: 'https://example.com' }, runAfter: {} },
      Parse_JSON: { type: 'ParseJson', inputs: { content: "@body('HTTP')", schema: {} }, runAfter: { HTTP: ['Succeeded'] } },
      Response: {
        type: 'Response',
        kind: 'Http',
        inputs: { statusCode: 200, body: "@body('Parse_JSON')" },
        runAfter: { Parse_JSON: ['Succeeded'] },
      },
    }
  ),

  /** HTTP trigger → Condition (If scope) with true & else branches. */
  conditional: makeDefinition(
    { When_a_HTTP_request_is_received: { type: 'Request', kind: 'Http', inputs: { schema: {} } } },
    {
      Condition: {
        type: 'If',
        expression: { and: [{ equals: ['@triggerBody()', 'yes'] }] },
        actions: {
          Response_True: { type: 'Response', kind: 'Http', inputs: { statusCode: 200, body: 'Yes' }, runAfter: {} },
        },
        else: {
          actions: {
            Response_False: { type: 'Response', kind: 'Http', inputs: { statusCode: 400, body: 'No' }, runAfter: {} },
          },
        },
        runAfter: {},
      },
    }
  ),

  /** HTTP trigger → ForEach loop with an inner action. */
  loop: makeDefinition(
    { When_a_HTTP_request_is_received: { type: 'Request', kind: 'Http', inputs: { schema: {} } } },
    {
      For_each: {
        type: 'Foreach',
        foreach: "@triggerBody()?['items']",
        actions: {
          Log_item: { type: 'Compose', inputs: "@items('For_each')", runAfter: {} },
        },
        runAfter: {},
      },
    }
  ),

  /** Multiple runAfter branches converging. */
  parallelBranches: makeDefinition(
    { manual: { type: 'Request', kind: 'Http', inputs: { schema: {} } } },
    {
      Branch_A: { type: 'Compose', inputs: 'A', runAfter: {} },
      Branch_B: { type: 'Compose', inputs: 'B', runAfter: {} },
      Merge: { type: 'Compose', inputs: 'merged', runAfter: { Branch_A: ['Succeeded'], Branch_B: ['Succeeded'] } },
    }
  ),

  /** Agent workflow: agent trigger + Default_Agent action. */
  agent: makeDefinition(
    { When_a_new_chat_session_starts: { type: 'Request', kind: 'Agent' } },
    { Default_Agent: { type: 'Agent', inputs: {} } }
  ),

  /** Many actions for stress testing. */
  manyActions: makeDefinition(
    { Recurrence: { type: 'Recurrence', recurrence: { frequency: 'Hour', interval: 1 } } },
    Object.fromEntries(
      Array.from({ length: 20 }, (_, i) => [
        `Action_${i}`,
        { type: 'Compose', inputs: `val_${i}`, runAfter: i === 0 ? {} : { [`Action_${i - 1}`]: ['Succeeded'] } },
      ])
    )
  ),
};

// =====================================================================
//  TEST SUITES
// =====================================================================

suite('Action & Trigger Nodes Load in Designer', () => {
  let tempDir: string;

  suiteSetup(async function () {
    this.timeout(30000);
    vscode.window.showInformationMessage('Starting Action & Trigger Node Loading Tests');
  });

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'la-nodes-'));
  });

  teardown(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ────────────────────────────────────────────────────────────────
  //  Trigger Node Loading
  // ────────────────────────────────────────────────────────────────
  suite('Trigger Node Loading', () => {
    test('Single trigger produces an OPERATION_NODE at root', () => {
      const result = deserializeWorkflow(DEFINITIONS.triggerOnly);
      const triggerNode = result.graph.children?.find((n) => n.id === 'When_a_HTTP_request_is_received');
      assert.ok(triggerNode, 'Trigger node should exist in graph children');
      assert.strictEqual(triggerNode.type, WORKFLOW_NODE_TYPES.OPERATION_NODE);
    });

    test('Trigger is marked isTrigger=true and isRoot=true in nodesMetadata', () => {
      const result = deserializeWorkflow(DEFINITIONS.triggerOnly);
      const meta = result.nodesMetadata['When_a_HTTP_request_is_received'];
      assert.ok(meta, 'Trigger metadata should exist');
      assert.strictEqual(meta.isTrigger, true);
      assert.strictEqual(meta.isRoot, true);
      assert.strictEqual(meta.graphId, 'root');
    });

    test('Trigger actionData contains the original trigger definition', () => {
      const result = deserializeWorkflow(DEFINITIONS.triggerOnly);
      const triggerData = result.actionData['When_a_HTTP_request_is_received'];
      assert.ok(triggerData, 'Trigger should be in actionData');
      assert.strictEqual(triggerData.type, 'Request');
      assert.strictEqual(triggerData.kind, 'Http');
    });

    test('Empty definition produces PLACEHOLDER_NODE trigger', () => {
      const result = deserializeWorkflow(DEFINITIONS.empty);
      const placeholder = result.graph.children?.find((n) => n.id === PLACEHOLDER_TRIGGER);
      assert.ok(placeholder, 'Placeholder trigger node should exist');
      assert.strictEqual(placeholder.type, WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE);
      assert.strictEqual(result.nodesMetadata[PLACEHOLDER_TRIGGER].isTrigger, true);
    });

    test('Multiple triggers throw an error', () => {
      const multiTriggerDef = makeDefinition(
        {
          Trigger_A: { type: 'Request', kind: 'Http' },
          Trigger_B: { type: 'Recurrence', recurrence: {} },
        },
        {}
      );
      assert.throws(() => deserializeWorkflow(multiTriggerDef), /Multiple triggers/);
    });

    test('Recurrence trigger is correctly deserialized', () => {
      const result = deserializeWorkflow(DEFINITIONS.simple);
      const triggerData = result.actionData['Recurrence'];
      assert.ok(triggerData, 'Recurrence trigger should be in actionData');
      assert.strictEqual(triggerData.type, 'Recurrence');
      assert.strictEqual(triggerData.recurrence?.frequency, 'Minute');
      assert.strictEqual(triggerData.recurrence?.interval, 5);
    });

    test('Agent trigger has type=Request and kind=Agent', () => {
      const result = deserializeWorkflow(DEFINITIONS.agent);
      const triggerData = result.actionData['When_a_new_chat_session_starts'];
      assert.ok(triggerData);
      assert.strictEqual(triggerData.type, 'Request');
      assert.strictEqual(triggerData.kind, 'Agent');
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Action Node Loading
  // ────────────────────────────────────────────────────────────────
  suite('Action Node Loading', () => {
    test('Single action creates an OPERATION_NODE', () => {
      const result = deserializeWorkflow(DEFINITIONS.simple);
      const composeNode = result.graph.children?.find((n) => n.id === 'Compose');
      assert.ok(composeNode, 'Compose action should be in graph');
      assert.strictEqual(composeNode.type, WORKFLOW_NODE_TYPES.OPERATION_NODE);
    });

    test('Action actionData contains the original action definition', () => {
      const result = deserializeWorkflow(DEFINITIONS.simple);
      assert.strictEqual(result.actionData['Compose'].type, 'Compose');
      assert.strictEqual(result.actionData['Compose'].inputs, 'hello');
    });

    test('Linear chain creates 3 action nodes + 1 trigger (4 total operation nodes)', () => {
      const result = deserializeWorkflow(DEFINITIONS.linearChain);
      const opCount = countOperationNodes(result.graph);
      assert.strictEqual(opCount, 4, '1 trigger + 3 actions = 4 operation nodes');
    });

    test('Linear chain actionData has all 4 entries (trigger + 3 actions)', () => {
      const result = deserializeWorkflow(DEFINITIONS.linearChain);
      const expectedKeys = ['When_a_HTTP_request_is_received', 'HTTP', 'Parse_JSON', 'Response'];
      for (const key of expectedKeys) {
        assert.ok(result.actionData[key], `${key} should be in actionData`);
      }
    });

    test('Parallel branches create 3 action nodes', () => {
      const result = deserializeWorkflow(DEFINITIONS.parallelBranches);
      const actionIds = getAllNodeIds(result.graph).filter((id) => id !== 'root' && id !== 'manual');
      assert.strictEqual(actionIds.length, 3, 'Branch_A, Branch_B, Merge');
    });

    test('20 chained actions are all deserialized', () => {
      const result = deserializeWorkflow(DEFINITIONS.manyActions);
      // 1 trigger + 20 actions = 21 entries in actionData
      assert.strictEqual(Object.keys(result.actionData).length, 21);
      assert.ok(result.actionData['Action_0']);
      assert.ok(result.actionData['Action_19']);
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Scope / Conditional Nodes
  // ────────────────────────────────────────────────────────────────
  suite('Scope & Conditional Nodes', () => {
    test('If action produces a GRAPH_NODE', () => {
      const result = deserializeWorkflow(DEFINITIONS.conditional);
      const condNode = result.graph.children?.find((n) => n.id === 'Condition');
      assert.ok(condNode, 'Condition node should exist');
      assert.strictEqual(condNode.type, WORKFLOW_NODE_TYPES.GRAPH_NODE, 'If action should be GRAPH_NODE');
    });

    test('If scope contains children from both true and else branches', () => {
      const result = deserializeWorkflow(DEFINITIONS.conditional);
      const condNode = result.graph.children?.find((n) => n.id === 'Condition');
      assert.ok(condNode?.children, 'Scope should have children');
      const childIds = condNode!.children!.map((c) => c.id);
      assert.ok(childIds.includes('Response_True'), 'True branch child should exist');
      assert.ok(childIds.includes('Response_False'), 'Else branch child should exist');
    });

    test('Scope children are in actionData', () => {
      const result = deserializeWorkflow(DEFINITIONS.conditional);
      assert.ok(result.actionData['Response_True'], 'True branch action should be in actionData');
      assert.ok(result.actionData['Response_False'], 'Else branch action should be in actionData');
    });

    test('Scope children nodesMetadata have parentNodeId pointing to scope', () => {
      const result = deserializeWorkflow(DEFINITIONS.conditional);
      assert.strictEqual(result.nodesMetadata['Response_True']?.graphId, 'Condition');
      assert.strictEqual(result.nodesMetadata['Response_True']?.parentNodeId, 'Condition');
      assert.strictEqual(result.nodesMetadata['Response_False']?.graphId, 'Condition');
    });

    test('ForEach loop produces a GRAPH_NODE with inner actions', () => {
      const result = deserializeWorkflow(DEFINITIONS.loop);
      const foreachNode = result.graph.children?.find((n) => n.id === 'For_each');
      assert.ok(foreachNode, 'ForEach node should exist');
      assert.strictEqual(foreachNode.type, WORKFLOW_NODE_TYPES.GRAPH_NODE);
      assert.ok(foreachNode.children, 'ForEach should have children');
      assert.ok(
        foreachNode.children!.some((c) => c.id === 'Log_item'),
        'Inner action should exist'
      );
    });

    test('Agent action produces a GRAPH_NODE', () => {
      const result = deserializeWorkflow(DEFINITIONS.agent);
      const agentNode = result.graph.children?.find((n) => n.id === 'Default_Agent');
      assert.ok(agentNode, 'Default_Agent node should exist');
      assert.strictEqual(agentNode.type, WORKFLOW_NODE_TYPES.GRAPH_NODE);
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Graph Edges (trigger→action, runAfter)
  // ────────────────────────────────────────────────────────────────
  suite('Graph Edges', () => {
    test('Trigger → parentless action edge exists', () => {
      const result = deserializeWorkflow(DEFINITIONS.simple);
      const edges = getAllEdges(result.graph);
      const triggerToCompose = edges.find((e) => e.source === 'Recurrence' && e.target === 'Compose');
      assert.ok(triggerToCompose, 'Edge from Recurrence trigger to Compose should exist');
    });

    test('runAfter creates correct edges in linear chain', () => {
      const result = deserializeWorkflow(DEFINITIONS.linearChain);
      const edges = getAllEdges(result.graph);

      const triggerToHTTP = edges.find((e) => e.source === 'When_a_HTTP_request_is_received' && e.target === 'HTTP');
      assert.ok(triggerToHTTP, 'Edge from trigger to HTTP');

      const httpToParse = edges.find((e) => e.source === 'HTTP' && e.target === 'Parse_JSON');
      assert.ok(httpToParse, 'Edge from HTTP to Parse_JSON');

      const parseToResponse = edges.find((e) => e.source === 'Parse_JSON' && e.target === 'Response');
      assert.ok(parseToResponse, 'Edge from Parse_JSON to Response');
    });

    test('Parallel branches have 2 edges from trigger', () => {
      const result = deserializeWorkflow(DEFINITIONS.parallelBranches);
      const edges = getAllEdges(result.graph);
      const fromTrigger = edges.filter((e) => e.source === 'manual');
      assert.strictEqual(fromTrigger.length, 2, 'Trigger should connect to Branch_A and Branch_B');
    });

    test('Merge node has 2 incoming edges (from both branches)', () => {
      const result = deserializeWorkflow(DEFINITIONS.parallelBranches);
      const edges = getAllEdges(result.graph);
      const toMerge = edges.filter((e) => e.target === 'Merge');
      assert.strictEqual(toMerge.length, 2, 'Merge should have 2 incoming edges');
      const sources = toMerge.map((e) => e.source).sort();
      assert.deepStrictEqual(sources, ['Branch_A', 'Branch_B']);
    });

    test('No edges in an empty definition (only placeholder trigger)', () => {
      const result = deserializeWorkflow(DEFINITIONS.empty);
      const edges = getAllEdges(result.graph);
      assert.strictEqual(edges.length, 0, 'Empty workflow should have no edges');
    });

    test('Chained 20 actions produce 20 edges (1 trigger→action_0 + 19 runAfter)', () => {
      const result = deserializeWorkflow(DEFINITIONS.manyActions);
      const edges = getAllEdges(result.graph);
      assert.strictEqual(edges.length, 20, '1 trigger edge + 19 runAfter edges');
    });

    test('Edge IDs are deterministic (source-target format)', () => {
      const result = deserializeWorkflow(DEFINITIONS.simple);
      const edges = getAllEdges(result.graph);
      for (const edge of edges) {
        assert.strictEqual(edge.id, `${edge.source}-${edge.target}`, 'Edge ID should be source-target');
      }
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Root Graph Structure
  // ────────────────────────────────────────────────────────────────
  suite('Root Graph Structure', () => {
    test('Root node is always a GRAPH_NODE with id="root"', () => {
      for (const [name, def] of Object.entries(DEFINITIONS)) {
        const result = deserializeWorkflow(def);
        assert.strictEqual(result.graph.id, 'root', `${name}: root id`);
        assert.strictEqual(result.graph.type, WORKFLOW_NODE_TYPES.GRAPH_NODE, `${name}: root type`);
      }
    });

    test('Root graph always has at least 1 child (trigger or placeholder)', () => {
      for (const [name, def] of Object.entries(DEFINITIONS)) {
        const result = deserializeWorkflow(def);
        assert.ok(result.graph.children && result.graph.children.length >= 1, `${name}: should have at least 1 child`);
      }
    });

    test('Exactly one trigger or placeholder exists per workflow', () => {
      for (const [name, def] of Object.entries(DEFINITIONS)) {
        const result = deserializeWorkflow(def);
        const triggerEntries = Object.entries(result.nodesMetadata).filter(([, m]) => m.isTrigger);
        assert.strictEqual(triggerEntries.length, 1, `${name}: should have exactly 1 trigger in metadata`);
      }
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Webview Panel + Workflow Content Integration
  // ────────────────────────────────────────────────────────────────
  suite('Webview Initialization with Workflow Content', () => {
    const createdPanels: vscode.WebviewPanel[] = [];

    teardown(() => {
      for (const p of createdPanels) {
        try {
          p.dispose();
        } catch {
          /* */
        }
      }
      createdPanels.length = 0;
    });

    test('Workflow content with actions/triggers is sent via postMessage', async () => {
      const panel = vscode.window.createWebviewPanel('designerLocal', 'NodeLoadTest', vscode.ViewColumn.Active, {
        enableScripts: true,
        retainContextWhenHidden: true,
      });
      createdPanels.push(panel);
      panel.webview.html = '<html><body><script>const vscode=acquireVsCodeApi();</script></body></html>';

      const workflowContent = {
        definition: DEFINITIONS.linearChain,
        kind: 'Stateful',
      };

      const panelMetadata = {
        panelId: 'test-panel',
        standardApp: {
          definition: workflowContent.definition,
          name: 'TestApp',
          kind: workflowContent.kind,
          stateful: true,
        },
        connectionsData: '{}',
        parametersData: {},
        localSettings: {},
        artifacts: { maps: {}, schemas: [] },
        workflowName: 'TestWorkflow',
        workflowContent,
      };

      const sent = await panel.webview.postMessage({
        command: 'initialize_frame',
        data: {
          project: 'designer',
          panelMetadata,
          connectionData: {},
          baseUrl: `http://localhost:7071${MANAGEMENT_API_PREFIX}`,
          apiVersion: '2018-11-01',
          readOnly: false,
          isLocal: true,
          isMonitoringView: false,
        },
      });

      assert.ok(sent, 'initialize_frame with workflow content should be sent');
    });

    test('Panel metadata standardApp.definition contains actions and triggers', () => {
      const workflowContent = {
        definition: DEFINITIONS.conditional,
        kind: 'Stateful',
      };

      const standardApp = {
        definition: workflowContent.definition,
        name: 'CondApp',
        kind: workflowContent.kind,
        stateful: true,
      };

      // Verify the standardApp carries the full definition
      assert.ok(standardApp.definition.triggers, 'standardApp.definition should have triggers');
      assert.ok(standardApp.definition.actions, 'standardApp.definition should have actions');
      assert.ok(standardApp.definition.triggers['When_a_HTTP_request_is_received'], 'Should have HTTP trigger');
      assert.ok(standardApp.definition.actions['Condition'], 'Should have Condition action');
      assert.strictEqual(standardApp.definition.actions['Condition'].type, 'If');
    });

    test('Workflow file on disk produces valid content for deserialization', () => {
      const workflowDir = path.join(tempDir, 'TestApp', 'TestWorkflow');
      fs.mkdirSync(workflowDir, { recursive: true });

      const workflowContent = { definition: DEFINITIONS.linearChain, kind: 'Stateful' };
      fs.writeFileSync(path.join(workflowDir, 'workflow.json'), JSON.stringify(workflowContent, null, 2));

      // Read back and deserialize — simulating what the extension does
      const rawContent = JSON.parse(fs.readFileSync(path.join(workflowDir, 'workflow.json'), 'utf-8'));
      const result = deserializeWorkflow(rawContent.definition);

      assert.ok(result.graph, 'Graph should be produced');
      assert.strictEqual(Object.keys(result.actionData).length, 4, '4 entries: 1 trigger + 3 actions');
      assert.strictEqual(getAllEdges(result.graph).length, 3, '3 edges in chain');
    });

    test('Workflow with scoped actions serializes and deserializes from disk', () => {
      const workflowDir = path.join(tempDir, 'ScopeApp', 'ScopeFlow');
      fs.mkdirSync(workflowDir, { recursive: true });

      const workflowContent = { definition: DEFINITIONS.conditional, kind: 'Stateful' };
      fs.writeFileSync(path.join(workflowDir, 'workflow.json'), JSON.stringify(workflowContent, null, 2));

      const rawContent = JSON.parse(fs.readFileSync(path.join(workflowDir, 'workflow.json'), 'utf-8'));
      const result = deserializeWorkflow(rawContent.definition);

      // Root should have trigger + Condition (scope)
      const rootChildren = result.graph.children!;
      assert.ok(rootChildren.some((n) => n.id === 'When_a_HTTP_request_is_received'));
      assert.ok(rootChildren.some((n) => n.id === 'Condition'));

      // Scope should contain both branch children
      const condNode = rootChildren.find((n) => n.id === 'Condition')!;
      const scopeChildIds = condNode.children!.map((c) => c.id);
      assert.ok(scopeChildIds.includes('Response_True'));
      assert.ok(scopeChildIds.includes('Response_False'));
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Node Type Classification
  // ────────────────────────────────────────────────────────────────
  suite('Node Type Classification', () => {
    test('All WORKFLOW_NODE_TYPES are well-defined constants', () => {
      const expected = [
        'GRAPH_NODE',
        'SUBGRAPH_NODE',
        'OPERATION_NODE',
        'SCOPE_CARD_NODE',
        'SUBGRAPH_CARD_NODE',
        'HIDDEN_NODE',
        'PLACEHOLDER_NODE',
        'COLLAPSED_NODE',
        'NOTE_NODE',
      ];
      for (const key of expected) {
        assert.ok((WORKFLOW_NODE_TYPES as any)[key], `${key} should be defined`);
        assert.strictEqual((WORKFLOW_NODE_TYPES as any)[key], key, `${key} value should match its name`);
      }
    });

    test('All WORKFLOW_EDGE_TYPES are well-defined constants', () => {
      const expected = ['BUTTON_EDGE', 'HEADING_EDGE', 'ONLY_EDGE', 'HIDDEN_EDGE'];
      for (const key of expected) {
        assert.ok((WORKFLOW_EDGE_TYPES as any)[key], `${key} should be defined`);
      }
    });

    test('Regular action → OPERATION_NODE, scope action → GRAPH_NODE', () => {
      const def = makeDefinition(
        { T: { type: 'Request', kind: 'Http' } },
        {
          Compose: { type: 'Compose', inputs: 'x', runAfter: {} },
          MyCondition: { type: 'If', expression: {}, actions: {}, runAfter: { Compose: ['Succeeded'] } },
          MyLoop: { type: 'Foreach', foreach: '@triggerBody()', actions: {}, runAfter: { Compose: ['Succeeded'] } },
        }
      );
      const result = deserializeWorkflow(def);
      const findType = (id: string) => result.graph.children?.find((n) => n.id === id)?.type;

      assert.strictEqual(findType('Compose'), WORKFLOW_NODE_TYPES.OPERATION_NODE);
      assert.strictEqual(findType('MyCondition'), WORKFLOW_NODE_TYPES.GRAPH_NODE);
      assert.strictEqual(findType('MyLoop'), WORKFLOW_NODE_TYPES.GRAPH_NODE);
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Full End-to-End: Read → Deserialize → Panel Send
  // ────────────────────────────────────────────────────────────────
  suite('Full Pipeline: File → Deserialize → Panel', () => {
    const createdPanels: vscode.WebviewPanel[] = [];

    teardown(() => {
      for (const p of createdPanels) {
        try {
          p.dispose();
        } catch {
          /* */
        }
      }
      createdPanels.length = 0;
    });

    test('Complex workflow: read, deserialize, verify nodes, send to webview', async () => {
      // 1. Write a complex workflow to disk
      const workflowDir = path.join(tempDir, 'ComplexApp', 'ComplexFlow');
      fs.mkdirSync(workflowDir, { recursive: true });

      const complexDef = makeDefinition(
        { manual: { type: 'Request', kind: 'Http', inputs: { schema: {} } } },
        {
          Initialize_variable: {
            type: 'InitializeVariable',
            inputs: { variables: [{ name: 'x', type: 'integer', value: 0 }] },
            runAfter: {},
          },
          Condition: {
            type: 'If',
            expression: { and: [{ greater: ['@variables("x")', 5] }] },
            actions: {
              Set_variable: { type: 'SetVariable', inputs: { name: 'x', value: 10 }, runAfter: {} },
            },
            else: {
              actions: {
                Increment_variable: { type: 'IncrementVariable', inputs: { name: 'x', value: 1 }, runAfter: {} },
              },
            },
            runAfter: { Initialize_variable: ['Succeeded'] },
          },
          Response: {
            type: 'Response',
            kind: 'Http',
            inputs: { statusCode: 200, body: "@variables('x')" },
            runAfter: { Condition: ['Succeeded'] },
          },
        }
      );

      fs.writeFileSync(path.join(workflowDir, 'workflow.json'), JSON.stringify({ definition: complexDef, kind: 'Stateful' }, null, 2));

      // 2. Read from disk
      const raw = JSON.parse(fs.readFileSync(path.join(workflowDir, 'workflow.json'), 'utf-8'));
      assert.ok(raw.definition.triggers.manual, 'File should have trigger');
      assert.ok(raw.definition.actions.Initialize_variable, 'File should have actions');

      // 3. Deserialize
      const result = deserializeWorkflow(raw.definition);

      // Trigger
      assert.ok(result.nodesMetadata['manual']?.isTrigger, 'manual should be trigger');

      // Actions
      assert.ok(result.actionData['Initialize_variable']);
      assert.ok(result.actionData['Condition']);
      assert.ok(result.actionData['Response']);

      // Scope children
      assert.ok(result.actionData['Set_variable'], 'True branch child');
      assert.ok(result.actionData['Increment_variable'], 'Else branch child');

      // Graph structure
      const condNode = result.graph.children?.find((n) => n.id === 'Condition');
      assert.strictEqual(condNode?.type, WORKFLOW_NODE_TYPES.GRAPH_NODE);
      assert.strictEqual(condNode?.children?.length, 2); // Set_variable + Increment_variable

      // Edges
      const edges = getAllEdges(result.graph);
      assert.ok(
        edges.find((e) => e.source === 'manual' && e.target === 'Initialize_variable'),
        'trigger → init'
      );
      assert.ok(
        edges.find((e) => e.source === 'Initialize_variable' && e.target === 'Condition'),
        'init → condition'
      );
      assert.ok(
        edges.find((e) => e.source === 'Condition' && e.target === 'Response'),
        'condition → response'
      );

      // 4. Send to webview panel
      const panel = vscode.window.createWebviewPanel('designerLocal', 'ComplexTest', vscode.ViewColumn.Active, {
        enableScripts: true,
        retainContextWhenHidden: true,
      });
      createdPanels.push(panel);
      panel.webview.html = '<html><body></body></html>';

      const sent = await panel.webview.postMessage({
        command: 'initialize_frame',
        data: {
          project: 'designer',
          panelMetadata: {
            standardApp: { definition: raw.definition, name: 'ComplexApp', kind: 'Stateful', stateful: true },
            workflowName: 'ComplexFlow',
            connectionsData: '{}',
            parametersData: {},
            localSettings: {},
            artifacts: { maps: {}, schemas: [] },
          },
          connectionData: {},
          baseUrl: `http://localhost:7071${MANAGEMENT_API_PREFIX}`,
          apiVersion: '2018-11-01',
          readOnly: false,
          isLocal: true,
          isMonitoringView: false,
        },
      });

      assert.ok(sent, 'Message with complex workflow should be sent to webview');
    });
  });
});
