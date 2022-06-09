import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import { LeftHandPanel } from './LeftHandPanel';
import type { ILayerProps } from '@fluentui/react';
import { LayerHost } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import ReactFlow, { ReactFlowProvider } from 'react-flow-renderer';

export const DataMapperDesigner = () => {
  const layerHostId = useId('layerHost');
  const panelLayerProps: ILayerProps = {
    hostId: layerHostId,
  };

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
                  minZoom={0}
                  nodesDraggable={false}
                  proOptions={{
                    account: 'paid-sponsor',
                    hideAttribution: true,
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
