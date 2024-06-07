import type { AppDispatch, RootState } from '../core/state/Store';
import { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useSelector, useDispatch } from 'react-redux';
import type { Connection, Node, Edge, ConnectionLineComponent } from 'reactflow';
import ReactFlow, { ReactFlowProvider, addEdge } from 'reactflow';
import { AddSchemaDrawer } from '../components/addSchema/AddSchemaPanel';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import { reactFlowStyle, useStaticStyles, useStyles } from './styles';
import { Panel as FunctionPanel } from '../components/functions/Panel';
import SchemaNode from '../components/common/reactflow/SchemaNode';
import ConnectionLine from '../components/common/reactflow/ConnectionLine';
import ConnectedEdge from '../components/common/reactflow/ConnectedEdge';
import { updateReactFlowEdges, updateReactFlowNodes } from '../core/state/DataMapSlice';
import { DataMapperWrappedContext } from '../core';

interface DataMapperDesignerProps {
  saveMapDefinitionCall: (dataMapDefinition: string, mapMetadata: string) => void;
  saveXsltCall: (dataMapXslt: string) => void;
  saveDraftStateCall?: (dataMapDefinition: string) => void;
  readCurrentSchemaOptions: () => void;
  readCurrentCustomXsltPathOptions?: () => void;
  setIsMapStateDirty?: (isMapStateDirty: boolean) => void;
}

export const DataMapperDesigner = ({
  readCurrentCustomXsltPathOptions,
  setIsMapStateDirty,
  readCurrentSchemaOptions,
}: DataMapperDesignerProps) => {
  useStaticStyles();
  const styles = useStyles();
  const ref = useRef<HTMLDivElement | null>(null);
  const [canvasBounds, setCanvasBounds] = useState<DOMRect>();
  const dispatch = useDispatch<AppDispatch>();

  const updateCanvasBounds = useCallback(() => {
    if (ref?.current) {
      setCanvasBounds(ref.current.getBoundingClientRect());
    }
  }, [ref]);

  const resizeObserver = useMemo(() => new ResizeObserver((_) => updateCanvasBounds()), [updateCanvasBounds]);

  const { nodes, edges } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);

  const isMapStateDirty = useSelector((state: RootState) => state.dataMap.present.isDirty);

  const nodeTypes = useMemo(
    () => ({
      schemaNode: SchemaNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      connectedEdge: ConnectedEdge,
    }),
    []
  );

  const dispatchEdgesAndNodes = useCallback(
    (updatedEdges: Edge[], updatedNodes: Node[]) => {
      const allNodeIds = [...updatedEdges.map((edge) => edge.source), ...updatedEdges.map((edge) => edge.target)];

      const newNodes = [
        ...updatedNodes.map((node) => ({
          ...node,
          data: { ...node.data, isConnected: allNodeIds.indexOf(node.id) > -1 },
        })),
      ];

      dispatch(updateReactFlowEdges(updatedEdges));

      dispatch(updateReactFlowNodes(newNodes));
    },
    [dispatch]
  );

  const onEdgeConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge(
        {
          ...connection,
          type: 'connectedEdge',
          updatable: 'target',
          focusable: true,
          deletable: true,
        },
        edges
      );
      dispatchEdgesAndNodes(newEdges, nodes);
    },
    [edges, nodes, dispatchEdgesAndNodes]
  );

  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      const newEdges = addEdge(
        {
          ...newConnection,
          type: 'connectedEdge',
          updatable: 'target',
          focusable: true,
          deletable: true,
        },
        edges.filter((edge) => edge.id !== oldEdge.id)
      );

      dispatchEdgesAndNodes(newEdges, nodes);
    },
    [edges, nodes, dispatchEdgesAndNodes]
  );

  const isValidConnection = useCallback(
    (connection: Connection) => {
      return !edges.find((edge) => edge.source === connection.source && edge.target === connection.target);
    },
    [edges]
  );

  useEffect(() => {
    if (ref?.current) {
      resizeObserver.observe(ref.current);
      updateCanvasBounds();
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [ref, resizeObserver, updateCanvasBounds]);

  useEffect(() => readCurrentCustomXsltPathOptions && readCurrentCustomXsltPathOptions(), [readCurrentCustomXsltPathOptions]);

  // NOTE: Putting this useEffect here for vis next to onSave
  useEffect(() => {
    if (setIsMapStateDirty) {
      setIsMapStateDirty(isMapStateDirty);
    }
  }, [isMapStateDirty, setIsMapStateDirty]);

  return (
    <DndProvider backend={HTML5Backend}>
      <ReactFlowProvider>
        <DataMapperWrappedContext.Provider value={{ canvasBounds: canvasBounds }}>
          <EditorCommandBar onSaveClick={() => {}} onUndoClick={() => {}} onTestClick={() => {}} />
          <div className={styles.dataMapperShell}>
            <FunctionPanel />
            <AddSchemaDrawer
              onSubmitSchemaFileSelection={(schema) => console.log(schema)}
              readCurrentSchemaOptions={() => console.log('')}
              schemaType={SchemaType.Source}
            />
            <div ref={ref} id="editorView" className={styles.canvasWrapper}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodesDraggable={false}
                selectNodesOnDrag={false}
                onlyRenderVisibleElements={false}
                zoomOnScroll={false}
                zoomOnPinch={false}
                nodesConnectable={true}
                zoomOnDoubleClick={false}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                preventScrolling={false}
                minZoom={1}
                elementsSelectable={false}
                maxZoom={1}
                autoPanOnConnect={false}
                snapToGrid={true}
                panOnScroll={false}
                panOnDrag={false}
                style={reactFlowStyle}
                proOptions={{
                  account: 'paid-sponsor',
                  hideAttribution: true,
                }}
                isValidConnection={isValidConnection}
                onConnect={onEdgeConnect}
                onEdgeUpdate={onEdgeUpdate}
                connectionLineComponent={ConnectionLine as ConnectionLineComponent | undefined}
                translateExtent={
                  canvasBounds
                    ? [
                        [0, 0],
                        [canvasBounds.right, canvasBounds.bottom],
                      ]
                    : undefined
                }
              />
            </div>
            <AddSchemaDrawer
              onSubmitSchemaFileSelection={(schema) => console.log(schema)}
              readCurrentSchemaOptions={readCurrentSchemaOptions}
              schemaType={SchemaType.Target}
            />
          </div>
        </DataMapperWrappedContext.Provider>
      </ReactFlowProvider>
    </DndProvider>
  );
};
