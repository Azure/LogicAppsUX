/* eslint-disable @typescript-eslint/no-unused-vars */
//import { CodeView, minCodeViewWidth } from '../components/codeView/CodeView';
//import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
//import type { SchemaFile } from '../components/configPanel/AddOrUpdateSchemaView';
//import { SidePane, SidePanelTabValue } from '../components/sidePane/SidePane';
//import { WarningModal } from '../components/warningModal/WarningModal';
//import { saveDataMap, showNotification } from '../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../core/state/Store';

import { Stack } from '@fluentui/react';
import { makeStaticStyles, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDispatch, useSelector } from 'react-redux';
import { ReactFlowProvider } from 'reactflow';
import { AddSchemaDrawer } from '../components/addSchema/AddSchemaPanel';
import { SchemaType } from '@microsoft/logic-apps-shared';

// danielle to strip

const centerViewId = 'centerView';

const useStaticStyles = makeStaticStyles({
  // Firefox who's trying to early-adopt a WIP CSS standard (as of 11/2/2022)
  '*': {
    scrollbarColor: `${tokens.colorScrollbarOverlay} ${tokens.colorNeutralBackground1Hover}`,
    scrollbarWidth: 'thin',
  },
  // Any WebKit browsers (essentially every other browser) - supposedly will eventually deprecate to the above
  '*::-webkit-scrollbar': {
    height: '8px',
    width: '8px',
  },
  '*::-webkit-scrollbar-track:active': {
    backgroundColor: tokens.colorNeutralBackground1Hover,
    border: `0.5px solid ${tokens.colorNeutralStroke2}`,
  },
  '*::-webkit-scrollbar-thumb': {
    backgroundClip: 'content-box',
    border: '2px solid transparent',
    borderRadius: '10000px',
    backgroundColor: tokens.colorScrollbarOverlay,
  },
  '.react-flow svg': {
    overflow: 'visible !important',
  },
  '.react-flow__minimap': {
    borderRadius: tokens.borderRadiusMedium,
    overflow: 'hidden',
    boxShadow: tokens.shadow8,
    backgroundColor: tokens.colorNeutralBackground1,
    '& svg': {
      width: '100%',
      height: '100%',
    },
  },
  '.react-flow__minimap-mask': {
    stroke: tokens.colorBrandStroke1,
    strokeWidth: '6px',
    strokeLinejoin: 'round',
    fillOpacity: '0',
  },
});

const useStyles = makeStyles({
  dataMapperShell: {
    backgroundColor: tokens.colorNeutralBackground4,
    height: '100%',
    display: 'flex',
    ...shorthands.flex(1, 1, '1px'),
  },
  canvasWrapper: {
    height: '100%',
  },
});

export interface DataMapperDesignerProps {
  saveMapDefinitionCall: (dataMapDefinition: string, mapMetadata: string) => void;
  saveXsltCall: (dataMapXslt: string) => void;
  saveDraftStateCall?: (dataMapDefinition: string) => void;
  // addSchemaFromFile?: (selectedSchemaFile: SchemaFile) => void;
  readCurrentSchemaOptions?: () => void;
  readCurrentCustomXsltPathOptions?: () => void;
  setIsMapStateDirty?: (isMapStateDirty: boolean) => void;
}

export const DataMapperDesigner = ({
  saveMapDefinitionCall,
  //saveXsltCall,
  saveDraftStateCall,
  // addSchemaFromFile,
  // readCurrentSchemaOptions,
  readCurrentCustomXsltPathOptions,
  setIsMapStateDirty,
}: DataMapperDesignerProps) => {
  const dispatch = useDispatch<AppDispatch>();
  useStaticStyles();
  const styles = useStyles();

  const isMapStateDirty = useSelector((state: RootState) => state.dataMap.present.isDirty);
  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);
  const flattenedTargetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedTargetSchema);
  const currentTargetSchemaNode = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.currentTargetSchemaNode);
  const targetSchemaSortArray = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchemaOrdering);
  const currentConnections = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const functions = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);
  const selectedItemKey = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemKey);

  const { centerViewHeight, centerViewWidth } = useCenterViewSize();
  const [isPropPaneExpanded, setIsPropPaneExpanded] = useState(!!selectedItemKey);
  // const [isCodeViewOpen, setIsCodeViewOpen] = useState(false);
  // const [codeViewExpandedWidth, setCodeViewExpandedWidth] = useState(minCodeViewWidth);
  const [isTestMapPanelOpen, setIsTestMapPanelOpen] = useState(false);
  const [isSidePaneExpanded, setIsSidePaneExpanded] = useState(false);

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
    } else {
      return centerViewHeight;
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <ReactFlowProvider>
        <div className={styles.dataMapperShell}>
          <AddSchemaDrawer
            onSubmitSchemaFileSelection={(schema) => console.log(schema)}
            readCurrentSchemaOptions={() => console.log('')}
            schemaType={SchemaType.Source}
          />

          <div id="editorView" style={{ display: 'flex', flex: '1 1 1px' }}>
            <div id="centerViewWithBreadcrumb" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 1px' }}>
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
                    ></div>
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
