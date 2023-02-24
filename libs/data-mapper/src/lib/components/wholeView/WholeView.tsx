import { reactFlowFitViewOptions, ReactFlowNodeType } from '../../constants/ReactFlowConstants';
import type { RootState } from '../../core/state/Store';
import { SchemaType } from '../../models/';
import { useWholeViewLayout } from '../../utils/ReactFlow.Util';
import { SchemaCard } from '../nodeCard/SchemaCard';
import { SimpleFunctionCard } from '../nodeCard/functionCard/SimpleFunctionCard';
import { SchemaNameBadge } from '../schemaSelection/SchemaNameBadge';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
// eslint-disable-next-line import/no-named-as-default
import ReactFlow, { ReactFlowProvider, useReactFlow } from 'reactflow';

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

export const WholeMapOverview = () => {
  const styles = useStyles();

  return (
    <div className={styles.mapOverviewStyles}>
      <ReactFlowProvider>
        <WholeOverviewReactFlowWrapper />
      </ReactFlowProvider>
    </div>
  );
};

const WholeOverviewReactFlowWrapper = () => {
  const { fitView } = useReactFlow();

  const sourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.targetSchema);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedSourceSchema);
  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);

  const [reactFlowNodes, reactFlowEdges] = useWholeViewLayout(sourceSchemaDictionary, targetSchemaDictionary, connectionDictionary);

  // Fit the canvas view any time a schema changes
  useEffect(() => {
    fitView(reactFlowFitViewOptions);
  }, [fitView, sourceSchema?.schemaTreeRoot.key, targetSchema?.schemaTreeRoot.key]);

  const nodeTypes = useMemo(
    () => ({
      [ReactFlowNodeType.SchemaNode]: SchemaCard,
      [ReactFlowNodeType.FunctionNode]: SimpleFunctionCard,
    }),
    []
  );
  //const edgeTypes = useMemo(() => ({ [ReactFlowEdgeType.ConnectionEdge]: ConnectionEdge }), []);

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

  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      //edgeTypes={edgeTypes}
      nodes={reactFlowNodes}
      edges={reactFlowEdges}
      nodesDraggable={false}
      proOptions={{
        account: 'paid-sponsor',
        hideAttribution: true,
      }}
      style={reactFlowStyle}
      fitViewOptions={reactFlowFitViewOptions}
      fitView
      minZoom={0.05}
    >
      {sourceSchema && <SchemaNameBadge schemaName={sourceSchema.name} schemaTreeRootXPos={srcSchemaTreeRootXPos} />}
      {targetSchema && <SchemaNameBadge schemaName={targetSchema.name} schemaTreeRootXPos={tgtSchemaTreeRootXPos} />}
    </ReactFlow>
  );
};
