import { useCallback, useEffect, useState } from 'react';
import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import { useStaticStyles, useStyles } from './styles';
import { FunctionPanel } from '../components/functionsPanel/FunctionPanel';
import {
  DataMapperWrappedContext,
  InitDataMapperFileService,
  type ScrollLocation,
  type ScrollProps,
  type IDataMapperFileService,
} from '../core';
import { CodeViewPanel } from '../components/codeView/CodeViewPanel';
import { ReactFlowWrapper } from '../components/canvas/ReactFlow';
import { TestPanel } from '../components/test/TestPanel';
import DialogView from './DialogView';
import { useDispatch, useSelector } from 'react-redux';
import { deleteEdge, deleteFunction, setSelectedItem } from '../core/state/DataMapSlice';
import { MapCheckerPanel } from '../components/mapChecker/MapCheckerPanel';
import type { ILoggerService } from '@microsoft/logic-apps-shared';
import { DevLogger, InitLoggerService } from '@microsoft/logic-apps-shared';
import type { RootState } from '../core/state/Store';
import { isFunctionNode } from '../utils/ReactFlow.Util';
import { isEdgeId } from '../utils/Edge.Utils';

interface DataMapperDesignerProps {
  fileService: IDataMapperFileService;
  loggerService?: ILoggerService;
  setIsMapStateDirty?: (isMapStateDirty: boolean) => void;
}

export const DataMapperDesigner = ({ fileService, loggerService, setIsMapStateDirty }: DataMapperDesignerProps) => {
  useStaticStyles();
  const styles = useStyles();
  const [sourceScroll, setSourceScroll] = useState<ScrollProps>();
  const [targetScroll, setTargetScroll] = useState<ScrollProps>();
  const dispatch = useDispatch();
  const selectedNodes = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemConnectedNodes);

  const setScroll = useCallback(
    (scrollProps: ScrollProps, location: ScrollLocation) => {
      if (location === 'source') {
        setSourceScroll(scrollProps);
      } else if (location === 'target') {
        setTargetScroll(scrollProps);
      }
    },
    [setSourceScroll, setTargetScroll]
  );

  const loggerServices: ILoggerService[] = [];
  if (loggerService) {
    loggerServices.push(loggerService);
  }
  if (process.env.NODE_ENV !== 'production') {
    loggerServices.push(new DevLogger());
  }

  InitLoggerService(loggerServices);

  if (fileService) {
    InitDataMapperFileService(fileService);
  }

  const onContainerClick = useCallback(
    (e?: any) => {
      if (!e?.target?.dataset?.selectableid) {
        dispatch(setSelectedItem());
      }
    },
    [dispatch]
  );

  const onKeyDown = useCallback(
    (e?: any) => {
      if (!e) {
        return;
      }

      const selectedKeys = Object.keys(selectedNodes ?? {});

      if (selectedKeys.length > 0 && selectedKeys.some((key) => isFunctionNode(key) || isEdgeId(key)) && e.key === 'Delete') {
        e.stopPropagation();
        e.preventDefault();
        for (const key of Object.keys(selectedNodes ?? {})) {
          if (isFunctionNode(key)) {
            dispatch(deleteFunction(key));
          } else if (isEdgeId(key)) {
            dispatch(deleteEdge(key));
          }
        }
      }
    },
    [dispatch, selectedNodes]
  );

  useEffect(() => {
    if (fileService) {
      fileService.readCurrentCustomXsltPathOptions();
    }
  }, [fileService]);
  return (
    <DataMapperWrappedContext.Provider
      value={{
        scroll: {
          source: sourceScroll,
          target: targetScroll,
          setScroll,
        },
      }}
    >
      <EditorCommandBar />
      <div className={styles.root} onClick={onContainerClick} onKeyDown={onKeyDown}>
        <DialogView />
        <FunctionPanel />
        <ReactFlowWrapper setIsMapStateDirty={setIsMapStateDirty} />
        <CodeViewPanel />
        <MapCheckerPanel />
        <TestPanel />
      </div>
    </DataMapperWrappedContext.Provider>
  );
};
