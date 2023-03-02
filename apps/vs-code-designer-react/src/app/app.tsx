import { createFileSystemConnection } from '../state/DesignerSlice';
import type { AppDispatch, RootState } from '../state/Store';
import { VSCodeContext } from '../webviewCommunication';
import { DesignerCommandBar } from './DesignerCommandBar';
import { getDesignerServices } from './servicesHelper';
import { convertConnectionsDataToReferences } from './utilities/workflow';
import type { ConnectionCreationInfo } from '@microsoft/designer-client-services-logic-apps';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import { DesignerProvider, BJSWorkflowProvider, Designer, getTheme, useThemeObserver } from '@microsoft/logic-apps-designer';
import { isEmptyString, Theme } from '@microsoft/utils-logic-apps';
import type { FileSystemConnectionInfo } from '@microsoft/vscode-extension';
import { ExtensionCommand } from '@microsoft/vscode-extension';
import { useContext, useMemo, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export const App = () => {
  const vscode = useContext(VSCodeContext);
  const dispatch: AppDispatch = useDispatch();
  const vscodeState = useSelector((state: RootState) => state.designer);
  const {
    panelMetaData,
    connectionData,
    baseUrl,
    apiHubServiceDetails,
    readOnly,
    isLocal,
    apiVersion,
    tenantId,
    oauthRedirectUrl,
    isMonitoringView,
    runId,
  } = vscodeState;
  const [standardApp, setStandardApp] = useState(panelMetaData?.standardApp);
  const [runInstance, setRunInstance] = useState<LogicAppsV2.RunInstanceDefinition | null>(null);
  const [theme, setTheme] = useState<Theme>(getTheme(document.body));

  useThemeObserver(document.body, theme, setTheme, {
    attributes: true,
  });

  const services = useMemo(() => {
    const fileSystemConnectionCreate = async (
      connectionInfo: FileSystemConnectionInfo,
      connectionName: string
    ): Promise<ConnectionCreationInfo> => {
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
      panelMetaData,
      fileSystemConnectionCreate,
      vscode,
      oauthRedirectUrl
    );
  }, [baseUrl, apiVersion, apiHubServiceDetails, tenantId, isLocal, connectionData, panelMetaData, vscode, oauthRedirectUrl, dispatch]);

  const connectionReferences: ConnectionReferences = useMemo(() => {
    return convertConnectionsDataToReferences(connectionData);
  }, [connectionData]);

  useEffect(() => {
    async function getRunInstance() {
      if (isMonitoringView && !isEmptyString(runId)) {
        const runServiceInstance = (await services.runService.getRun(runId)) as any;
        const standardAppInstance = {
          definition: runServiceInstance.properties.workflow.properties.definition,
          kind: '',
        };
        setRunInstance(runServiceInstance);
        setStandardApp(standardAppInstance);
      }
    }
    getRunInstance();
  }, [isMonitoringView, runId, services]);

  useEffect(() => {
    setStandardApp(panelMetaData?.standardApp);
  }, [panelMetaData]);

  return (
    <DesignerProvider
      locale="en-US"
      options={{
        isDarkMode: theme === Theme.Dark,
        readOnly,
        isMonitoringView,
        services: services,
      }}
    >
      {standardApp ? (
        <BJSWorkflowProvider workflow={{ definition: standardApp.definition, connectionReferences }} runInstance={runInstance}>
          {readOnly && !isMonitoringView ? null : <DesignerCommandBar isMonitoringView={isMonitoringView} />}
          <Designer />
        </BJSWorkflowProvider>
      ) : null}
    </DesignerProvider>
  );
};
