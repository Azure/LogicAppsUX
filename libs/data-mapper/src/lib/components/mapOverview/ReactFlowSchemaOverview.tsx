import { defaultCanvasZoom } from '../../constants/ReactFlowConstants';
import type { SchemaExtended, SchemaType } from '../../models';
import { nodeTypes } from '../../ui/ReactFlowWrapper';
import { useOverviewLayout } from '../../utils/ReactFlow.Util';
import { Badge, makeStyles, shorthands } from '@fluentui/react-components';
// eslint-disable-next-line import/no-named-as-default
import ReactFlow, { useViewport } from 'reactflow';

// TODO (#16023841): Status icon - probably needs to be on actual SchemaNodeCard component

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
  const reactFlowNodes = useOverviewLayout(schema.schemaTreeRoot, schemaType, shouldTargetSchemaDisplayChevrons);

  const badgeCoords = { x: reactFlowViewport.x, y: reactFlowViewport.y - 24 };

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
        style={{ position: 'absolute', top: `${badgeCoords.y}px`, left: `${badgeCoords.x}px` }}
        appearance="tint"
        shape="rounded"
        color="informative"
      >
        {schema.name}
      </Badge>
    </ReactFlow>
  );
};
