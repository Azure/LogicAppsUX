import type { RootState } from '../core/state/Store';
import { Stack } from '@fluentui/react';
import { tokens } from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useSelector } from 'react-redux';
import { ReactFlowProvider } from 'reactflow';
import { AddSchemaDrawer } from '../components/addSchema/AddSchemaPanel';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import { useStaticStyles, useStyles } from './styles';
import { Panel as FunctionPanel } from '../components/functions/Panel';

const centerViewId = 'centerView';

export interface DataMapperDesignerProps {
  saveMapDefinitionCall: (dataMapDefinition: string, mapMetadata: string) => void;
  saveXsltCall: (dataMapXslt: string) => void;
  saveDraftStateCall?: (dataMapDefinition: string) => void;
  // addSchemaFromFile?: (selectedSchemaFile: SchemaFile) => void;
  readCurrentSchemaOptions?: () => void;
  readCurrentCustomXsltPathOptions?: () => void;
  setIsMapStateDirty?: (isMapStateDirty: boolean) => void;
}

export const DataMapperDesigner = ({ readCurrentCustomXsltPathOptions, setIsMapStateDirty }: DataMapperDesignerProps) => {
  useStaticStyles();
  const styles = useStyles();

  const isMapStateDirty = useSelector((state: RootState) => state.dataMap.present.isDirty);
  const selectedItemKey = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemKey);

  const { centerViewHeight } = useCenterViewSize();
  const [isPropPaneExpanded, _setIsPropPaneExpanded] = useState(!!selectedItemKey);

  useEffect(() => readCurrentCustomXsltPathOptions && readCurrentCustomXsltPathOptions(), [readCurrentCustomXsltPathOptions]);

  // NOTE: Putting this useEffect here for vis next to onSave
  useEffect(() => {
    if (setIsMapStateDirty) {
      setIsMapStateDirty(isMapStateDirty);
    }
  }, [isMapStateDirty, setIsMapStateDirty]);

  const getCanvasAreaHeight = () => {
    // PropPane isn't shown when in the other views, so canvas can use full height

    if (isPropPaneExpanded) {
      return centerViewHeight;
    }
    return centerViewHeight;
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <ReactFlowProvider>
        <EditorCommandBar onSaveClick={() => {}} onUndoClick={() => {}} onTestClick={() => {}} />
        <div className={styles.dataMapperShell}>
          <FunctionPanel />
          <AddSchemaDrawer
            onSubmitSchemaFileSelection={(schema) => console.log(schema)}
            readCurrentSchemaOptions={() => console.log('')}
            schemaType={SchemaType.Source}
          />

          <div id="editorView" style={{ display: 'flex', flex: '1 1 1px' }}>
            <div
              id="centerViewWithBreadcrumb"
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: '1 1 1px',
              }}
            >
              <div id={centerViewId} style={{ minHeight: 400, flex: '1 1 1px' }}>
                <div
                  style={{
                    height: getCanvasAreaHeight(),
                    marginBottom: 0,
                    boxSizing: 'border-box',
                  }}
                >
                  <Stack horizontal style={{ height: '100%' }}>
                    <div
                      className={styles.canvasWrapper}
                      style={{
                        backgroundColor: tokens.colorNeutralBackground4,
                      }}
                    />
                  </Stack>
                </div>
              </div>
            </div>
          </div>
          <AddSchemaDrawer
            onSubmitSchemaFileSelection={(schema) => console.log(schema)}
            readCurrentSchemaOptions={() => console.log('')}
            schemaType={SchemaType.Target}
          />
        </div>
      </ReactFlowProvider>
    </DndProvider>
  );
};

const useCenterViewSize = () => {
  const [centerViewWidth, setCenterViewWidth] = useState(0);
  const [centerViewHeight, setCenterViewHeight] = useState(0);

  useEffect(() => {
    const centerViewElement = document.getElementById(centerViewId);

    const centerViewResizeObserver = new ResizeObserver((entries) => {
      if (entries.length && entries.length > 0) {
        setCenterViewHeight(entries[0].contentRect.height);
        setCenterViewWidth(entries[0].contentRect.width);
      }
    });

    if (centerViewElement) {
      centerViewResizeObserver.observe(centerViewElement);
    }

    return () => centerViewResizeObserver.disconnect();
  }, []);

  return { centerViewWidth, centerViewHeight };
};
