import { defaultCanvasZoom } from '../../constants/ReactFlowConstants';
import type { SchemaExtended, SchemaType } from '../../models';
import { nodeTypes } from '../../ui/ReactFlowWrapper';
import { useOverviewLayout } from '../../utils/ReactFlow.Util';
import { Badge, makeStyles, shorthands } from '@fluentui/react-components';
// eslint-disable-next-line import/no-named-as-default
import ReactFlow from 'reactflow';

// TODO: Status icon - probably needs to be on actual SchemaNodeCard component

const reactFlowStyle = {
  height: '100%',
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
}

export const ReactFlowSchemaOverview = ({ schema, schemaType }: ReactFlowSchemaOverviewProps) => {
  const styles = useStyles();
  const reactFlowNodes = useOverviewLayout(schema.schemaTreeRoot, schemaType, true);

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
      <Badge className={styles.schemaNameBadge} appearance="tint" shape="rounded" color="informative">
        {schema.name}
      </Badge>
    </ReactFlow>
  );
};
