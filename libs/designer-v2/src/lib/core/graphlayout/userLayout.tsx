
import { useRootWorkflowGraphForLayout } from '../state/workflow/workflowSelectors';
import { useEffect, useState } from 'react';
import { type Node, type Edge, type XYPosition } from '@xyflow/react';
import { autoLayoutWorkflow } from './elklayout';
import type { LayoutType } from './helpers';
import type { WorkflowNode } from '../parsers/models/workflowNode';
import { DEFAULT_NODE_ORIGIN } from '../utils/graph';


export const useUserLayout = (): LayoutType => {
	const workflowGraph = useRootWorkflowGraphForLayout();
	const [graphResult, setGraphResult] = useState<LayoutType | undefined>();
	useEffect(() => {
		let active = true;
		layout()
		return () => { active = false; };

		async function layout() {
			setGraphResult(undefined);
			if (!workflowGraph?.children?.[0]?.position) {
				const res = await autoLayoutWorkflow(workflowGraph);
				if (!active) {
          return;
				}
				setGraphResult(res);
			} else {
        const res = convertWorkflowGraphToReactFlow(workflowGraph);
				setGraphResult(res);
			}
		}
	}, [workflowGraph]);

	return {
		nodes: graphResult?.nodes ?? [],
		edges: graphResult?.edges ?? [],
		size: graphResult?.size ?? [0, 0],
	};
};

export const convertWorkflowGraphToReactFlow = (rootNode: WorkflowNode | undefined): LayoutType => {
	if (!rootNode) {
		return { nodes: [], edges: [], size: [] };
	}

	const nodes: Node[] = [];
	const edges: Edge[] = [];

	let flowWidth: number = rootNode?.width ?? 0;
	let flowHeight: number = rootNode?.height ?? 0;

	let nodeIndex = 1;

	const processChildren = (node: WorkflowNode) => {
		const edgesBySource: Record<string, Edge[]> = {};
		if (node.edges) {
			// Put edge objects into a record by sourceId
			for (const edge of node.edges) {
				if (!edgesBySource[edge.source]) {
					edgesBySource[edge.source] = [];
				}
				edgesBySource[edge.source].push(edge);
			}
		}

		const pos = (node: WorkflowNode): XYPosition => {
			return node.position ?? { x: 0, y: 0 };
		}

		if (node.children) {

			// Sort node.children by y position then x position
			// node.children.sort((a, b) => (
			// 	pos(a).y === pos(b).y
			// 		? pos(a).x - pos(b).x
			// 		: pos(a).y - pos(b).y
			// ));

      for (const n of node.children) {
				const position = pos(n);
        const canExpandParent = !n.id.endsWith('-#scope');
				const nodeObject: Node = {
					id: n.id,
					position,
					type: n.type,
          origin: DEFAULT_NODE_ORIGIN,
          draggable: (n.children?.length ?? 0) === 0,
          selectable: (n.children?.length ?? 0) === 0,
					data: {
						label: n.id,
						nodeIndex: nodeIndex++,
						childIds: n.children?.map(c => c.id),
            size: {
              width: n.width,
              height: n.height,
            },
					},
					parentId: node.id !== 'root' ? node.id : undefined,
          expandParent: canExpandParent,
				};

				const nodeArrayIndex = nodes.push(nodeObject);

				const farWidth = position.x + (n?.width ?? 0);
				const farHeight = position.y + (n?.height ?? 0);
				if (farWidth > flowWidth) {
					flowWidth = farWidth;
				}
				if (farHeight > flowHeight) {
					flowHeight = farHeight;
				}

				if (n?.children) {
          processChildren(n);
				}

				// Add edges to the edges array
				if (edgesBySource[n.id]) {
					for (const edge of edgesBySource[n.id]) {
						if (edge.data) {
							edge.data['edgeIndex'] = nodeIndex++;
						}
						edges.push(edge);
					}
				}

				// Add leaf index to the node data
				nodes[nodeArrayIndex - 1].data['nodeLeafIndex'] = nodeIndex++;
			}
      
		}
	};

	processChildren(rootNode);

	return { nodes, edges, size: [flowWidth, flowHeight] };
};
