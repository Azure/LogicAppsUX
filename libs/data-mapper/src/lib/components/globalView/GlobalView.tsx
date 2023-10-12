import { ReactFlowNodeType, reactFlowFitViewOptions } from '../../constants/ReactFlowConstants';
import type { RootState } from '../../core/state/Store';
import { SchemaType } from '../../models';
import { useGlobalViewLayout } from '../../utils/ReactFlow.Util';
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

export const GlobalView = () => {
  const styles = useStyles();

  return (
    <div className={styles.mapOverviewStyles}>
      <ReactFlowProvider>
        <GlobalViewReactFlowWrapper />
      </ReactFlowProvider>
    </div>
  );
};

const GlobalViewReactFlowWrapper = () => {
  const { fitView } = useReactFlow();

  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedSourceSchema);
  const targetSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedTargetSchema);

  const [reactFlowNodes, reactFlowEdges] = useGlobalViewLayout(
    undefined,
    sourceSchemaDictionary,
    targetSchemaDictionary,
    functionNodeDictionary,
    connectionDictionary
  );

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
