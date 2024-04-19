import { changeFetchedFunctions, changeSourceSchema, changeTargetSchema } from '../../state/DataMapSlice';
import type { AppDispatch, RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import {
  getFileNameAndPath,
  DataMapDataProvider,
  DataMapperDesigner,
  DataMapperDesignerProvider,
  InitDataMapperApiService,
  defaultDataMapperApiServiceOptions,
  getFunctions,
  getSelectedSchema,
} from '@microsoft/logic-apps-data-mapper-v2';
import { getTheme, useThemeObserver } from '@microsoft/logic-apps-designer';
import type { Theme } from '@microsoft/logic-apps-shared';
import type { MessageToVsix } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useCallback, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const DataMapperAppV2 = () => {
  const dispatch = useDispatch<AppDispatch>();
  const vscode = useContext(VSCodeContext);
  const [theme, setTheme] = useState<Theme>(getTheme(document.body));
  const xsltFilename = useSelector((state: RootState) => state.dataMap.xsltFilename);
  const xsltContent = useSelector((state: RootState) => state.dataMap.xsltContent);
  const mapDefinition = useSelector((state: RootState) => state.dataMap.mapDefinition);
  const mapMetadata = useSelector((state: RootState) => state.dataMap.dataMapMetadata);
  const sourceSchemaFilename = useSelector((state: RootState) => state.dataMap.sourceSchemaFilename);
  const sourceSchema = useSelector((state: RootState) => state.dataMap.sourceSchema);
  const targetSchemaFilename = useSelector((state: RootState) => state.dataMap.targetSchemaFilename);
  const targetSchema = useSelector((state: RootState) => state.dataMap.targetSchema);
  const schemaFileList = useSelector((state: RootState) => state.dataMap.schemaFileList);
  const customXsltPathsList = useSelector((state: RootState) => state.dataMap.customXsltPathsList);
  const fetchedFunctions = useSelector((state: RootState) => state.dataMap.fetchedFunctions);

  const runtimePort = useSelector((state: RootState) => state.dataMap.runtimePort);

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

  // const addSchemaFromFile = (selectedSchemaFile: SchemaFile) => {
  //   sendMsgToVsix({
  //     command: ExtensionCommand.addSchemaFromFile,
  //     data: { path: selectedSchemaFile.path, type: selectedSchemaFile.type as SchemaType },
  //   });
  // };

  const readLocalSchemaFileOptions = useCallback(() => {
    sendMsgToVsix({
      command: ExtensionCommand.readLocalSchemaFileOptions,
    });
  }, [sendMsgToVsix]);

  const readLocalxsltFileOptions = useCallback(() => {
    sendMsgToVsix({
      command: ExtensionCommand.readLocalCustomXsltFileOptions,
    });
  }, [sendMsgToVsix]);

  const saveMapDefinitionCall = (dataMapDefinition: string, mapMetadata: string) => {
    sendMsgToVsix({
      command: ExtensionCommand.saveDataMapDefinition,
      data: dataMapDefinition,
    });
    sendMsgToVsix({
      command: ExtensionCommand.saveDataMapMetadata,
      data: mapMetadata,
    });
  };

  const saveXsltCall = (dataMapXslt: string) => {
    sendMsgToVsix({
      command: ExtensionCommand.saveDataMapXslt,
      data: dataMapXslt,
    });
  };

  const saveDraftDataMapDefinition = (dataMapDefinition: string) => {
    sendMsgToVsix({
      command: ExtensionCommand.saveDraftDataMapDefinition,
      data: dataMapDefinition,
    });
  };

  const setIsMapStateDirty = (isMapStateDirty: boolean) => {
    sendMsgToVsix({
      command: ExtensionCommand.setIsMapStateDirty,
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

      sendMsgToVsix({
        command: ExtensionCommand.webviewRscLoadError,
        data: errorMsg,
      });
    },
    [sendMsgToVsix]
  );

  useEffect(() => {
    sendMsgToVsix({
      command: ExtensionCommand.getFunctionDisplayExpanded,
    });
  }, [sendMsgToVsix]);

  // Notify VS Code that webview is loaded
  useEffect(() => {
    sendMsgToVsix({
      command: ExtensionCommand.webviewLoaded,
    });
  }, [sendMsgToVsix]);

  // Monitor document.body for VS Code theme changes
  useThemeObserver(document.body, theme, setTheme, {
    attributes: true,
  });

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
          const [fileName, filePath] = getFileNameAndPath(sourceSchemaFilename);
          dispatch(changeSourceSchema(await getSelectedSchema(fileName, filePath)));
        }

        if (targetSchemaFilename) {
          const [fileName, filePath] = getFileNameAndPath(targetSchemaFilename);
          dispatch(changeTargetSchema(await getSelectedSchema(fileName, filePath)));
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
    <DataMapperDesignerProvider locale="en-US" theme={theme} options={{}}>
      <DataMapDataProvider
        dataMapMetadata={mapMetadata}
        xsltFilename={xsltFilename}
        xsltContent={xsltContent}
        mapDefinition={mapDefinition}
        sourceSchema={sourceSchema}
        targetSchema={targetSchema}
        availableSchemas={schemaFileList}
        customXsltPaths={customXsltPathsList}
        fetchedFunctions={fetchedFunctions}
        // Passed in here too so it can be managed in the Redux store so components can track the current theme
        theme={theme}
      >
        <div style={{ height: '100vh', overflow: 'hidden' }}>
          <DataMapperDesigner
            saveMapDefinitionCall={saveMapDefinitionCall}
            saveXsltCall={saveXsltCall}
            saveDraftStateCall={saveDraftDataMapDefinition}
            // addSchemaFromFile={addSchemaFromFile}
            readCurrentSchemaOptions={readLocalSchemaFileOptions}
            readCurrentCustomXsltPathOptions={readLocalxsltFileOptions}
            setIsMapStateDirty={setIsMapStateDirty}
          />
        </div>
      </DataMapDataProvider>
    </DataMapperDesignerProvider>
  );
};
