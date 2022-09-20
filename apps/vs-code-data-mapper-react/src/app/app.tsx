import { VSCodeContext } from '../WebViewMsgHandler';
import type { RootState } from '../state/Store';
import { DataMapDataProvider, DataMapperDesigner, DataMapperDesignerProvider } from '@microsoft/logic-apps-data-mapper';
import { useCallback, useContext, useState } from 'react';
import { useSelector } from 'react-redux';

enum VsCodeThemeType {
  VsCodeLight = 'vscode-light',
  VsCodeDark = 'vscode-dark',
  VsCodeHighContrast = 'vscode-high-contrast',
}

interface SchemaFile {
  path: string;
  type: 'input' | 'output';
}

export const App = (): JSX.Element => {
  const vscode = useContext(VSCodeContext);
  const getVscodeTheme = () => (document.body.dataset.vscodeThemeKind as VsCodeThemeType) ?? VsCodeThemeType.VsCodeLight;

  // TODO (After theming): set initial value back to getVscodeTheme()
  const [vsCodeTheme, setVsCodeTheme] = useState<VsCodeThemeType>(VsCodeThemeType.VsCodeLight);

  const dataMap = useSelector((state: RootState) => state.dataMapDataLoader.dataMap);
  const inputSchema = useSelector((state: RootState) => state.dataMapDataLoader.inputSchema);
  const outputSchema = useSelector((state: RootState) => state.dataMapDataLoader.outputSchema);
  const schemaFileList = useSelector((state: RootState) => state.dataMapDataLoader.schemaFileList);

  // Monitor document.body for VS Code theme changes
  new MutationObserver(() => {
    setVsCodeTheme(getVscodeTheme());
  }).observe(document.body, { attributes: true });

  const saveStateCall = (dataMapDefinition: string) => {
    saveDataMapDefinition(dataMapDefinition);
  };

  const addSchemaFromFile = (selectedSchemaFile: SchemaFile) => {
    vscode.postMessage({
      command: 'addSchemaFromFile',
      data: { path: selectedSchemaFile.path, type: selectedSchemaFile.type },
    });
  };

  const readLocalFileOptions = useCallback(() => {
    vscode.postMessage({
      command: 'readLocalFileOptions',
    });
  }, [vscode]);

  const saveDataMapDefinition = (dataMapDefinition: string) => {
    vscode.postMessage({
      command: 'saveDataMapDefinition',
      data: dataMapDefinition,
    });
  };

  return (
    <DataMapperDesignerProvider locale="en-US" theme={vsCodeTheme === VsCodeThemeType.VsCodeLight ? 'light' : 'dark'} options={{}}>
      <DataMapDataProvider dataMap={dataMap} inputSchema={inputSchema} outputSchema={outputSchema} availableSchemas={schemaFileList}>
        <DataMapperDesigner
          saveStateCall={saveStateCall}
          addSchemaFromFile={addSchemaFromFile}
          readCurrentSchemaOptions={readLocalFileOptions}
        />
      </DataMapDataProvider>
    </DataMapperDesignerProvider>
  );
};
