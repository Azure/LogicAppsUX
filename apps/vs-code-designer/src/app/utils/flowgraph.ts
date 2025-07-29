/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../localize';

type Attributes = Record<string, any>;

type Edge = {
  to: string;
  attr: Attributes;
};

type FlowActionStatus = 'SUCCEEDED' | 'FAILED' | 'TIMEDOUT' | 'SKIPPED';

// TODO(aeldridge): Support paths for all possible flow run statuses
type FlowPathOverallStatus = 'SUCCEEDED' | 'FAILED';

export type FlowPath = {
  overallStatus: FlowPathOverallStatus;
  path: PathNode[];
};

export type PathNode = {
  name: string;
  type: string;
  status: FlowActionStatus;
};

export type ParentPathNode = PathNode & {
  actions: PathNode[];
};

export type IfPathNode = ParentPathNode & {
  conditionResult: boolean;
};

export type SwitchPathNode = ParentPathNode & {
  caseResult: string;
  isDefaultCase: boolean;
};

const unsupportedActions = new Set<string>(['Scope', 'ForEach', 'Until']);
const validStatuses = new Set<FlowActionStatus>(['SUCCEEDED', 'FAILED']);

export class FlowGraph {
  private static Subgraph(): FlowGraph {
    return new FlowGraph(null);
  }

  private static getPathOverallStatus(path: PathNode[]): FlowPathOverallStatus {
    return path.some((pathNode) => pathNode.status !== 'SUCCEEDED') ? 'FAILED' : 'SUCCEEDED';
  }

  private static shouldExpandSucc(
    path: PathNode[],
    currNodeStatus: FlowActionStatus,
    succ: string,
    succRunAfter: FlowActionStatus[]
  ): boolean {
    const pathNodeIds = path.map((pathNode) => pathNode.name);
    return !pathNodeIds.includes(succ) && succRunAfter.includes(currNodeStatus);
  }

  private static isValidSubpath(subpath: PathNode[], parentStatus: FlowActionStatus): boolean {
    // TODO(aeldridge): Need to consider other action statuses which correspond to Failed overall status
    return FlowGraph.getPathOverallStatus(subpath) === parentStatus;
  }

  private nodes: Map<string, Attributes>;
  private edges: Map<string, Edge[]>;
  private triggerName: string | undefined;

  public constructor(workflowDefinition: Record<string, any>) {
    this.nodes = new Map<string, Attributes>();
    this.edges = new Map<string, Edge[]>();
    if (workflowDefinition !== null) {
      const [[triggerName, trigger]] = Object.entries(workflowDefinition['triggers']);
      this.triggerName = triggerName;
      this.addNode(this.triggerName, { type: trigger['type'] });
      for (const [actionName, action] of Object.entries(workflowDefinition['actions'])) {
        this.addNodeRec(actionName, action);
      }
    }
  }

  public addNode(id: string, attr: Attributes = {}) {
    if (this.nodes.has(id)) {
      Object.assign(this.nodes.get(id)!, attr);
    } else {
      this.nodes.set(id, attr);
      this.edges.set(id, []);
    }
  }

  public getNode(id: string): Attributes | undefined {
    return this.nodes.get(id);
  }

  public addEdge(from: string, to: string, attr: Attributes = {}) {
    if (!this.nodes.has(from) || !this.nodes.has(to)) {
      throw new Error(`Cannot add edge from ${from} to ${to}: node(s) missing`);
    }
    this.edges.get(from)!.push({ to, attr: attr });
  }

  public getEdge(from: string, to: string): Edge | undefined {
    return this.edges.get(from)?.find((e) => e.to === to);
  }

  public getNodeIds(): string[] {
    return Array.from(this.nodes.keys());
  }

  public getSuccessors(id: string): string[] {
    return this.edges.get(id)?.map((e) => e.to) || [];
  }

  public getOutgoingEdges(id: string): Edge[] {
    return this.edges.get(id) || [];
  }

  public getInDegree(id: string): number {
    let count = 0;
    for (const edgeList of this.edges.values()) {
      if (edgeList.some((e) => e.to === id)) {
        count++;
      }
    }
    return count;
  }

  public getStartNode(): string | undefined {
    const startNodes = this.getNodeIds().filter((id) => this.getInDegree(id) === 0);
    if (startNodes.length > 1) {
      throw new Error(`Multiple start nodes in scope not allowed: ${startNodes.join(', ')}.`);
    }
    return startNodes.length === 1 ? startNodes[0] : undefined;
  }

  public toJSON() {
    return {
      nodes: Array.from(this.nodes.entries()).map(([id, attrs]) => ({ id, attrs })),
      edges: Array.from(this.edges.entries()).flatMap(([from, edgeList]) =>
        edgeList.map((edge) => ({ from, to: edge.to, attrs: edge.attr }))
      ),
    };
  }

  public isTerminalNode(id: string, currPathNodeStatus: FlowActionStatus): boolean {
    let hasRunAfterCurrStatus = false;
    for (const edge of this.getOutgoingEdges(id)) {
      if ((edge.attr['runAfter'] as FlowActionStatus[]).includes(currPathNodeStatus)) {
        hasRunAfterCurrStatus = true;
        break;
      }
    }
    return this.getSuccessors(id).length === 0 || !hasRunAfterCurrStatus;
  }

  public getAllExecutionPaths(): FlowPath[] {
    const paths = this.getAllExecutionPathsRec(this.triggerName, true);
    return paths.map((path) => ({
      overallStatus: FlowGraph.getPathOverallStatus(path),
      path: path,
    }));
  }

  private getAllExecutionPathsRec(startNodeId: string, isTrigger = false): PathNode[][] {
    if (startNodeId === undefined) {
      return [];
    }

    const paths: PathNode[][] = [];

    const dfsSwitch = (nodeId: string, path: PathNode[]) => {
      const nodeData = this.getNode(nodeId)!;
      const basePathNode = path.pop()!;

      const graphDefaultCase = nodeData['default'] as FlowGraph;
      const pathsDefaultCase = graphDefaultCase.getAllExecutionPathsRec(graphDefaultCase.getStartNode());
      for (const subpathDefaultCase of pathsDefaultCase) {
        const currPathNode = {
          ...basePathNode,
          caseResult: 'default',
          isDefaultCase: true,
          actions: subpathDefaultCase,
        } as SwitchPathNode;
        path.push(currPathNode);

        if (FlowGraph.isValidSubpath(subpathDefaultCase, currPathNode.status)) {
          if (this.isTerminalNode(nodeId, currPathNode.status)) {
            paths.push(path.slice());
          } else {
            for (const edge of this.getOutgoingEdges(nodeId)) {
              if (FlowGraph.shouldExpandSucc(path, currPathNode.status, edge.to, edge.attr['runAfter'])) {
                dfs(edge.to, path);
              }
            }
          }
        }

        path.pop();
      }

      const graphCasesMap = nodeData['cases'] as Map<string, FlowGraph>;
      for (const [caseName, graphCase] of graphCasesMap) {
        const pathsCase = graphCase.getAllExecutionPathsRec(graphCase.getStartNode());
        for (const subpathCase of pathsCase) {
          const currPathNode = {
            ...basePathNode,
            caseResult: caseName,
            isDefaultCase: false,
            actions: subpathCase,
          } as SwitchPathNode;
          path.push(currPathNode);

          if (FlowGraph.isValidSubpath(subpathCase, currPathNode.status)) {
            if (this.isTerminalNode(nodeId, currPathNode.status)) {
              paths.push(path.slice());
            } else {
              for (const edge of this.getOutgoingEdges(nodeId)) {
                if (FlowGraph.shouldExpandSucc(path, currPathNode.status, edge.to, edge.attr['runAfter'])) {
                  dfs(edge.to, path);
                }
              }
            }
          }

          path.pop();
        }
      }
    };

    const dfsIf = (nodeId: string, path: PathNode[]) => {
      const nodeData = this.getNode(nodeId)!;
      const basePathNode = path.pop()!;

      const graphTrueBranch = nodeData['trueBranch'] as FlowGraph;
      const pathsTrueBranch = graphTrueBranch.getAllExecutionPathsRec(graphTrueBranch.getStartNode());
      for (const subpathTrueBranch of pathsTrueBranch) {
        const currPathNode = {
          ...basePathNode,
          conditionResult: true,
          actions: subpathTrueBranch,
        } as IfPathNode;
        path.push(currPathNode);

        if (FlowGraph.isValidSubpath(subpathTrueBranch, currPathNode.status)) {
          if (this.isTerminalNode(nodeId, currPathNode.status)) {
            paths.push(path.slice());
          } else {
            for (const edge of this.getOutgoingEdges(nodeId)) {
              if (FlowGraph.shouldExpandSucc(path, currPathNode.status, edge.to, edge.attr['runAfter'])) {
                dfs(edge.to, path);
              }
            }
          }
        }

        path.pop();
      }

      const graphFalseBranch = nodeData['falseBranch'] as FlowGraph;
      const pathsFalseBranch = graphFalseBranch.getAllExecutionPathsRec(graphFalseBranch.getStartNode());
      for (const subpathFalseBranch of pathsFalseBranch) {
        const currPathNode = {
          ...basePathNode,
          conditionResult: false,
          actions: subpathFalseBranch,
        } as IfPathNode;
        path.push(currPathNode);

        if (FlowGraph.isValidSubpath(subpathFalseBranch, currPathNode.status)) {
          if (this.isTerminalNode(nodeId, currPathNode.status)) {
            paths.push(path.slice());
          } else {
            for (const edge of this.getOutgoingEdges(nodeId)) {
              if (FlowGraph.shouldExpandSucc(path, currPathNode.status, edge.to, edge.attr['runAfter'])) {
                dfs(edge.to, path);
              }
            }
          }
        }

        path.pop();
      }
    };

    const dfsInner = (nodeId: string, status: FlowActionStatus, path: PathNode[]) => {
      const nodeData = this.getNode(nodeId)!;
      const nodeType = nodeData['type'];
      path.push({
        name: nodeId,
        type: nodeType,
        status: status,
      });

      if (nodeType === 'Switch') {
        dfsSwitch(nodeId, path);
        return;
      }

      if (nodeType === 'If') {
        dfsIf(nodeId, path);
        return;
      }

      if (this.isTerminalNode(nodeId, status)) {
        paths.push(path.slice());
      } else {
        for (const edge of this.getOutgoingEdges(nodeId)) {
          if (FlowGraph.shouldExpandSucc(path, status, edge.to, edge.attr['runAfter'])) {
            dfs(edge.to, path);
          }
        }
      }

      path.pop();
    };

    const dfs = (nodeId: string, path: PathNode[], isTriggerNode = false) => {
      if (isTriggerNode) {
        dfsInner(nodeId, 'SUCCEEDED', path);
      } else {
        for (const status of validStatuses) {
          dfsInner(nodeId, status, path);
        }
      }
    };

    dfs(startNodeId, [], isTrigger);
    return paths;
  }

  private addNodeRec(actionName: string, action: Record<string, any>, isChildAction = false) {
    const actionType = action['type'];
    if (unsupportedActions.has(actionType)) {
      throw new Error(localize('unsupportedAction', `Unsupported action type: "${actionType}".`));
    }

    if (actionType === 'Switch') {
      const graphDefaultCase = FlowGraph.Subgraph();
      const actionsDefaultCase = action['default']['actions'];
      for (const [childActionName, childAction] of Object.entries(actionsDefaultCase)) {
        graphDefaultCase.addNodeRec(childActionName, childAction, true);
      }

      const graphCasesMap = new Map<string, FlowGraph>();
      for (const [caseName, caseVal] of Object.entries(action['cases'])) {
        const graphCase = FlowGraph.Subgraph();
        const actionsCase = caseVal['actions'];
        for (const [childActionName, childAction] of Object.entries(actionsCase)) {
          graphCase.addNodeRec(childActionName, childAction, true);
        }
        graphCasesMap.set(caseName, graphCase);
      }

      this.addNode(actionName, { type: actionType, default: graphDefaultCase, cases: graphCasesMap });
    } else if (actionType === 'If') {
      const graphTrueBranch = FlowGraph.Subgraph();
      const actionsTrueBranch = action['actions'];
      for (const [childActionName, childAction] of Object.entries(actionsTrueBranch)) {
        graphTrueBranch.addNodeRec(childActionName, childAction, true);
      }

      const graphFalseBranch = FlowGraph.Subgraph();
      const actionsFalseBranch = action['else']['actions'];
      for (const [childActionName, childAction] of Object.entries(actionsFalseBranch)) {
        graphFalseBranch.addNodeRec(childActionName, childAction, true);
      }

      this.addNode(actionName, { type: actionType, trueBranch: graphTrueBranch, falseBranch: graphFalseBranch });
    } else {
      this.addNode(actionName, { type: actionType });
    }

    if ('runAfter' in action && Object.keys(action['runAfter']).length > 0) {
      const runAfter = action['runAfter'];
      if (Object.keys(runAfter).length > 1) {
        throw new Error(
          localize('invalidRunAfter', 'Multiple "runAfter" not supported on action "{0}": {1}', actionName, JSON.stringify(runAfter))
        );
      }

      const [[prevActionName, runAfterStatuses]] = Object.entries(runAfter);
      this.addEdge(prevActionName, actionName, { runAfter: runAfterStatuses });
    } else if (!isChildAction) {
      this.addEdge(this.triggerName!, actionName, { runAfter: ['SUCCEEDED'] });
    }
  }
}
