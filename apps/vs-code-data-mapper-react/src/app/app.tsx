import { VSCodeContext } from '../WebViewMsgHandler';
import { changeFetchedFunctions, changeSourceSchema, changeTargetSchema, changeUseExpandedFunctionCards } from '../state/DataMapDataLoader';
import type { AppDispatch, RootState } from '../state/Store';
import type { MessageToVsix, SchemaType } from '@microsoft/logic-apps-data-mapper';
import {
  DataMapDataProvider,
  DataMapperDesigner,
  DataMapperDesignerProvider,
  InitDataMapperApiService,
  defaultDataMapperApiServiceOptions,
  getFunctions,
  getSelectedSchema,
} from '@microsoft/logic-apps-data-mapper';
import { Theme as ThemeType } from '@microsoft/utils-logic-apps';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

enum VsCodeThemeType {
  VsCodeLight = 'vscode-light',
  VsCodeDark = 'vscode-dark',
  VsCodeHighContrast = 'vscode-high-contrast',
}

interface SchemaFile {
  path: string;
  type: SchemaType;
}

export const App = () => {
  const dispatch = useDispatch<AppDispatch>();
  const vscode = useContext(VSCodeContext);

  const getVscodeTheme = () => (document.body.dataset.vscodeThemeKind as VsCodeThemeType) ?? VsCodeThemeType.VsCodeLight;
  const [vsCodeTheme, setVsCodeTheme] = useState<VsCodeThemeType>(getVscodeTheme());

  const xsltFilename = useSelector((state: RootState) => state.dataMapDataLoader.xsltFilename);
  const xsltContent = useSelector((state: RootState) => state.dataMapDataLoader.xsltContent);
  const mapDefinition = useSelector((state: RootState) => state.dataMapDataLoader.mapDefinition);
  const sourceSchemaFilename = useSelector((state: RootState) => state.dataMapDataLoader.sourceSchemaFilename);
  const sourceSchema = useSelector((state: RootState) => state.dataMapDataLoader.sourceSchema);
  const targetSchemaFilename = useSelector((state: RootState) => state.dataMapDataLoader.targetSchemaFilename);
  const targetSchema = useSelector((state: RootState) => state.dataMapDataLoader.targetSchema);
  const schemaFileList = useSelector((state: RootState) => state.dataMapDataLoader.schemaFileList);
  const fetchedFunctions = useSelector((state: RootState) => state.dataMapDataLoader.fetchedFunctions);
  const useExpandedFunctionCards = useSelector((state: RootState) => state.dataMapDataLoader.useExpandedFunctionCards);

  const runtimePort = useSelector((state: RootState) => state.dataMapDataLoader.runtimePort);

  if (runtimePort) {
    InitDataMapperApiService({
      ...defaultDataMapperApiServiceOptions,
      port: runtimePort ?? defaultDataMapperApiServiceOptions.port,
    });
  }

  const sendMsgToVsix = useCallback(
    (msg: MessageToVsix) => {
      vscode.postMessage(msg);
    },
    [vscode]
  );

  const addSchemaFromFile = (selectedSchemaFile: SchemaFile) => {
    sendMsgToVsix({
      command: 'addSchemaFromFile',
      data: { path: selectedSchemaFile.path, type: selectedSchemaFile.type as SchemaType },
    });
  };

  const readLocalFileOptions = useCallback(() => {
    sendMsgToVsix({
      command: 'readLocalFileOptions',
    });
  }, [sendMsgToVsix]);

  const saveMapDefinitionCall = (dataMapDefinition: string) => {
    sendMsgToVsix({
      command: 'saveDataMapDefinition',
      data: dataMapDefinition,
    });
  };

  const saveXsltCall = (dataMapXslt: string) => {
    sendMsgToVsix({
      command: 'saveDataMapXslt',
      data: dataMapXslt,
    });
  };

  const saveDraftDataMapDefinition = (dataMapDefinition: string) => {
    sendMsgToVsix({
      command: 'saveDraftDataMapDefinition',
      data: dataMapDefinition,
    });
  };

  const setIsMapStateDirty = (isMapStateDirty: boolean) => {
    sendMsgToVsix({
      command: 'setIsMapStateDirty',
      data: isMapStateDirty,
    });
  };

  const setFunctionDisplayExpanded = (isFunctionDisplaySimple: boolean) => {
    dispatch(changeUseExpandedFunctionCards(isFunctionDisplaySimple));
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

      sendMsgToVsix({
        command: 'webviewRscLoadError',
        data: errorMsg,
      });
    },
    [sendMsgToVsix]
  );

  useEffect(() => {
    sendMsgToVsix({
      command: 'getFunctionDisplayExpanded',
    });
  }, [sendMsgToVsix]);

  // Notify VS Code that webview is loaded
  useEffect(() => {
    sendMsgToVsix({
      command: 'webviewLoaded',
    });
  }, [sendMsgToVsix]);

  // Monitor document.body for VS Code theme changes
  useEffect(() => {
    const themeMutationObserver = new MutationObserver(() => {
      setVsCodeTheme(getVscodeTheme());
    });

    themeMutationObserver.observe(document.body, { attributes: true });

    return () => themeMutationObserver.disconnect();
  }, []);

  // Init runtime API service and make calls
  useEffect(() => {
    const fetchFunctionList = async () => {
      try {
        const fnManifest = await getFunctions();

        if (typeof fnManifest !== 'string') {
          dispatch(changeFetchedFunctions(fnManifest));
        } else {
          const errorMessage = `Failed to fetch Function manifest: ${fnManifest}}`;

          throw new Error(errorMessage);
        }
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
    <DataMapperDesignerProvider
      locale="en-US"
      theme={vsCodeTheme === VsCodeThemeType.VsCodeLight ? ThemeType.Light : ThemeType.Dark}
      options={{}}
    >
      <DataMapDataProvider
        xsltFilename={xsltFilename}
        xsltContent={xsltContent}
        mapDefinition={mapDefinition}
        sourceSchema={sourceSchema}
        targetSchema={targetSchema}
        availableSchemas={schemaFileList}
        fetchedFunctions={fetchedFunctions}
        // Passed in here too so it can be managed in the Redux store so components can track the current theme
        theme={vsCodeTheme === VsCodeThemeType.VsCodeLight ? ThemeType.Light : ThemeType.Dark}
      >
        <DataMapperDesigner
          saveMapDefinitionCall={saveMapDefinitionCall}
          saveXsltCall={saveXsltCall}
          saveDraftStateCall={saveDraftDataMapDefinition}
          addSchemaFromFile={addSchemaFromFile}
          readCurrentSchemaOptions={readLocalFileOptions}
          setIsMapStateDirty={setIsMapStateDirty}
          setFunctionDisplayExpanded={setFunctionDisplayExpanded}
          useExpandedFunctionCards={useExpandedFunctionCards}
        />
      </DataMapDataProvider>
    </DataMapperDesignerProvider>
  );
};
