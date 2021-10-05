// /* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import ReactFlow, { ReactFlowProvider, addEdge, removeElements, isNode, useZoomPanHelper } from 'react-flow-renderer';
import dagre from 'dagre';
import { fetchworkflow } from './workflow-parser';


import { CustomConnectionLine } from './CustomConnectionLine';
const edgeTypes = {
  type: CustomConnectionLine,
};
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

// In order to keep this example simple the node width and height are hardcoded.
// In a real world app you would use the correct width and height values of
// const nodes = useStoreState(state => state.nodes) and then node.__rf.width, node.__rf.height

const getLayoutedElements = (elements: any, direction = 'TB') => {
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction });

  elements.forEach((el: any) => {
    if (isNode(el)) {
      dagreGraph.setNode(el.id, { width: 172 * 2, height: 54 * 2 });
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
  const [direction, setDirection] = useState<'TB' | 'LR'>('TB');

  useEffect(() => {
    fetchworkflow().then((x) => setElements(getLayoutedElements(x, direction)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [direction]);
  const { fitView } = useZoomPanHelper();
  if (!elements) {
    return <></>;
  }
  const onConnect = (params: any) => setElements((els: any) => addEdge({ ...params, type: 'type', animated: true }, els));
  const onElementsRemove = (elementsToRemove: any) => setElements((els: any) => removeElements(elementsToRemove, els));

  return (
    <>
      <ReactFlow
        elements={elements}
        onConnect={onConnect}
        minZoom={0}
        nodesDraggable={false}
        edgeTypes={edgeTypes}
        onElementsRemove={onElementsRemove}></ReactFlow>
      <div className="controls">
        <button onClick={() => setDirection('TB')}>vertical layout</button>
        <button onClick={() => setDirection('LR')}>horizontal layout</button>
        <button onClick={() => fitView({ padding: 0.2, includeHiddenNodes: true })}>zoom out</button>
      </div>
    </>
  );
};
