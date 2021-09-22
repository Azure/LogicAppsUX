// /* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  removeElements,
  isNode,
  ConnectionLineType,
  useStoreState,
  Node,
  useZoomPanHelper,
} from 'react-flow-renderer';
import dagre from 'dagre';
import { fetchworkflow } from './workflow-parser';
import './layout.less';

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// In order to keep this example simple the node width and height are hardcoded.
// In a real world app you would use the correct width and height values of
// const nodes = useStoreState(state => state.nodes) and then node.__rf.width, node.__rf.height

const getLayoutedElements = (elements: any, nodes: Node<any>[], direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  elements.forEach((el: any) => {
    if (isNode(el)) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const node: Node<any> = nodes.find((x) => x.id === el.id)!;
      dagreGraph.setNode(el.id, { width: (node?.__rf?.width ?? 0) * 2, height: (node?.__rf?.height ?? 0) * 2 });
    } else {
      dagreGraph.setEdge(el.source, el.target);
    }
  });

  dagre.layout(dagreGraph);

  return elements.map((el: any) => {
    if (isNode(el)) {
      const nodeWithPosition = dagreGraph.node(el.id);
      el.targetPosition = isHorizontal ? 'left' : ('top' as any);
      el.sourcePosition = isHorizontal ? 'right' : ('bottom' as any);

      // unfortunately we need this little hack to pass a slightly different position
      // to notify react flow about the change. Moreover we are shifting the dagre node position
      // (anchor=center center) to the top left so it matches the react flow node anchor point (top left).
      el.position = {
        x: nodeWithPosition.x,
        y: nodeWithPosition.y,
      };
    }

    return el;
  });
};

export const ReactFlowFromWorkflow = () => {
  return (
    <div className="layoutflow">
      <ReactFlowProvider>
        <Flow />
      </ReactFlowProvider>
    </div>
  );
};

const Flow = () => {
  const [elements, setElements] = useState<any[]>([]);
  const nodes = useStoreState((state) => state.nodes);
  const [direction, setDirection] = useState<'TB' | 'LR'>('TB');

  useEffect(() => {
    fetchworkflow().then((x) => setElements(getLayoutedElements(x, nodes, direction)));
  }, [nodes, direction]);
  const { fitView } = useZoomPanHelper();
  if (!elements) {
    return <></>;
  }
  const onConnect = (params: any) =>
    setElements((els: any) => addEdge({ ...params, type: ConnectionLineType.Bezier, animated: true }, els));
  const onElementsRemove = (elementsToRemove: any) => setElements((els: any) => removeElements(elementsToRemove, els));

  return (
    <>
      <ReactFlow
        elements={elements}
        onConnect={onConnect}
        maxZoom={5000}
        nodesDraggable={false}
        onElementsRemove={onElementsRemove}
        connectionLineType={ConnectionLineType.Bezier}></ReactFlow>
      <div className="controls">
        <button onClick={() => setDirection('TB')}>vertical layout</button>
        <button onClick={() => setDirection('LR')}>horizontal layout</button>
        <button onClick={() => fitView({ padding: 0.2, includeHiddenNodes: true })}>zoom out</button>
      </div>
    </>
  );
};
