import { convertToReactFlowNode } from '../../ReactFlow.Util';
import { openInputSchemaPanel, openOutputSchemaPanel } from '../../core/state/PanelSlice';
import type { AppDispatch } from '../../core/state/Store';
import type { SchemaExtended } from '../../models/';
import { SchemaTypes } from '../configPanel/EditorConfigPanel';
import { SchemaCard } from '../nodeCard/SchemaCard';
import { SelectSchemaCard } from '../schemaSelection/selectSchemaCard';
import { useMemo } from 'react';
import ReactFlow, { ReactFlowProvider } from 'react-flow-renderer';
import { useDispatch } from 'react-redux';

export interface MapOverviewProps {
  inputSchema?: SchemaExtended;
  outputSchema?: SchemaExtended;
}

export const MapOverview: React.FC<MapOverviewProps> = ({ inputSchema, outputSchema }: MapOverviewProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const reactFlowNodes = useMemo(() => {
    return convertToReactFlowNode(inputSchema?.schemaTreeRoot, outputSchema?.schemaTreeRoot);
  }, [inputSchema, outputSchema]);

  const onInputSchemaClick = () => {
    dispatch(openInputSchemaPanel());
  };
  const onOutputSchemaClick = () => {
    dispatch(openOutputSchemaPanel());
  };

  const reactFlowStyle = {
    background: '#e0e0e0',
    height: '600px',
  };

  const nodeTypes = useMemo(() => ({ schemaCard: SchemaCard }), []);

  const layeredReactFlow = (
    <div className="msla-designer-canvas msla-panel-mode">
      <ReactFlowProvider>
        <ReactFlow
          nodes={reactFlowNodes}
          nodesDraggable={false}
          fitView
          panOnDrag={false}
          zoomOnDoubleClick={false}
          zoomOnPinch={false}
          zoomOnScroll={false}
          proOptions={{
            account: 'paid-sponsor',
            hideAttribution: true,
          }}
          nodeTypes={nodeTypes}
          style={reactFlowStyle}
        ></ReactFlow>
      </ReactFlowProvider>
    </div>
  );

  return (
    <div className="msla-designer-canvas msla-panel-mode not-loaded" style={reactFlowStyle}>
      <div className="left">
        {inputSchema ? layeredReactFlow : <SelectSchemaCard schemaType={SchemaTypes.Input} onClick={onInputSchemaClick} />}
      </div>
      <div className="right">
        {outputSchema ? layeredReactFlow : <SelectSchemaCard schemaType={SchemaTypes.Output} onClick={onOutputSchemaClick} />}
      </div>
    </div>
  );
};
