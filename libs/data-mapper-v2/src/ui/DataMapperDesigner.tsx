import type { RootState } from '../core/state/Store';
import { useEffect, useMemo, useRef, createContext } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useSelector } from 'react-redux';
import type { CoordinateExtent } from 'reactflow';
import ReactFlow, { ReactFlowProvider } from 'reactflow';
import { AddSchemaDrawer } from '../components/addSchema/AddSchemaPanel';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import { reactFlowStyle, useStaticStyles, useStyles } from './styles';
import { Panel as FunctionPanel } from '../components/functions/Panel';
import SchemaNode from '../components/common/reactflow/SchemaNode';

export interface DataMapperDesignerProps {
  saveMapDefinitionCall: (dataMapDefinition: string, mapMetadata: string) => void;
  saveXsltCall: (dataMapXslt: string) => void;
  saveDraftStateCall?: (dataMapDefinition: string) => void;
  readCurrentSchemaOptions?: () => void;
  readCurrentCustomXsltPathOptions?: () => void;
  setIsMapStateDirty?: (isMapStateDirty: boolean) => void;
}

export type DataMapperDesignerContextProps = {
  canvasRef?: React.MutableRefObject<HTMLDivElement | null>;
};

export const DataMapperDesignerContext = createContext<DataMapperDesignerContextProps>({});

export const DataMapperDesigner = ({ readCurrentCustomXsltPathOptions, setIsMapStateDirty }: DataMapperDesignerProps) => {
  useStaticStyles();
  const styles = useStyles();
  const ref = useRef<HTMLDivElement | null>(null);

  const { sourceNodes, targetNodes, sourceEdges, targetEdges } = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation
  );

  const isMapStateDirty = useSelector((state: RootState) => state.dataMap.present.isDirty);

  const nodeTypes = useMemo(
    () => ({
      schemaNode: SchemaNode,
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
        <DataMapperDesignerContext.Provider value={{ canvasRef: ref }}>
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
                defaultNodes={[]}
                defaultEdges={[]}
                nodes={[...sourceNodes, ...targetNodes]}
                edges={[...sourceEdges, ...targetEdges]}
                nodesDraggable={false}
                snapToGrid={true}
                selectNodesOnDrag={false}
                onlyRenderVisibleElements={true}
                zoomOnScroll={false}
                zoomOnPinch={false}
                zoomOnDoubleClick={false}
                nodeTypes={nodeTypes}
                preventScrolling={true}
                edgesUpdatable={false}
                minZoom={1}
                maxZoom={1}
                panOnScroll={false}
                panOnDrag={false}
                style={reactFlowStyle}
                translateExtent={reactFlowExtent}
              />
            </div>
            <AddSchemaDrawer
              onSubmitSchemaFileSelection={(schema) => console.log(schema)}
              readCurrentSchemaOptions={() => console.log('')}
              schemaType={SchemaType.Target}
            />
          </div>
        </DataMapperDesignerContext.Provider>
      </ReactFlowProvider>
    </DndProvider>
  );
};
