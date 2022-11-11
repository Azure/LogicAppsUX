import { VSCodeContext } from '../WebViewMsgHandler';
import { dataMapDataLoaderSlice } from '../state/DataMapDataLoader';
import type { AppDispatch, RootState } from '../state/Store';
import {
  DataMapDataProvider,
  DataMapperDesigner,
  DataMapperDesignerProvider,
  defaultDataMapperApiServiceOptions,
  getFunctions,
  InitDataMapperApiService,
} from '@microsoft/logic-apps-data-mapper';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

enum VsCodeThemeType {
  VsCodeLight = 'vscode-light',
  VsCodeDark = 'vscode-dark',
  VsCodeHighContrast = 'vscode-high-contrast',
}

interface SchemaFile {
  path: string;
  type: 'source' | 'target';
}

export const App = () => {
  const dispatch = useDispatch<AppDispatch>();
  const vscode = useContext(VSCodeContext);
  // const getVscodeTheme = () => (document.body.dataset.vscodeThemeKind as VsCodeThemeType) ?? VsCodeThemeType.VsCodeLight;

  // TODO (After theming): set initial value back to getVscodeTheme()
  const [vsCodeTheme, _setVsCodeTheme] = useState<VsCodeThemeType>(VsCodeThemeType.VsCodeLight);

  const xsltFilename = useSelector((state: RootState) => state.dataMapDataLoader.xsltFilename);
  const mapDefinition = useSelector((state: RootState) => state.dataMapDataLoader.mapDefinition);
  const sourceSchema = useSelector((state: RootState) => state.dataMapDataLoader.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMapDataLoader.targetSchema);
  const schemaFileList = useSelector((state: RootState) => state.dataMapDataLoader.schemaFileList);
  const fetchedFunctions = useSelector((state: RootState) => state.dataMapDataLoader.fetchedFunctions);

  const runtimePort = useSelector((state: RootState) => state.dataMapDataLoader.runtimePort);

  /*
  // Monitor document.body for VS Code theme changes
  new MutationObserver(() => {
    setVsCodeTheme(getVscodeTheme());
  }).observe(document.body, { attributes: true });
  */

  const saveStateCall = (dataMapDefinition: string, dataMapXslt: string) => {
    saveDataMapDefinition(dataMapDefinition);

    saveDataMap(dataMapXslt);
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

  // TODO: May combine the below two functions - will revisit when touched on again in future
  const saveDataMapDefinition = (dataMapDefinition: string) => {
    vscode.postMessage({
      command: 'saveDataMapDefinition',
      data: dataMapDefinition,
    });
  };

  const saveDataMap = (dataMapXslt: string) => {
    vscode.postMessage({
      command: 'saveDataMapXslt',
      data: dataMapXslt,
    });
  };

  // Init runtime API service
  useEffect(() => {
    const fetchFunctionList = async () => {
      dispatch(dataMapDataLoaderSlice.actions.changeFetchedFunctions(await getFunctions()));
    };

    InitDataMapperApiService({
      ...defaultDataMapperApiServiceOptions,
      port: runtimePort ?? defaultDataMapperApiServiceOptions.port,
    });

    fetchFunctionList();
  }, [dispatch, runtimePort]);

  return (
    <DataMapperDesignerProvider locale="en-US" theme={vsCodeTheme === VsCodeThemeType.VsCodeLight ? 'light' : 'dark'} options={{}}>
      <DataMapDataProvider
        xsltFilename={xsltFilename}
        mapDefinition={mapDefinition}
        sourceSchema={sourceSchema}
        targetSchema={targetSchema}
        availableSchemas={schemaFileList}
        fetchedFunctions={fetchedFunctions}
      >
        <DataMapperDesigner
          saveStateCall={saveStateCall}
          addSchemaFromFile={addSchemaFromFile}
          readCurrentSchemaOptions={readLocalFileOptions}
        />
      </DataMapDataProvider>
    </DataMapperDesignerProvider>
  );
};
