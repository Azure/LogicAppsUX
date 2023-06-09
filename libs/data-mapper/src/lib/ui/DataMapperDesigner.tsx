import { EditorBreadcrumb } from '../components/breadcrumb/EditorBreadcrumb';
import { CodeView, minCodeViewWidth } from '../components/codeView/CodeView';
import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import type { SchemaFile } from '../components/configPanel/AddOrUpdateSchemaView';
import { ConfigPanel } from '../components/configPanel/ConfigPanel';
import { GlobalView } from '../components/globalView/GlobalView';
import { MapOverview } from '../components/mapOverview/MapOverview';
import { NotificationTypes, errorNotificationAutoHideDuration } from '../components/notification/Notification';
import {
  PropertiesPane,
  basePropPaneContentHeight,
  canvasAreaAndPropPaneMargin,
  propPaneTopBarHeight,
} from '../components/propertiesPane/PropertiesPane';
import { SidePane, SidePanelTabValue } from '../components/sidePane/SidePane';
import { TestMapPanel } from '../components/testMapPanel/TestMapPanel';
import { WarningModal } from '../components/warningModal/WarningModal';
import { generateDataMapXslt } from '../core/queries/datamap';
import { redoDataMapOperation, saveDataMap, showNotification, undoDataMapOperation } from '../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../core/state/Store';
import { convertToMapDefinition } from '../mapDefinitions';
import { generateMapMetadata } from '../mapDefinitions/MapMetadataSerializer';
import { LogCategory, LogService } from '../utils/Logging.Utils';
import { collectErrorsForMapChecker } from '../utils/MapChecker.Utils';
import './ReactFlowStyleOverrides.css';
import { ReactFlowWrapper } from './ReactFlowWrapper';
import { Stack } from '@fluentui/react';
import { makeStaticStyles, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDispatch, useSelector } from 'react-redux';
import { ReactFlowProvider, useKeyPress } from 'reactflow';

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
    paddingLeft: '12px',
    paddingRight: '12px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
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
  addSchemaFromFile?: (selectedSchemaFile: SchemaFile) => void;
  readCurrentSchemaOptions?: () => void;
  setIsMapStateDirty?: (isMapStateDirty: boolean) => void;
  setFunctionDisplayExpanded: (isFunctionDisplaySimple: boolean) => void;
  useExpandedFunctionCards: boolean;
}

export const DataMapperDesigner = ({
  saveMapDefinitionCall,
  saveXsltCall,
  saveDraftStateCall,
  addSchemaFromFile,
  readCurrentSchemaOptions,
  setIsMapStateDirty,
  setFunctionDisplayExpanded,
  useExpandedFunctionCards,
}: DataMapperDesignerProps) => {
  const dispatch = useDispatch<AppDispatch>();
  useStaticStyles();
  const styles = useStyles();

  const isMapStateDirty = useSelector((state: RootState) => state.dataMap.isDirty);
  const sourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.targetSchema);
  const flattenedTargetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedTargetSchema);
  const currentTargetSchemaNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentTargetSchemaNode);
  const targetSchemaSortArray = useSelector((state: RootState) => state.dataMap.curDataMapOperation.targetSchemaOrdering);
  const currentConnections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  const functions = useSelector((state: RootState) => state.dataMap.curDataMapOperation.functionNodes);
  const selectedItemKey = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKey);

  const { centerViewHeight, centerViewWidth } = useCenterViewSize();
  const [isPropPaneExpanded, setIsPropPaneExpanded] = useState(!!selectedItemKey);
  const [propPaneExpandedHeight, setPropPaneExpandedHeight] = useState(basePropPaneContentHeight);
  const [isCodeViewOpen, setIsCodeViewOpen] = useState(false);
  const [codeViewExpandedWidth, setCodeViewExpandedWidth] = useState(minCodeViewWidth);
  const [isTestMapPanelOpen, setIsTestMapPanelOpen] = useState(false);
  const [isSidePaneExpanded, setIsSidePaneExpanded] = useState(false);
  const [sidePaneTab, setSidePaneTab] = useState(SidePanelTabValue.OutputTree);
  const [showMapOverview, setShowMapOverview] = useState(false);
  const [showGlobalView, setShowGlobalView] = useState(false);

  const dataMapDefinition = useMemo<string>(() => {
    if (sourceSchema && targetSchema) {
      try {
        const newDataMapDefinition = convertToMapDefinition(currentConnections, sourceSchema, targetSchema, targetSchemaSortArray);

        if (saveDraftStateCall) {
          saveDraftStateCall(newDataMapDefinition);
        }

        return newDataMapDefinition;
      } catch (error) {
        let errorMessage = '';
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        LogService.error(LogCategory.DataMapperDesigner, 'dataMapDefinition', {
          message: errorMessage,
        });

        return '';
      }
    }

    return '';
  }, [sourceSchema, targetSchema, currentConnections, targetSchemaSortArray, saveDraftStateCall]);

  const onSubmitSchemaFileSelection = (schemaFile: SchemaFile) => {
    if (addSchemaFromFile) {
      // Will cause DM to ping VS Code to check schema file is in appropriate folder, then we will make getSchema API call
      addSchemaFromFile(schemaFile);
    }
  };

  const onSaveClick = useCallback(() => {
    const errors = collectErrorsForMapChecker(currentConnections, flattenedTargetSchema);

    if (errors.length > 0) {
      dispatch(
        showNotification({
          type: NotificationTypes.MapHasErrorsAtSave,
          msgParam: errors.length,
          autoHideDurationMs: errorNotificationAutoHideDuration,
        })
      );
    }

    const mapMetadata = JSON.stringify(generateMapMetadata(functions, currentConnections));

    saveMapDefinitionCall(dataMapDefinition, mapMetadata);

    dispatch(
      saveDataMap({
        sourceSchemaExtended: sourceSchema,
        targetSchemaExtended: targetSchema,
      })
    );
  }, [
    currentConnections,
    flattenedTargetSchema,
    functions,
    saveMapDefinitionCall,
    dataMapDefinition,
    dispatch,
    sourceSchema,
    targetSchema,
  ]);

  const onGenerateClick = useCallback(() => {
    const errors = collectErrorsForMapChecker(currentConnections, flattenedTargetSchema);

    if (errors.length > 0) {
      dispatch(
        showNotification({
          type: NotificationTypes.MapHasErrorsAtSave,
          msgParam: errors.length,
          autoHideDurationMs: errorNotificationAutoHideDuration,
        })
      );
    }

    generateDataMapXslt(dataMapDefinition)
      .then((xsltStr) => {
        saveXsltCall(xsltStr);

        LogService.log(LogCategory.DataMapperDesigner, 'onGenerateClick', {
          message: 'Successfully generated xslt',
        });
      })
      .catch((error: Error) => {
        LogService.error(LogCategory.DataMapperDesigner, 'onGenerateClick', {
          message: error.message,
        });

        dispatch(
          showNotification({
            type: NotificationTypes.GenerateFailed,
            msgBody: error.message,
            autoHideDurationMs: errorNotificationAutoHideDuration,
          })
        );
      });
  }, [currentConnections, flattenedTargetSchema, dataMapDefinition, dispatch, saveXsltCall]);

  // NOTE: Putting this useEffect here for vis next to onSave
  useEffect(() => {
    if (setIsMapStateDirty) {
      setIsMapStateDirty(isMapStateDirty);
    }
  }, [isMapStateDirty, setIsMapStateDirty]);

  const ctrlSPressed = useKeyPress(['Meta+s', 'ctrl+s']);
  useEffect(() => {
    if (ctrlSPressed) {
      onSaveClick();
    }
  }, [ctrlSPressed, onSaveClick]);

  const onUndoClick = () => {
    dispatch(undoDataMapOperation());
  };

  const onRedoClick = () => {
    dispatch(redoDataMapOperation());
  };

  const setTestMapPanelOpen = (toOpen: boolean) => {
    setIsTestMapPanelOpen(toOpen);

    LogService.log(LogCategory.TestMapPanel, 'openOrCloseTestMapPanel', {
      message: `${toOpen ? 'Opened' : 'Closed'} test map panel`,
    });
  };

  const setCodeViewOpen = (toOpen: boolean) => {
    setIsCodeViewOpen(toOpen);

    LogService.log(LogCategory.CodeView, 'openOrCloseCodeView', {
      message: `${toOpen ? 'Opened' : 'Closed'} code view`,
    });
  };

  const getCanvasAreaAndPropPaneMargin = () => {
    return isPropPaneExpanded && propPaneExpandedHeight === centerViewHeight - propPaneTopBarHeight ? 0 : canvasAreaAndPropPaneMargin;
  };

  // NOTE: The below two methods include the margin between the canvas area and PropPane
  const getCollapsedPropPaneTotalHeight = () => {
    return propPaneTopBarHeight + getCanvasAreaAndPropPaneMargin();
  };

  const getExpandedPropPaneTotalHeight = () => {
    return propPaneExpandedHeight + propPaneTopBarHeight + getCanvasAreaAndPropPaneMargin();
  };

  const getCanvasAreaHeight = () => {
    // PropPane isn't shown when in the other views, so canvas can use full height
    if (showMapOverview || showGlobalView) {
      return centerViewHeight - 8;
    }

    if (isPropPaneExpanded) {
      return centerViewHeight - getExpandedPropPaneTotalHeight();
    } else {
      return centerViewHeight - getCollapsedPropPaneTotalHeight();
    }
  };

  const openMapChecker = () => {
    setSidePaneTab(SidePanelTabValue.MapChecker);
    setIsSidePaneExpanded(true);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={styles.dataMapperShell}>
        <EditorCommandBar
          onSaveClick={onSaveClick}
          onUndoClick={onUndoClick}
          onRedoClick={onRedoClick}
          onTestClick={() => setTestMapPanelOpen(true)}
          showMapOverview={showMapOverview}
          setShowMapOverview={setShowMapOverview}
          showGlobalView={showGlobalView}
          setShowGlobalView={setShowGlobalView}
          onGenerateClick={onGenerateClick}
        />

        <div id="editorView" style={{ display: 'flex', flex: '1 1 1px' }}>
          <div id="centerViewWithBreadcrumb" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 1px' }}>
            <EditorBreadcrumb isCodeViewOpen={isCodeViewOpen} setIsCodeViewOpen={setCodeViewOpen} />

            <div id={centerViewId} style={{ minHeight: 400, flex: '1 1 1px' }}>
              <div
                style={{
                  height: getCanvasAreaHeight(),
                  marginBottom: getCanvasAreaAndPropPaneMargin(),
                  boxSizing: 'border-box',
                }}
              >
                <Stack horizontal style={{ height: '100%' }}>
                  <div
                    className={styles.canvasWrapper}
                    style={{
                      width: isCodeViewOpen ? '75%' : '100%',
                      backgroundColor: tokens.colorNeutralBackground4,
                    }}
                  >
                    {!currentTargetSchemaNode || showMapOverview ? (
                      <MapOverview />
                    ) : showGlobalView ? (
                      <GlobalView />
                    ) : (
                      <ReactFlowProvider>
                        <ReactFlowWrapper
                          canvasBlockHeight={getCanvasAreaHeight()}
                          canvasBlockWidth={centerViewWidth}
                          useExpandedFunctionCards={useExpandedFunctionCards}
                          openMapChecker={openMapChecker}
                        />
                      </ReactFlowProvider>
                    )}
                  </div>

                  <CodeView
                    dataMapDefinition={dataMapDefinition}
                    isCodeViewOpen={isCodeViewOpen}
                    setIsCodeViewOpen={setCodeViewOpen}
                    canvasAreaHeight={getCanvasAreaHeight()}
                    centerViewWidth={centerViewWidth}
                    contentWidth={codeViewExpandedWidth}
                    setContentWidth={setCodeViewExpandedWidth}
                  />
                </Stack>
              </div>

              {!(showMapOverview || showGlobalView) && (
                <PropertiesPane
                  selectedItemKey={selectedItemKey ?? ''}
                  isExpanded={isPropPaneExpanded}
                  setIsExpanded={setIsPropPaneExpanded}
                  centerViewHeight={centerViewHeight}
                  contentHeight={propPaneExpandedHeight}
                  setContentHeight={setPropPaneExpandedHeight}
                />
              )}
            </div>
          </div>

          <SidePane
            isExpanded={isSidePaneExpanded}
            setIsExpanded={setIsSidePaneExpanded}
            sidePaneTab={sidePaneTab}
            setSidePaneTab={setSidePaneTab}
          />
        </div>

        <WarningModal />
        <ConfigPanel
          onSubmitSchemaFileSelection={onSubmitSchemaFileSelection}
          readCurrentSchemaOptions={readCurrentSchemaOptions}
          setFunctionDisplayExpanded={setFunctionDisplayExpanded}
          useExpandedFunctionCards={useExpandedFunctionCards}
        />
        <TestMapPanel mapDefinition={dataMapDefinition} isOpen={isTestMapPanelOpen} onClose={() => setTestMapPanelOpen(false)} />
      </div>
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
