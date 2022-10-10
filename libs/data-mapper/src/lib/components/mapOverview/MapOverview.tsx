import { defaultCanvasZoom } from '../../constants/ReactFlowConstants';
import { openSourceSchemaPanel, openTargetSchemaPanel } from '../../core/state/PanelSlice';
import type { AppDispatch } from '../../core/state/Store';
import type { SchemaExtended } from '../../models/';
import { SchemaTypes } from '../../models/';
import { nodeTypes } from '../../ui/ReactFlowWrapper';
import { convertToReactFlowParentAndChildNodes } from '../../utils/ReactFlow.Util';
import { SelectSchemaCard } from '../schemaSelection/selectSchemaCard';
import { Stack } from '@fluentui/react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { useMemo } from 'react';
import { useDispatch } from 'react-redux';
// eslint-disable-next-line import/no-named-as-default
import ReactFlow, { ReactFlowProvider } from 'reactflow';
import type { Node as ReactFlowNode, Viewport } from 'reactflow';

const defaultViewport: Viewport = { x: 0, y: 0, zoom: defaultCanvasZoom };

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
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  schemaCardStackStyles: {
    height: '100%',
    width: '50%',
  },
});

const reactFlowStyle = {
  background: '#e0e0e0',
  height: '100%',
};

interface LayeredReactFlowProps {
  schema: SchemaExtended;
  isSourceSchema?: boolean;
}

const LayeredReactFlow = ({ schema, isSourceSchema }: LayeredReactFlowProps) => {
  const reactFlowNodes = useMemo(() => {
    const reactFlowNodes: ReactFlowNode[] = [];

    // TODO/NOTE: This placeholder doesn't seem to impact currently expected positioning, so it
    // can be safely left alone until further dev is done in this area (likely thanks to fitView)
    const viewportCoordsPlaceholder = { startX: 0, startY: 0, endX: 0, endY: 0 };

    if (isSourceSchema) {
      reactFlowNodes.push(
        ...convertToReactFlowParentAndChildNodes(viewportCoordsPlaceholder, schema.schemaTreeRoot, SchemaTypes.Source, false, {})
      );
    } else {
      reactFlowNodes.push(
        ...convertToReactFlowParentAndChildNodes(viewportCoordsPlaceholder, schema.schemaTreeRoot, SchemaTypes.Target, false, {})
      );
    }

    return reactFlowNodes;
  }, [schema, isSourceSchema]);

  return (
    <ReactFlow
      nodes={reactFlowNodes}
      nodesDraggable={false}
      panOnDrag={false}
      zoomOnDoubleClick={false}
      zoomOnPinch={false}
      zoomOnScroll={false}
      defaultViewport={defaultViewport}
      proOptions={{
        account: 'paid-sponsor',
        hideAttribution: true,
      }}
      nodeTypes={nodeTypes}
      style={reactFlowStyle}
      fitView
    />
  );
};

export interface MapOverviewProps {
  sourceSchema?: SchemaExtended;
  targetSchema?: SchemaExtended;
}

export const MapOverview: React.FC<MapOverviewProps> = ({ sourceSchema, targetSchema }: MapOverviewProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const styles = useStyles();

  const onSourceSchemaClick = () => {
    dispatch(openSourceSchemaPanel());
  };
  const onTargetSchemaClick = () => {
    dispatch(openTargetSchemaPanel());
  };

  return (
    <div className={styles.mapOverviewStyles} style={reactFlowStyle}>
      <Stack verticalAlign="center" className={styles.schemaCardStackStyles}>
        {sourceSchema ? (
          <ReactFlowProvider>
            <LayeredReactFlow schema={sourceSchema} isSourceSchema />
          </ReactFlowProvider>
        ) : (
          <SelectSchemaCard schemaType={SchemaTypes.Source} onClick={onSourceSchemaClick} />
        )}
      </Stack>
      <Stack verticalAlign="center" className={styles.schemaCardStackStyles}>
        {targetSchema ? (
          <ReactFlowProvider>
            <LayeredReactFlow schema={targetSchema} />
          </ReactFlowProvider>
        ) : (
          <SelectSchemaCard schemaType={SchemaTypes.Target} onClick={onTargetSchemaClick} />
        )}
      </Stack>
    </div>
  );
};
