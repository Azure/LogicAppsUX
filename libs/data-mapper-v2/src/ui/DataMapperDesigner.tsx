import type { AppDispatch, RootState } from '../core/state/Store';
import { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { useDrop } from 'react-dnd';
import { useSelector, useDispatch } from 'react-redux';
import type { Connection, Node, Edge, ConnectionLineComponent } from 'reactflow';
import ReactFlow, { ReactFlowProvider, addEdge } from 'reactflow';
import { AddSchemaDrawer } from '../components/addSchema/AddSchemaPanel';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import { reactFlowStyle, useStaticStyles, useStyles } from './styles';
import { Panel as FunctionPanel } from '../components/functionsPanel/Panel';
import SchemaNode from '../components/common/reactflow/SchemaNode';
import ConnectionLine from '../components/common/reactflow/ConnectionLine';
import ConnectedEdge from '../components/common/reactflow/ConnectedEdge';
import type { ConnectionAction } from '../core/state/DataMapSlice';
import { makeConnection, updateReactFlowEdges, updateReactFlowNodes } from '../core/state/DataMapSlice';
import type { IDataMapperFileService } from '../core';
import { DataMapperWrappedContext, InitDataMapperFileService } from '../core';
import { CodeView } from '../components/codeView/CodeView';
import { FunctionNode } from '../components/common/reactflow/FunctionNode';

interface DataMapperDesignerProps {
  fileService: IDataMapperFileService;
  saveXsltCall: (dataMapXslt: string) => void;
  saveDraftStateCall?: (dataMapDefinition: string) => void;
  readCurrentCustomXsltPathOptions?: () => void;
  setIsMapStateDirty?: (isMapStateDirty: boolean) => void;
}

export const DataMapperDesigner = ({ fileService, readCurrentCustomXsltPathOptions, setIsMapStateDirty }: DataMapperDesignerProps) => {
  useStaticStyles();
  const styles = useStyles();
  const ref = useRef<HTMLDivElement | null>(null);
  const [canvasBounds, setCanvasBounds] = useState<DOMRect>();
  const dispatch = useDispatch<AppDispatch>();
  const [reactFlowInstance, setReactFlowInstance] = useState(null);
  const [allNodes, setAllNodes] = useState<Node[]>([]);

  const updateCanvasBounds = useCallback(() => {
    if (ref?.current) {
      setCanvasBounds(ref.current.getBoundingClientRect());
    }
  }, [ref]);

  const resizeObserver = useMemo(() => new ResizeObserver((_) => updateCanvasBounds()), [updateCanvasBounds]);

  if (fileService) {
    InitDataMapperFileService(fileService);
  }

  const { nodes, edges, functionNodes } = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);

  useEffect(() => {
    const newNodes: Node[] = Object.entries(functionNodes).map((node) => ({
      id: node[1].key,
      type: 'functionNode',
      data: {functionData:node[1] },
      position: node[1].position || { x: 10, y: 200 },
      draggable: true,
    }));
    setAllNodes(nodes.concat(newNodes));
  }, [nodes, functionNodes])

  const isMapStateDirty = useSelector((state: RootState) => state.dataMap.present.isDirty);

  const nodeTypes = useMemo(
    () => ({
      schemaNode: SchemaNode,
      functionNode: FunctionNode    }),
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

  const dispatchMakeConnection = useCallback(
    (connection: Connection) => {
      const connectionAction: ConnectionAction = {
        reactFlowSource: connection.source ?? '',
        reactFlowDestination: connection.target ?? '',
      };
      dispatch(makeConnection(connectionAction));
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

      dispatchMakeConnection(connection);
      dispatchEdgesAndNodes(newEdges, nodes);
    },
    [edges, nodes, dispatchEdgesAndNodes, dispatchMakeConnection]
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

  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({ 
      accept: 'function',
      drop: (item, monitor) => {
        const xyPosition = monitor.getClientOffset()
        if (xyPosition) {
          if (reactFlowInstance) {
            const position = (reactFlowInstance as any).screenToFlowPosition({
              x: xyPosition.x,
              y: xyPosition.y,
            });
            return { position };
          }
          return { position: xyPosition}
        }
      }
    }), [reactFlowInstance]);

  return (
      <ReactFlowProvider>
        <DataMapperWrappedContext.Provider value={{ canvasBounds: canvasBounds }}>
          <EditorCommandBar onUndoClick={() => {}} onTestClick={() => {}} />
          <div className={styles.dataMapperShell}>
            <FunctionPanel />
            <AddSchemaDrawer onSubmitSchemaFileSelection={(schema) => console.log(schema)} schemaType={SchemaType.Source} />
            <div ref={ref} id="editorView" className={styles.canvasWrapper}>
              <ReactFlow
                ref={drop}
                nodes={allNodes}
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
                onInit={setReactFlowInstance as any}
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
            <AddSchemaDrawer onSubmitSchemaFileSelection={(schema) => console.log(schema)} schemaType={SchemaType.Target} />
            <CodeView />
          </div>
        </DataMapperWrappedContext.Provider>
      </ReactFlowProvider>
  );
};
