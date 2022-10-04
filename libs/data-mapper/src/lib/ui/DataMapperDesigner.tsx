import { EditorBreadcrumb } from '../components/breadcrumb/EditorBreadcrumb';
import { CodeView } from '../components/codeView/CodeView';
import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import type { SchemaFile } from '../components/configPanel/ChangeSchemaView';
import { EditorConfigPanel } from '../components/configPanel/EditorConfigPanel';
import { MapOverview } from '../components/mapOverview/MapOverview';
import { NotificationTypes } from '../components/notification/Notification';
import {
  basePropPaneContentHeight,
  canvasAreaAndPropPaneMargin,
  PropertiesPane,
  propPaneTopBarHeight,
} from '../components/propertiesPane/PropertiesPane';
import { TargetSchemaPane } from '../components/targetSchemaPane/TargetSchemaPane';
import { TestMapPanel } from '../components/testMapPanel/TestMapPanel';
import { WarningModal } from '../components/warningModal/WarningModal';
import { generateDataMapXslt } from '../core/queries/datamap';
import { redoDataMapOperation, saveDataMap, showNotification, undoDataMapOperation } from '../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../core/state/Store';
import { convertToMapDefinition } from '../utils/DataMap.Utils';
import './ReactFlowStyleOverrides.css';
import { ReactFlowWrapper } from './ReactFlowWrapper';
import { Stack } from '@fluentui/react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { useLayoutEffect, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDispatch, useSelector } from 'react-redux';
import { ReactFlowProvider } from 'reactflow';

const useCenterViewHeight = () => {
  const [centerViewHeight, setCenterViewHeight] = useState(0);

  const handleCenterViewHeight = () => {
    const centerView = document.getElementById('centerView');

    if (centerView?.clientHeight) {
      setCenterViewHeight(centerView.clientHeight);
    }
  };

  useLayoutEffect(() => {
    window.addEventListener('resize', handleCenterViewHeight);

    // NOTE: Not the nicest, but it's required to ensure we get the actual final height after the initial render
    // TODO: 96% chance this will a better solution around Fit/Finish time
    setTimeout(handleCenterViewHeight, 75);

    return () => window.removeEventListener('resize', handleCenterViewHeight);
  }, []);

  return centerViewHeight;
};

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
    backgroundColor: '#edebe9',
    height: '100%',
  },
});

export interface DataMapperDesignerProps {
  saveStateCall: (dataMapDefinition: string, dataMapXslt: string) => void;
  addSchemaFromFile?: (selectedSchemaFile: SchemaFile) => void;
  readCurrentSchemaOptions?: () => void;
}

export const DataMapperDesigner: React.FC<DataMapperDesignerProps> = ({ saveStateCall, addSchemaFromFile, readCurrentSchemaOptions }) => {
  const dispatch = useDispatch<AppDispatch>();
  const styles = useStyles();

  const sourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.targetSchema);
  const currentConnections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  const currentlySelectedNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentlySelectedNode);

  const centerViewHeight = useCenterViewHeight();
  const [isPropPaneExpanded, setIsPropPaneExpanded] = useState(!!currentlySelectedNode);
  const [propPaneExpandedHeight, setPropPaneExpandedHeight] = useState(basePropPaneContentHeight);
  const [isCodeViewOpen, setIsCodeViewOpen] = useState(false);
  const [isTestMapPanelOpen, setIsTestMapPanelOpen] = useState(false);
  const [isOutputPaneExpanded, setIsOutputPaneExpanded] = useState(false);

  const dataMapDefinition = useMemo((): string => {
    if (sourceSchema && targetSchema) {
      return convertToMapDefinition(currentConnections, sourceSchema, targetSchema);
    }

    return '';
  }, [currentConnections, sourceSchema, targetSchema]);

  const onSubmitSchemaFileSelection = (schemaFile: SchemaFile) => {
    if (addSchemaFromFile) {
      // Will cause DM to ping VS Code to check schema file is in appropriate folder, then we will make getSchema API call
      addSchemaFromFile(schemaFile);
    }
  };

  const onSaveClick = () => {
    generateDataMapXslt(dataMapDefinition)
      .then((xsltStr) => {
        saveStateCall(dataMapDefinition, xsltStr);

        dispatch(
          saveDataMap({
            sourceSchemaExtended: sourceSchema,
            targetSchemaExtended: targetSchema,
          })
        );
      })
      .catch((error: Error) => {
        dispatch(showNotification({ type: NotificationTypes.SaveFailed, msgBody: error.message }));
      });
  };

  const onUndoClick = () => {
    dispatch(undoDataMapOperation());
  };

  const onRedoClick = () => {
    dispatch(redoDataMapOperation());
  };

  const onTestClick = () => {
    setIsTestMapPanelOpen(true);
  };

  const getCanvasAreaAndPropPaneMargin = () => {
    return isPropPaneExpanded && propPaneExpandedHeight === centerViewHeight - propPaneTopBarHeight ? 0 : canvasAreaAndPropPaneMargin;
  };

  // NOTE: The below two methods include the margin between the canvas area and proppane
  const getCollapsedPropPaneTotalHeight = () => {
    return propPaneTopBarHeight + getCanvasAreaAndPropPaneMargin();
  };

  const getExpandedPropPaneTotalHeight = () => {
    return propPaneExpandedHeight + propPaneTopBarHeight + getCanvasAreaAndPropPaneMargin();
  };

  const getCanvasAreaHeight = () => {
    if (isPropPaneExpanded) {
      return centerViewHeight - getExpandedPropPaneTotalHeight();
    } else {
      return centerViewHeight - getCollapsedPropPaneTotalHeight();
    }
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={styles.dataMapperShell}>
        <EditorCommandBar onSaveClick={onSaveClick} onUndoClick={onUndoClick} onRedoClick={onRedoClick} onTestClick={onTestClick} />

        <div id="editorView" style={{ display: 'flex', flex: '1 1 1px' }}>
          <div id="centerViewWithBreadcrumb" style={{ display: 'flex', flexDirection: 'column', flex: '1 1 1px' }}>
            <EditorBreadcrumb isCodeViewOpen={isCodeViewOpen} setIsCodeViewOpen={setIsCodeViewOpen} />

            <div id="centerView" style={{ minHeight: 400, flex: '1 1 1px' }}>
              <div
                style={{
                  height: getCanvasAreaHeight(),
                  marginBottom: getCanvasAreaAndPropPaneMargin(),
                  boxSizing: 'border-box',
                }}
              >
                {sourceSchema && targetSchema ? (
                  <Stack horizontal style={{ height: '100%' }}>
                    <div
                      className={styles.canvasWrapper}
                      style={{
                        width: isCodeViewOpen ? '75%' : '100%',
                        marginRight: isCodeViewOpen ? '8px' : 0,
                        backgroundColor: tokens.colorNeutralBackground4,
                      }}
                    >
                      <ReactFlowProvider>
                        <ReactFlowWrapper sourceSchema={sourceSchema} />
                      </ReactFlowProvider>
                    </div>

                    <CodeView
                      dataMapDefinition={dataMapDefinition}
                      isCodeViewOpen={isCodeViewOpen}
                      setIsCodeViewOpen={setIsCodeViewOpen}
                      canvasAreaHeight={getCanvasAreaHeight()}
                    />
                  </Stack>
                ) : (
                  <MapOverview sourceSchema={sourceSchema} targetSchema={targetSchema} />
                )}
              </div>

              <PropertiesPane
                currentNode={currentlySelectedNode}
                isExpanded={isPropPaneExpanded}
                setIsExpanded={setIsPropPaneExpanded}
                centerViewHeight={centerViewHeight}
                contentHeight={propPaneExpandedHeight}
                setContentHeight={setPropPaneExpandedHeight}
              />
            </div>
          </div>

          <TargetSchemaPane isExpanded={isOutputPaneExpanded} setIsExpanded={setIsOutputPaneExpanded} />
        </div>

        <WarningModal />
        <EditorConfigPanel onSubmitSchemaFileSelection={onSubmitSchemaFileSelection} readCurrentSchemaOptions={readCurrentSchemaOptions} />
        <TestMapPanel isOpen={isTestMapPanelOpen} onClose={() => setIsTestMapPanelOpen(false)} />
      </div>
    </DndProvider>
  );
};
