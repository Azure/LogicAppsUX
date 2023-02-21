import { createFileSystemConnection } from '../state/DesignerSlice';
import type { AppDispatch, RootState } from '../state/Store';
import { VSCodeContext } from '../webviewCommunication';
import { DesignerCommandBar } from './DesignerCommandBar';
import { getDesignerServices } from './servicesHelper';
import { convertConnectionsDataToReferences } from './utilities/workflow';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import { DesignerProvider, BJSWorkflowProvider, Designer, getTheme, useThemeObserver } from '@microsoft/logic-apps-designer';
import { Theme } from '@microsoft/utils-logic-apps';
import type { FileSystemConnectionInfo } from '@microsoft/vscode-extension';
import { ExtensionCommand } from '@microsoft/vscode-extension';
import { useContext, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const App = () => {
  const vscode = useContext(VSCodeContext);
  const dispatch: AppDispatch = useDispatch();
  const vscodeState = useSelector((state: RootState) => state.designer);
  const { panelMetaData, connectionData, baseUrl, apiHubServiceDetails, readOnly, isLocal, apiVersion, tenantId } = vscodeState;

  const standardApp = panelMetaData?.standardApp;
  const appSettings = useMemo(() => {
    return panelMetaData?.localSettings ?? {};
  }, [panelMetaData?.localSettings]);

  const workflowDetails = useMemo(() => {
    return panelMetaData?.workflowDetails ?? {};
  }, [panelMetaData?.workflowDetails]);

  const authToken = useMemo(() => {
    return panelMetaData?.azureDetails.accessToken ?? '';
  }, [panelMetaData?.azureDetails.accessToken]);

  const [theme, setTheme] = useState<Theme>(getTheme(document.body));

  useThemeObserver(document.body, theme, setTheme, {
    attributes: true,
  });

  const services = useMemo(() => {
    const fileSystemConnectionCreate = async (connectionInfo: FileSystemConnectionInfo, connectionName: string) => {
      vscode.postMessage({
        command: ExtensionCommand.createFileSystemConnection,
        connectionInfo,
        connectionName,
      });
      return new Promise((resolve, reject) => {
        dispatch(createFileSystemConnection({ connectionName, resolve, reject }));
      });
    };
    return getDesignerServices(
      baseUrl,
      apiVersion,
      apiHubServiceDetails,
      tenantId,
      isLocal,
      connectionData,
      appSettings,
      workflowDetails,
      authToken,
      fileSystemConnectionCreate,
      vscode
    );
  }, [
    baseUrl,
    apiVersion,
    apiHubServiceDetails,
    tenantId,
    isLocal,
    connectionData,
    appSettings,
    workflowDetails,
    authToken,
    vscode,
    dispatch,
  ]);

  const connectionReferences: ConnectionReferences = useMemo(() => {
    return convertConnectionsDataToReferences(connectionData);
  }, [connectionData]);

  return (
    <DesignerProvider
      locale="en-US"
      options={{
        isDarkMode: theme === Theme.Dark,
        readOnly,
        services: services,
      }}
    >
      {standardApp ? (
        <BJSWorkflowProvider workflow={{ definition: standardApp.definition, connectionReferences }}>
          {readOnly ? null : <DesignerCommandBar />}
          <Designer />
        </BJSWorkflowProvider>
      ) : null}
    </DesignerProvider>
  );
};
