import { defaultCanvasZoom } from '../../constants/ReactFlowConstants';
import type { RootState } from '../../core/state/Store';
import { SchemaType } from '../../models';
import type { SchemaExtended } from '../../models';
import { nodeTypes } from '../../ui/ReactFlowWrapper';
import { useOverviewLayout } from '../../utils/ReactFlow.Util';
import { checkNodeStatuses } from '../targetSchemaPane/TargetSchemaPane';
import type { TargetNodesWithConnectionsDictionary } from '../targetSchemaPane/TargetSchemaPane';
import type { NodeToggledStateDictionary } from '../tree/TargetSchemaTreeItem';
import { Badge, makeStyles, shorthands } from '@fluentui/react-components';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
// eslint-disable-next-line import/no-named-as-default
import ReactFlow, { useViewport } from 'reactflow';

const reactFlowStyle: React.CSSProperties = {
  height: '100%',
  position: 'relative',
};

const useStyles = makeStyles({
  schemaNameBadge: {
    ...shorthands.overflow('hidden'),
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  },
});

interface ReactFlowSchemaOverviewProps {
  schema: SchemaExtended;
  schemaType: SchemaType;
  shouldTargetSchemaDisplayChevrons?: boolean;
}

export const ReactFlowSchemaOverview = ({ schema, schemaType, shouldTargetSchemaDisplayChevrons }: ReactFlowSchemaOverviewProps) => {
  const styles = useStyles();
  const reactFlowViewport = useViewport();

  const connectionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);

  const toggledStatesDictionary = useMemo<NodeToggledStateDictionary | undefined>(() => {
    if (schemaType !== SchemaType.Target) {
      return undefined;
    }

    // Find target schema nodes with connections
    const targetSchemaodesWithConnections: TargetNodesWithConnectionsDictionary = {};
    Object.values(connectionDictionary).forEach((connection) => {
      if (connection.self.reactFlowKey in targetSchemaDictionary) {
        targetSchemaodesWithConnections[connection.self.node.key] = true;
      }
    });

    // Recursively traverse the schema tree to calculate connected statuses from the leaf nodes up
    const newToggledStatesDictionary: NodeToggledStateDictionary = {};
    checkNodeStatuses(schema.schemaTreeRoot, newToggledStatesDictionary, targetSchemaodesWithConnections);

    return newToggledStatesDictionary;
  }, [schema, schemaType, connectionDictionary, targetSchemaDictionary]);

  const reactFlowNodes = useOverviewLayout(schema.schemaTreeRoot, schemaType, shouldTargetSchemaDisplayChevrons, toggledStatesDictionary);

  const schemaNameBadgeCoords = { x: reactFlowViewport.x, y: reactFlowViewport.y - 24 };

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
      fitViewOptions={{ maxZoom: defaultCanvasZoom }}
      fitView
    >
      <Badge
        className={styles.schemaNameBadge}
        style={{ position: 'absolute', top: `${schemaNameBadgeCoords.y}px`, left: `${schemaNameBadgeCoords.x}px` }}
        appearance="tint"
        shape="rounded"
        color="informative"
      >
        {schema.name}
      </Badge>
    </ReactFlow>
  );
};
