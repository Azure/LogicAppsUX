import { EditorBreadcrumb } from '../components/breadcrumb/EditorBreadcrumb';
import { CodeView } from '../components/codeView/CodeView';
import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import type { SchemaFile } from '../components/configPanel/ChangeSchemaView';
import { EditorConfigPanel } from '../components/configPanel/EditorConfigPanel';
import { MapOverview } from '../components/mapOverview/MapOverview';
import { basePropPaneContentHeightPct, PropertiesPane } from '../components/propertiesPane/PropertiesPane';
import { WarningModal } from '../components/warningModal/WarningModal';
import { redoDataMapOperation, saveDataMap, undoDataMapOperation } from '../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../core/state/Store';
import { convertToMapDefinition } from '../utils/DataMap.Utils';
import './ReactFlowStyleOverrides.css';
import { ReactFlowWrapper } from './ReactFlowWrapper';
import { Stack } from '@fluentui/react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { ReactFlowProvider } from 'react-flow-renderer';
import { useDispatch, useSelector } from 'react-redux';

const useStyles = makeStyles({
  dataMapperShell: {
    backgroundColor: tokens.colorNeutralBackground4,
    paddingLeft: '12px',
    paddingRight: '12px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  centerView: {
    minHeight: '600px',
    height: '100%',
    ...shorthands.flex(1, 2, 'auto'),
  },
  canvasWrapper: {
    backgroundColor: '#edebe9',
    height: '100%',
  },
});

export interface DataMapperDesignerProps {
  saveStateCall: (dataMapDefinition: string) => void;
  addSchemaFromFile?: (selectedSchemaFile: SchemaFile) => void;
  readCurrentSchemaOptions?: () => void;
}

export const DataMapperDesigner: React.FC<DataMapperDesignerProps> = ({ saveStateCall, addSchemaFromFile, readCurrentSchemaOptions }) => {
  const dispatch = useDispatch<AppDispatch>();
  const styles = useStyles();

  const inputSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.inputSchema);
  const outputSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.outputSchema);
  const currentConnections = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  const currentlySelectedNode = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentlySelectedNode);

  const [isPropPaneExpanded, setIsPropPaneExpanded] = useState(!!currentlySelectedNode);
  const [propPaneExpandedHeightPct, setPropPaneExpandedHeightPct] = useState(basePropPaneContentHeightPct);
  const [isCodeViewOpen, setIsCodeViewOpen] = useState(false);

  const dataMapDefinition = useMemo((): string => {
    if (inputSchema && outputSchema) {
      return convertToMapDefinition(currentConnections, inputSchema, outputSchema);
    }

    return '';
  }, [currentConnections, inputSchema, outputSchema]);

  const onSubmitSchemaFileSelection = (schemaFile: SchemaFile) => {
    if (addSchemaFromFile) {
      // Will cause DM to ping VS Code to check schema file is in appropriate folder, then we will make getSchema API call
      addSchemaFromFile(schemaFile);
    }
  };

  const onSaveClick = () => {
    saveStateCall(dataMapDefinition); // TODO: do the next call only when this is successful
    dispatch(
      saveDataMap({
        inputSchemaExtended: inputSchema,
        outputSchemaExtended: outputSchema,
      })
    );
    console.log(dataMapDefinition);
  };

  const onUndoClick = () => {
    dispatch(undoDataMapOperation());
  };

  const onRedoClick = () => {
    dispatch(redoDataMapOperation());
  };

  const onTestClick = () => {
    // TODO: Hook up once Test Map pane work starts
  };

  const placeholderFunc = () => {
    return;
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className={styles.dataMapperShell}>
        <EditorCommandBar onSaveClick={onSaveClick} onUndoClick={onUndoClick} onRedoClick={onRedoClick} onTestClick={onTestClick} />
        <WarningModal />
        <EditorConfigPanel
          onSubmitSchemaFileSelection={onSubmitSchemaFileSelection}
          readCurrentSchemaOptions={readCurrentSchemaOptions ?? placeholderFunc}
        />
        <EditorBreadcrumb isCodeViewOpen={isCodeViewOpen} setIsCodeViewOpen={setIsCodeViewOpen} />

        <div className={styles.centerView} style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              flex: '1 1 auto',
              marginBottom: isPropPaneExpanded && propPaneExpandedHeightPct === 100 ? 0 : '8px',
              boxSizing: 'border-box',
            }}
          >
            {inputSchema && outputSchema ? (
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
                    <ReactFlowWrapper inputSchema={inputSchema} />
                  </ReactFlowProvider>
                </div>

                <CodeView dataMapDefinition={dataMapDefinition} isCodeViewOpen={isCodeViewOpen} setIsCodeViewOpen={setIsCodeViewOpen} />
              </Stack>
            ) : (
              <MapOverview inputSchema={inputSchema} outputSchema={outputSchema} />
            )}
          </div>
          <PropertiesPane
            currentNode={currentlySelectedNode}
            isExpanded={isPropPaneExpanded}
            setIsExpanded={setIsPropPaneExpanded}
            contentHeightPct={propPaneExpandedHeightPct}
            setContentHeightPct={setPropPaneExpandedHeightPct}
          />
        </div>
      </div>
    </DndProvider>
  );
};
