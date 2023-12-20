import { reactFlowFitViewOptions, ReactFlowNodeType } from '../../constants/ReactFlowConstants';
import type { RootState } from '../../core/state/Store';
import { useOverviewLayout } from '../../utils/ReactFlow.Util';
import { SchemaCard } from '../nodeCard/SchemaCard';
import { SchemaNameBadge } from '../schemaSelection/SchemaNameBadge';
import { SelectSchemaCard } from '../schemaSelection/SelectSchemaCard';
import type { TargetNodesWithConnectionsDictionary } from '../sidePane/tabs/targetSchemaTab/TargetSchemaTab';
import { checkNodeStatuses } from '../sidePane/tabs/targetSchemaTab/TargetSchemaTab';
import type { NodeToggledStateDictionary } from '../tree/TargetSchemaTreeItem';
import { Stack } from '@fluentui/react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { SchemaType } from '@microsoft/utils-logic-apps';
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
// eslint-disable-next-line import/no-named-as-default
import ReactFlow, { useReactFlow } from 'reactflow';

const reactFlowStyle: React.CSSProperties = {
  height: '100%',
  position: 'relative',
};

const useStyles = makeStyles({
  mapOverviewStyles: {
    height: '100%',
    width: '100%',
    backgroundColor: tokens.colorNeutralBackground6,
    minHeight: 0,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
});

export const MapOverview = () => {
  const { fitView } = useReactFlow();

  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedTargetSchema);

  const targetSchemaStates = useMemo<NodeToggledStateDictionary>(() => {
    if (!targetSchema) {
      return {};
    }

    // Find target schema nodes with connections
    const tgtSchemaNodesWithConnections: TargetNodesWithConnectionsDictionary = {};
    Object.values(connectionDictionary).forEach((connection) => {
      if (connection.self.reactFlowKey in targetSchemaDictionary && connection.inputs[0] && connection.inputs[0].length > 0) {
        tgtSchemaNodesWithConnections[connection.self.node.key] = true;
      }
    });

    // Recursively traverse the schema tree to calculate connected statuses from the leaf nodes up
    const newToggledStatesDictionary: NodeToggledStateDictionary = {};
    checkNodeStatuses(targetSchema.schemaTreeRoot, newToggledStatesDictionary, tgtSchemaNodesWithConnections);

    return newToggledStatesDictionary;
  }, [targetSchema, connectionDictionary, targetSchemaDictionary]);

  const reactFlowNodes = useOverviewLayout(sourceSchema?.schemaTreeRoot, targetSchema?.schemaTreeRoot, targetSchemaStates);

  // Fit the canvas view any time a schema changes
  useEffect(() => {
    fitView(reactFlowFitViewOptions);
  }, [fitView, sourceSchema?.schemaTreeRoot.key, targetSchema?.schemaTreeRoot.key]);

  const schemaNodeTypes = useMemo(() => ({ [ReactFlowNodeType.SchemaNode]: SchemaCard }), []);

  // Find first schema node (should be schemaTreeRoot) for source and target to use its xPos for schema name badge
  const srcSchemaTreeRootXPos = useMemo(
    () =>
      reactFlowNodes.find((reactFlowNode) => reactFlowNode.data?.schemaType && reactFlowNode.data.schemaType === SchemaType.Source)
        ?.position.x ?? 0,
    [reactFlowNodes]
  );

  const tgtSchemaTreeRootXPos = useMemo(
    () =>
      reactFlowNodes.find((reactFlowNode) => reactFlowNode.data?.schemaType && reactFlowNode.data.schemaType === SchemaType.Target)
        ?.position.x ?? 0,
    [reactFlowNodes]
  );

  const styles = useStyles();

  return (
    <div className={styles.mapOverviewStyles}>
      <ReactFlow
        nodeTypes={schemaNodeTypes}
        nodes={reactFlowNodes}
        nodesDraggable={false}
        proOptions={{
          account: 'paid-sponsor',
          hideAttribution: true,
        }}
        style={reactFlowStyle}
        fitViewOptions={reactFlowFitViewOptions}
        fitView
      >
        <Stack horizontal horizontalAlign="space-around" verticalAlign="center" style={{ height: '100%' }}>
          <SelectSchemaCard schemaType={SchemaType.Source} style={{ visibility: !sourceSchema ? 'visible' : 'hidden' }} />

          <SelectSchemaCard schemaType={SchemaType.Target} style={{ visibility: !targetSchema ? 'visible' : 'hidden' }} />
        </Stack>

        {sourceSchema && <SchemaNameBadge schemaName={sourceSchema.name} schemaTreeRootXPos={srcSchemaTreeRootXPos} />}
        {targetSchema && <SchemaNameBadge schemaName={targetSchema.name} schemaTreeRootXPos={tgtSchemaTreeRootXPos} />}
      </ReactFlow>
    </div>
  );
};
