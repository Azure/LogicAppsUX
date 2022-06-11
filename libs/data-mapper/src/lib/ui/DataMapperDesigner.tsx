import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import type { RootState } from '../core/state/Store';
import { LeftHandPanel } from './LeftHandPanel';
import type { ILayerProps } from '@fluentui/react';
import { LayerHost } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import { useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from 'react-flow-renderer';
import ReactFlow, { ReactFlowProvider } from 'react-flow-renderer';
import { useSelector } from 'react-redux';

export const DataMapperDesigner = () => {
  const layerHostId = useId('layerHost');
  const panelLayerProps: ILayerProps = {
    hostId: layerHostId,
  };

  const [nodes, edges] = useLayout();

  return (
    <DndProvider backend={HTML5Backend}>
      <div>
        <div style={{ height: '20px' }}></div>
        <div
          style={{
            // TODO - Remove
            border: '1px solid #ccc',
          }}
        >
          <EditorCommandBar />
          <LayerHost
            id={layerHostId}
            style={{
              // TODO - Remove
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div className="msla-designer-canvas msla-panel-mode">
              <ReactFlowProvider>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  minZoom={0}
                  nodesDraggable={false}
                  fitView
                  proOptions={{
                    account: 'paid-sponsor',
                    hideAttribution: true,
                  }}
                  style={{
                    position: 'unset',
                  }}
                ></ReactFlow>
              </ReactFlowProvider>
              <LeftHandPanel layerProps={panelLayerProps} />
            </div>
          </LayerHost>
        </div>
      </div>
    </DndProvider>
  );
};

export const useLayout = (): [ReactFlowNode[], ReactFlowEdge[]] => {
  const [reactFlowNodes, setReactFlowNodes] = useState<ReactFlowNode[]>([]);
  const [reactFlowEdges, setReactFlowEdges] = useState<ReactFlowEdge[]>([]);
  const reactFlowGraph = useSelector((state: RootState) => state.reactFlow.graph);

  useEffect(() => {
    if (!reactFlowGraph) {
      return;
    }

    setReactFlowNodes(reactFlowGraph);
    setReactFlowEdges([]);
  }, [reactFlowGraph]);

  return [reactFlowNodes, reactFlowEdges];
};
