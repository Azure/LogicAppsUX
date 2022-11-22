import { VSCodeContext } from '../WebViewMsgHandler';
import { changeFetchedFunctions, changeSourceSchema, changeTargetSchema } from '../state/DataMapDataLoader';
import type { AppDispatch, RootState } from '../state/Store';
import {
  DataMapDataProvider,
  DataMapperDesigner,
  DataMapperDesignerProvider,
  defaultDataMapperApiServiceOptions,
  getFunctions,
  getSelectedSchema,
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

  const getVscodeTheme = () => (document.body.dataset.vscodeThemeKind as VsCodeThemeType) ?? VsCodeThemeType.VsCodeLight;
  const [vsCodeTheme, _setVsCodeTheme] = useState<VsCodeThemeType>(getVscodeTheme());

  const xsltFilename = useSelector((state: RootState) => state.dataMapDataLoader.xsltFilename);
  const mapDefinition = useSelector((state: RootState) => state.dataMapDataLoader.mapDefinition);
  const sourceSchemaFilename = useSelector((state: RootState) => state.dataMapDataLoader.sourceSchemaFilename);
  const sourceSchema = useSelector((state: RootState) => state.dataMapDataLoader.sourceSchema);
  const targetSchemaFilename = useSelector((state: RootState) => state.dataMapDataLoader.targetSchemaFilename);
  const targetSchema = useSelector((state: RootState) => state.dataMapDataLoader.targetSchema);
  const schemaFileList = useSelector((state: RootState) => state.dataMapDataLoader.schemaFileList);
  const fetchedFunctions = useSelector((state: RootState) => state.dataMapDataLoader.fetchedFunctions);

  const runtimePort = useSelector((state: RootState) => state.dataMapDataLoader.runtimePort);

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

  const saveDraftDataMapDefinition = (dataMapDefinition: string) => {
    vscode.postMessage({
      command: 'saveDraftDataMapDefinition',
      data: dataMapDefinition,
    });
  };

  const setIsMapStateDirty = (isMapStateDirty: boolean) => {
    vscode.postMessage({
      command: 'setIsMapStateDirty',
      data: isMapStateDirty,
    });
  };

  const handleRscLoadError = useCallback(
    (error: unknown) => {
      let errorMsg: string;

      if (error instanceof Error) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      } else {
        errorMsg = 'Unknown error';
      }

      vscode.postMessage({
        command: 'webviewRscLoadError',
        data: errorMsg,
      });
    },
    [vscode]
  );

  // Notify VS Code that webview is loaded
  useEffect(() => {
    vscode.postMessage({
      command: 'webviewLoaded',
    });
  }, [vscode]);

  /*
  // Monitor document.body for VS Code theme changes
  useEffect(() => {
    const themeMutationObserver = new MutationObserver(() => {
      setVsCodeTheme(getVscodeTheme());
    }).observe(document.body, { attributes: true });

    return () => themeMutationObserver.disconnect();
  }, []);
  */

  // Init runtime API service and make calls
  useEffect(() => {
    const fetchFunctionList = async () => {
      try {
        dispatch(changeFetchedFunctions(await getFunctions()));
      } catch (error) {
        handleRscLoadError(error);
      }
    };

    const getSelectedSchemaTrees = async () => {
      try {
        if (sourceSchemaFilename) {
          dispatch(changeSourceSchema(await getSelectedSchema(sourceSchemaFilename)));
        }

        if (targetSchemaFilename) {
          dispatch(changeTargetSchema(await getSelectedSchema(targetSchemaFilename)));
        }
      } catch (error) {
        handleRscLoadError(error);
      }
    };

    if (runtimePort) {
      InitDataMapperApiService({
        ...defaultDataMapperApiServiceOptions,
        port: runtimePort ?? defaultDataMapperApiServiceOptions.port,
      });

      fetchFunctionList();
      getSelectedSchemaTrees();
    }
  }, [dispatch, runtimePort, sourceSchemaFilename, targetSchemaFilename, handleRscLoadError]);

  return (
    <DataMapperDesignerProvider locale="en-US" theme={vsCodeTheme === VsCodeThemeType.VsCodeLight ? 'light' : 'dark'} options={{}}>
      <DataMapDataProvider
        xsltFilename={xsltFilename}
        mapDefinition={mapDefinition}
        sourceSchema={sourceSchema}
        targetSchema={targetSchema}
        availableSchemas={schemaFileList}
        fetchedFunctions={fetchedFunctions}
        // Passed in here too so it can be managed in the Redux store so components can track the current theme
        theme={vsCodeTheme === VsCodeThemeType.VsCodeLight ? 'light' : 'dark'}
      >
        <DataMapperDesigner
          saveStateCall={saveStateCall}
          saveDraftStateCall={saveDraftDataMapDefinition}
          addSchemaFromFile={addSchemaFromFile}
          readCurrentSchemaOptions={readLocalFileOptions}
          setIsMapStateDirty={setIsMapStateDirty}
        />
      </DataMapDataProvider>
    </DataMapperDesignerProvider>
  );
};
