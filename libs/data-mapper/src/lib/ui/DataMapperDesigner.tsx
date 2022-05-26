import { LeftHandPanel } from './LeftHandPanel';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ReactFlow, { ReactFlowProvider } from 'react-flow-renderer';

export const DataMapperDesigner = () => {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="msla-designer-canvas msla-panel-mode">
        <ReactFlowProvider>
          <ReactFlow
            minZoom={0}
            nodesDraggable={false}
            proOptions={{
              account: 'paid-sponsor',
              hideAttribution: true,
            }}
          ></ReactFlow>
        </ReactFlowProvider>
        <LeftHandPanel />
      </div>
    </DndProvider>
  );
};
