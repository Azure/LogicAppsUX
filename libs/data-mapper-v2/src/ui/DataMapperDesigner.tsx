import { useEffect, useState } from 'react';
import { SchemaPanel } from '../components/schema/SchemaPanel';
import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import { useStaticStyles, useStyles } from './styles';
import { FunctionPanel } from '../components/functionsPanel/FunctionPanel';
import type { IDataMapperFileService } from '../core';
import { DataMapperWrappedContext, InitDataMapperFileService } from '../core';
import { CodeViewPanel } from '../components/codeView/CodeViewPanel';
import { DMReactFlow } from './ReactFlow';
import { TestPanel } from '../components/test/TestPanel';
import { SchemaType } from '@microsoft/logic-apps-shared';
import type { SchemaFile } from '../models/Schema';

interface DataMapperDesignerProps {
  fileService: IDataMapperFileService;
  setIsMapStateDirty?: (isMapStateDirty: boolean) => void;
}

export const DataMapperDesigner = ({ fileService, setIsMapStateDirty }: DataMapperDesignerProps) => {
  useStaticStyles();
  const styles = useStyles();
  const [canvasBounds, setCanvasBounds] = useState<DOMRect>();

  if (fileService) {
    InitDataMapperFileService(fileService);
  }

  useEffect(() => {
    if (fileService) {
      fileService.readCurrentCustomXsltPathOptions()
    } }
  , [fileService]);
  return (
    // danielle rename back and add width and height
    <DataMapperWrappedContext.Provider
      value={{
        canvasBounds: {
          x: canvasBounds?.x,
          y: canvasBounds?.y,
          height: canvasBounds?.height,
          width: canvasBounds?.width,
        },
      }}
    >
      <EditorCommandBar onUndoClick={() => {}} />
      <div className={styles.dataMapperShell}>
        <FunctionPanel />
        <SchemaPanel onSubmitSchemaFileSelection={(schema: SchemaFile) => console.log(schema)} schemaType={SchemaType.Source} />
        <DMReactFlow setIsMapStateDirty={setIsMapStateDirty} updateCanvasBoundsParent={setCanvasBounds} />
        <SchemaPanel onSubmitSchemaFileSelection={(schema: SchemaFile) => console.log(schema)} schemaType={SchemaType.Target} />
        <CodeViewPanel />
        <TestPanel />
      </div>
    </DataMapperWrappedContext.Provider>
  );
};
