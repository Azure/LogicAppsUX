import { openSourceSchemaPanel, openTargetSchemaPanel } from '../../core/state/PanelSlice';
import type { AppDispatch } from '../../core/state/Store';
import type { SchemaExtended } from '../../models/';
import { SchemaType } from '../../models/';
import { nodeTypes } from '../../ui/ReactFlowWrapper';
import { useLayout } from '../../utils/ReactFlow.Util';
import { SelectSchemaCard } from '../schemaSelection/selectSchemaCard';
import { Stack } from '@fluentui/react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { useDispatch } from 'react-redux';
// eslint-disable-next-line import/no-named-as-default
import ReactFlow, { ReactFlowProvider } from 'reactflow';

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

const LayeredReactFlow = ({ schema }: LayeredReactFlowProps) => {
  const [reactFlowNodes, _reactFlowEdges] = useLayout([], [], {}, {}, schema.schemaTreeRoot, {}, undefined);

  return (
    <ReactFlow
      nodes={reactFlowNodes}
      nodesDraggable={false}
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
          <SelectSchemaCard schemaType={SchemaType.Source} onClick={onSourceSchemaClick} />
        )}
      </Stack>
      <Stack verticalAlign="center" className={styles.schemaCardStackStyles}>
        {targetSchema ? (
          <ReactFlowProvider>
            <LayeredReactFlow schema={targetSchema} />
          </ReactFlowProvider>
        ) : (
          <SelectSchemaCard schemaType={SchemaType.Target} onClick={onTargetSchemaClick} />
        )}
      </Stack>
    </div>
  );
};
