import { openInputSchemaPanel, openOutputSchemaPanel } from '../../core/state/PanelSlice';
import type { AppDispatch } from '../../core/state/Store';
import type { SchemaExtended } from '../../models/';
import { SchemaTypes } from '../../models/';
import { convertToReactFlowParentAndChildNodes } from '../../utils/ReactFlow.Util';
import { SchemaCard } from '../nodeCard/SchemaCard';
import { SelectSchemaCard } from '../schemaSelection/selectSchemaCard';
import { useMemo } from 'react';
import type { Node as ReactFlowNode } from 'react-flow-renderer';
import ReactFlow, { ReactFlowProvider } from 'react-flow-renderer';
import { useDispatch } from 'react-redux';

export interface MapOverviewProps {
  inputSchema?: SchemaExtended;
  outputSchema?: SchemaExtended;
}

export const MapOverview: React.FC<MapOverviewProps> = ({ inputSchema, outputSchema }: MapOverviewProps) => {
  const dispatch = useDispatch<AppDispatch>();

  const reactFlowNodes = useMemo(() => {
    const reactFlowNodes: ReactFlowNode[] = [];
    if (inputSchema) {
      reactFlowNodes.push(...convertToReactFlowParentAndChildNodes(inputSchema.schemaTreeRoot, SchemaTypes.Input, false));
    }

    if (outputSchema) {
      reactFlowNodes.push(...convertToReactFlowParentAndChildNodes(outputSchema.schemaTreeRoot, SchemaTypes.Output, false));
    }

    return reactFlowNodes;
  }, [inputSchema, outputSchema]);

  const onInputSchemaClick = () => {
    dispatch(openInputSchemaPanel());
  };
  const onOutputSchemaClick = () => {
    dispatch(openOutputSchemaPanel());
  };

  const reactFlowStyle = {
    background: '#e0e0e0',
  };

  const nodeTypes = useMemo(() => ({ schemaNode: SchemaCard }), []);

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
