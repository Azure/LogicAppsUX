import { baseCanvasHeight, defaultCanvasZoom } from '../../constants/ReactFlowConstants';
import { openSourceSchemaPanel, openTargetSchemaPanel } from '../../core/state/PanelSlice';
import type { AppDispatch } from '../../core/state/Store';
import type { SchemaExtended } from '../../models/';
import { SchemaTypes } from '../../models/';
import { convertToReactFlowParentAndChildNodes } from '../../utils/ReactFlow.Util';
import { SchemaCard } from '../nodeCard/SchemaCard';
import { SelectSchemaCard } from '../schemaSelection/selectSchemaCard';
import { makeStyles, shorthands } from '@fluentui/react-components';
import { useMemo } from 'react';
import type { Node as ReactFlowNode } from 'react-flow-renderer';
import ReactFlow, { ReactFlowProvider } from 'react-flow-renderer';
import { useDispatch } from 'react-redux';

const useStyles = makeStyles({
  mapOverviewStyles: {
    height: '100%',
    width: '100%',
    backgroundColor: '#edebe9',
    minHeight: 0,
    ...shorthands.overflow('hidden'),
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
  },
});

const reactFlowStyle = {
  background: '#e0e0e0',
};

export interface MapOverviewProps {
  sourceSchema?: SchemaExtended;
  targetSchema?: SchemaExtended;
}

export const MapOverview: React.FC<MapOverviewProps> = ({ sourceSchema, targetSchema }: MapOverviewProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const styles = useStyles();

  const reactFlowNodes = useMemo(() => {
    const reactFlowNodes: ReactFlowNode[] = [];
    if (sourceSchema) {
      reactFlowNodes.push(...convertToReactFlowParentAndChildNodes(sourceSchema.schemaTreeRoot, SchemaTypes.Input, false));
    }

    if (targetSchema) {
      reactFlowNodes.push(...convertToReactFlowParentAndChildNodes(targetSchema.schemaTreeRoot, SchemaTypes.Output, false));
    }

    return reactFlowNodes;
  }, [sourceSchema, targetSchema]);

  const onSourceSchemaClick = () => {
    dispatch(openSourceSchemaPanel());
  };
  const onTargetSchemaClick = () => {
    dispatch(openTargetSchemaPanel());
  };

  const nodeTypes = useMemo(() => ({ schemaNode: SchemaCard }), []);

  const layeredReactFlow = (
    <div className={styles.mapOverviewStyles} style={{ height: baseCanvasHeight }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={reactFlowNodes}
          nodesDraggable={false}
          panOnDrag={false}
          zoomOnDoubleClick={false}
          zoomOnPinch={false}
          zoomOnScroll={false}
          defaultZoom={defaultCanvasZoom}
          proOptions={{
            account: 'paid-sponsor',
            hideAttribution: true,
          }}
          nodeTypes={nodeTypes}
          style={reactFlowStyle}
          fitView
        ></ReactFlow>
      </ReactFlowProvider>
    </div>
  );

  return (
    <div className={styles.mapOverviewStyles} style={reactFlowStyle}>
      <div style={{ width: '50%' }}>
        {sourceSchema ? layeredReactFlow : <SelectSchemaCard schemaType={SchemaTypes.Input} onClick={onSourceSchemaClick} />}
      </div>
      <div style={{ width: '50%' }}>
        {targetSchema ? layeredReactFlow : <SelectSchemaCard schemaType={SchemaTypes.Output} onClick={onTargetSchemaClick} />}
      </div>
    </div>
  );
};
