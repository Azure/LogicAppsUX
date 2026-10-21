import type { WorkflowPreviewGraph } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { layoutWorkflowGraph } from '../core/graphlayout/elklayout';
import type { WorkflowNode } from '../core/parsers/models/workflowNode';
import type { ReadOnlyWorkflowGraphData } from './ReadOnlyWorkflowGraph';

export interface ReadOnlyLayoutState {
  loading: boolean;
  error?: unknown;
}

/** Measure native leaf heights, then lay out only an owned graph. Never applies work from a replaced graph or unmounted view. */
export const useReadOnlyGraphLayout = (graph: ReadOnlyWorkflowGraphData, onLayoutStateChange?: (state: ReadOnlyLayoutState) => void) => {
  const [layout, setLayout] = useState<{ owner: ReadOnlyWorkflowGraphData; view: ReadOnlyWorkflowGraphData }>();
  const owner = useRef(graph);
  owner.current = graph;
  const listener = useRef(onLayoutStateChange);
  listener.current = onLayoutStateChange;
  const generation = useRef(0);
  const mounted = useRef(false);
  const layoutSource = useMemo(() => (graph.layoutSource ? structuredClone(graph.layoutSource) : undefined), [graph]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current++;
    };
  }, [graph]);

  const onNodeSizesChange = useCallback<NonNullable<WorkflowPreviewGraph['onNodeSizesChange']>>(
    (sizes) => {
      if (!layoutSource) {
        return;
      }
      let changed = false;
      const updateSizes = (node: WorkflowNode) => {
        if (node.children?.length) {
          node.children.forEach(updateSizes);
        } else {
          const size = sizes[node.id];
          if (size && (node.width !== size.width || node.height !== size.height)) {
            node.width = size.width;
            node.height = size.height;
            changed = true;
          }
        }
      };
      updateSizes(layoutSource);
      if (!changed) {
        return;
      }
      const request = ++generation.current;
      listener.current?.({ loading: true });
      layoutWorkflowGraph(layoutSource, true)
        .then(([nodes, edges]) => {
          if (!mounted.current || owner.current !== graph || generation.current !== request) {
            return;
          }
          const originals = new Map(graph.nodes.map((node) => [node.id, node]));
          const originalEdges = new Map(graph.edges.map((edge) => [edge.id, edge]));
          setLayout({
            owner: graph,
            view: {
              ...graph,
              nodes: nodes.map((node) => ({
                ...originals.get(node.id)!,
                position: node.position,
                width: node.data.size?.width ?? sizes[node.id]?.width ?? originals.get(node.id)?.width,
                height: node.data.size?.height ?? sizes[node.id]?.height ?? originals.get(node.id)?.height,
              })),
              edges: edges.map((edge) => ({
                ...originalEdges.get(edge.id)!,
                data: { ...originalEdges.get(edge.id)?.data, ...edge.data },
              })),
            },
          });
          listener.current?.({ loading: false });
        })
        .catch((error: unknown) => {
          if (mounted.current && owner.current === graph && generation.current === request) {
            listener.current?.({ loading: false, error });
          }
        });
    },
    [graph, layoutSource]
  );
  return { view: layout?.owner === graph ? layout.view : graph, onNodeSizesChange };
};
