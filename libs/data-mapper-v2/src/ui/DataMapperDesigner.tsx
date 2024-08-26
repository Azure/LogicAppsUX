import { useCallback, useEffect, useState } from 'react';
import { SchemaPanel } from '../components/schema/SchemaPanel';
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
import { SchemaType } from '@microsoft/logic-apps-shared';
import type { SchemaFile } from '../models/Schema';
import DialogView from './DialogView';
import { useDispatch } from 'react-redux';
import { setSelectedItem } from '../core/state/DataMapSlice';

interface DataMapperDesignerProps {
  fileService: IDataMapperFileService;
  setIsMapStateDirty?: (isMapStateDirty: boolean) => void;
}

export const DataMapperDesigner = ({ fileService, setIsMapStateDirty }: DataMapperDesignerProps) => {
  useStaticStyles();
  const styles = useStyles();
  const [sourceScroll, setSourceScroll] = useState<ScrollProps>();
  const [targetScroll, setTargetScroll] = useState<ScrollProps>();
  const dispatch = useDispatch();

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

  if (fileService) {
    InitDataMapperFileService(fileService);
  }

  const onContainerClick = useCallback(
    (e?: any) => {
      if (e?.target?.dataset) {
        console.log(e);
        if (!e.target.dataset.selectableid) {
          dispatch(setSelectedItem());
        }
      }
    },
    [dispatch]
  );

  useEffect(() => {
    if (fileService) {
      fileService.readCurrentCustomXsltPathOptions();
    }
  }, [fileService]);
  return (
    // danielle rename back and add width and height
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
      <div className={styles.root} onClick={onContainerClick}>
        <DialogView />
        <FunctionPanel />
        <SchemaPanel onSubmitSchemaFileSelection={(schema: SchemaFile) => console.log(schema)} schemaType={SchemaType.Source} />
        <ReactFlowWrapper setIsMapStateDirty={setIsMapStateDirty} />
        <SchemaPanel onSubmitSchemaFileSelection={(schema: SchemaFile) => console.log(schema)} schemaType={SchemaType.Target} />
        <CodeViewPanel />
        <TestPanel />
      </div>
    </DataMapperWrappedContext.Provider>
  );
};
