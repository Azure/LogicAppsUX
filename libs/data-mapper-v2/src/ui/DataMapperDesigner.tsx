import { useEffect, useState } from 'react';
import { AddSchemaDrawer } from '../components/addSchema/AddSchemaPanel';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { EditorCommandBar } from '../components/commandBar/EditorCommandBar';
import { useStaticStyles, useStyles } from './styles';
import { Panel as FunctionPanel } from '../components/functionsPanel/Panel';
import type { IDataMapperFileService } from '../core';
import { DataMapperWrappedContext, InitDataMapperFileService } from '../core';
import { CodeView } from '../components/codeView/CodeView';
import { DMReactFlow } from './DMReactFlow';

interface DataMapperDesignerProps {
  fileService: IDataMapperFileService;
  saveXsltCall: (dataMapXslt: string) => void;
  saveDraftStateCall?: (dataMapDefinition: string) => void;
  readCurrentCustomXsltPathOptions?: () => void;
  setIsMapStateDirty?: (isMapStateDirty: boolean) => void;
}

export const DataMapperDesigner = ({ fileService, readCurrentCustomXsltPathOptions, setIsMapStateDirty }: DataMapperDesignerProps) => {
  useStaticStyles();
  const styles = useStyles();
  const [canvasBounds, setCanvasBounds] = useState<DOMRect>();

  if (fileService) {
    InitDataMapperFileService(fileService);
  }

  useEffect(() => readCurrentCustomXsltPathOptions && readCurrentCustomXsltPathOptions(), [readCurrentCustomXsltPathOptions]);

  return (
    // danielle rename back and add width and height
    <DataMapperWrappedContext.Provider value={{ canvasBounds: { x: canvasBounds?.x, y: canvasBounds?.y } }}>
      <EditorCommandBar onUndoClick={() => {}} onTestClick={() => {}} />
      <div className={styles.dataMapperShell}>
        <FunctionPanel />
        <AddSchemaDrawer onSubmitSchemaFileSelection={(schema) => console.log(schema)} schemaType={SchemaType.Source} />
        <DMReactFlow setIsMapStateDirty={setIsMapStateDirty} updateCanvasBoundsParent={setCanvasBounds} canvasBounds={canvasBounds} />
        <AddSchemaDrawer onSubmitSchemaFileSelection={(schema) => console.log(schema)} schemaType={SchemaType.Target} />
        <CodeView />
      </div>
    </DataMapperWrappedContext.Provider>
  );
};
