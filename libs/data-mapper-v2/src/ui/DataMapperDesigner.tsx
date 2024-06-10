import type { AppDispatch, RootState } from "../core/state/Store";
import { useEffect, useMemo, useRef, useCallback } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useSelector, useDispatch } from "react-redux";
import type { Connection, CoordinateExtent, Node, Edge } from "reactflow";
import ReactFlow, { ReactFlowProvider, addEdge } from "reactflow";
import { AddSchemaDrawer } from "../components/addSchema/AddSchemaPanel";
import { SchemaType } from "@microsoft/logic-apps-shared";
import { EditorCommandBar } from "../components/commandBar/EditorCommandBar";
import { reactFlowStyle, useStaticStyles, useStyles } from "./styles";
import { Panel as FunctionPanel } from "../components/functionsPanel/Panel";
import SchemaNode from "../components/common/reactflow/SchemaNode";
import ConnectionLine from "../components/common/reactflow/ConnectionLine";
import ConnectedEdge from "../components/common/reactflow/ConnectedEdge";
import type { ConnectionAction } from "../core/state/DataMapSlice";
import {
  makeConnection,
  updateReactFlowEdges,
  updateReactFlowNodes,
} from "../core/state/DataMapSlice";
import type { IDataMapperFileService } from "../core";
import { DataMapperWrappedContext, InitDataMapperFileService } from "../core";
import { FunctionConfigurationPopover } from "../components/functionConfigurationMenu/functionConfigurationPopover";
import { Button, TeachingPopover, TeachingPopoverTrigger } from "@fluentui/react-components";

interface DataMapperDesignerProps {
  fileService: IDataMapperFileService;
  saveXsltCall: (dataMapXslt: string) => void;
  saveDraftStateCall?: (dataMapDefinition: string) => void;
  readCurrentCustomXsltPathOptions?: () => void;
  setIsMapStateDirty?: (isMapStateDirty: boolean) => void;
}

export const DataMapperDesigner = ({
  fileService,
  readCurrentCustomXsltPathOptions,
  setIsMapStateDirty,
}: DataMapperDesignerProps) => {
  useStaticStyles();
  const styles = useStyles();
  const ref = useRef<HTMLDivElement | null>(null);
  const dispatch = useDispatch<AppDispatch>();

  if (fileService) {
    InitDataMapperFileService(fileService);
  }

  const { nodes, edges } = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation
  );

  const isMapStateDirty = useSelector(
    (state: RootState) => state.dataMap.present.isDirty
  );

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

  const reactFlowExtent = useMemo(() => {
    if (ref?.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect) {
        return [
          [0, 0],
          [rect.width, rect.height],
        ] as CoordinateExtent;
      }
    }

    return undefined;
  }, [ref]);

  const dispatchEdgesAndNodes = useCallback(
    (updatedEdges: Edge[], updatedNodes: Node[]) => {
      const allNodeIds = [
        ...updatedEdges.map((edge) => edge.source),
        ...updatedEdges.map((edge) => edge.target),
      ];

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
        reactFlowSource: connection.source ?? "",
        reactFlowDestination: connection.target ?? "",
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
          type: "connectedEdge",
          updatable: "target",
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
          type: "connectedEdge",
          updatable: "target",
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
      return !edges.find(
        (edge) =>
          edge.source === connection.source && edge.target === connection.target
      );
    },
    [edges]
  );

  useEffect(
    () =>
      readCurrentCustomXsltPathOptions && readCurrentCustomXsltPathOptions(),
    [readCurrentCustomXsltPathOptions]
  );

  // NOTE: Putting this useEffect here for vis next to onSave
  useEffect(() => {
    if (setIsMapStateDirty) {
      setIsMapStateDirty(isMapStateDirty);
    }
  }, [isMapStateDirty, setIsMapStateDirty]);

  return (
    <DndProvider backend={HTML5Backend}>
      <ReactFlowProvider>
        <DataMapperWrappedContext.Provider value={{ canvasRef: ref }}>
          <EditorCommandBar onUndoClick={() => {}} onTestClick={() => {}} />
          <div className={styles.dataMapperShell}>
          <FunctionPanel />
            <AddSchemaDrawer
              onSubmitSchemaFileSelection={(schema) => console.log(schema)}
              schemaType={SchemaType.Source}
            />
            <div>
            <TeachingPopover>
              <TeachingPopoverTrigger>
                <Button>trigger</Button>
              </TeachingPopoverTrigger>
              <FunctionConfigurationPopover></FunctionConfigurationPopover>
            </TeachingPopover>
            </div>
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
                  account: "paid-sponsor",
                  hideAttribution: true,
                }}
                isValidConnection={isValidConnection}
                onConnect={onEdgeConnect}
                onEdgeUpdate={onEdgeUpdate}
                connectionLineComponent={ConnectionLine}
                translateExtent={reactFlowExtent}
              />
            </div>
            <AddSchemaDrawer
              onSubmitSchemaFileSelection={(schema) => console.log(schema)}
              schemaType={SchemaType.Target}
            />
          </div>
        </DataMapperWrappedContext.Provider>
      </ReactFlowProvider>
    </DndProvider>
  );
};
