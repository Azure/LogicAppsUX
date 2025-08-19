import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import {
  BJSWorkflowProvider,
  ConnectionsView,
  DesignerProvider,
  getTheme,
  useThemeObserver,
  store as DesignerStore,
} from '@microsoft/logic-apps-designer';
import { useCallback, useContext, useMemo, useState } from 'react';
import type { Connection, ConnectionCreationInfo } from '@microsoft/logic-apps-shared';
import { getRecordEntry, Theme } from '@microsoft/logic-apps-shared';
import { getDesignerServices } from '../designer/servicesHelper';
import { VSCodeContext } from '../../webviewCommunication';
import { useDispatch, useSelector } from 'react-redux';
import { createFileSystemConnection } from '../../state/DesignerSlice';
import type { AppDispatch, RootState } from '../../state/store';
import { useQueryClient } from '@tanstack/react-query';
import { ExtensionCommand, type FileSystemConnectionInfo } from '@microsoft/vscode-extension-logic-apps';
import { convertConnectionsDataToReferences } from '../designer/utilities/workflow';
import { useConnectionViewStyles } from './connectionViewStyles';

const ConnectionView = ({ connectorName }: { connectorName: string; connectionReferences: ConnectionReferences }) => {
  const vscode = useContext(VSCodeContext);
  const designerState = DesignerStore.getState();

  const sendMsgToVsix = useCallback(
    (msg: any) => {
      vscode.postMessage(msg);
    },
    [vscode]
  );

  const closeView = useCallback(() => {
    sendMsgToVsix({ command: ExtensionCommand.close_panel });
  }, [sendMsgToVsix]);

  const onConnectionSuccessful = useCallback(
    (connection: Connection) => {
      const { connectionsMapping, connectionReferences: referencesObject } = designerState.connections;
      const connectionReferences = Object.keys(connectionsMapping ?? {}).reduce((references: ConnectionReferences, nodeId: string) => {
        const referenceKey = getRecordEntry(connectionsMapping, nodeId);
        if (!referenceKey || !referencesObject[referenceKey]) {
          return references;
        }

        references[referenceKey] = referencesObject[referenceKey];
        return references;
      }, {});

      console.log('charlie', connectionReferences);

      sendMsgToVsix({ command: ExtensionCommand.insert_connection, connection: connection, connectionReferences });
    },
    [designerState.connections, sendMsgToVsix]
  );

  return <ConnectionsView closeView={closeView} connectorName={connectorName} onConnectionSuccessful={onConnectionSuccessful} />;
};

export const LanguageServerConnectionView = () => {
  const vscode = useContext(VSCodeContext);
  const dispatch: AppDispatch = useDispatch();
  const vscodeState = useSelector((state: RootState) => state.designer);
  const styles = useConnectionViewStyles();
  const {
    panelMetaData,
    connectionData,
    baseUrl,
    apiHubServiceDetails,
    isLocal,
    apiVersion,
    oauthRedirectUrl,
    hostVersion,
    workflowRuntimeBaseUrl,
  } = vscodeState;

  const [theme, setTheme] = useState<Theme>(getTheme(document.body));
  useThemeObserver(document.body, theme, setTheme, {
    attributes: true,
  });
  const queryClient = useQueryClient();

  const sendMsgToVsix = useCallback(
    (msg: any) => {
      vscode.postMessage(msg);
    },
    [vscode]
  );

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
      workflowRuntimeBaseUrl,
      apiVersion,
      apiHubServiceDetails ?? {},
      isLocal,
      connectionData,
      panelMetaData,
      fileSystemConnectionCreate,
      vscode,
      oauthRedirectUrl,
      hostVersion,
      queryClient,
      sendMsgToVsix
    );
  }, [
    baseUrl,
    workflowRuntimeBaseUrl,
    apiVersion,
    apiHubServiceDetails,
    isLocal,
    connectionData,
    panelMetaData,
    vscode,
    oauthRedirectUrl,
    dispatch,
    hostVersion,
    queryClient,
    sendMsgToVsix,
  ]);

  const connectionReferences: ConnectionReferences = useMemo(() => {
    return convertConnectionsDataToReferences(connectionData);
  }, [connectionData]);
  console.log('Charlie onnection References initial:', connectionReferences, 'data: ', connectionData);

  return (
    <div className={styles.connectionViewContainer}>
      <DesignerProvider
        locale="en-US"
        options={{
          isDarkMode: theme === Theme.Dark,
          isVSCode: true,
          services: services,
          hostOptions: {
            displayRuntimeInfo: true,
          },
        }}
      >
        <BJSWorkflowProvider
          workflow={{
            definition: {} as any,
            connectionReferences,
            parameters: panelMetaData?.parametersData,
          }}
          appSettings={panelMetaData?.localSettings}
        >
          <ConnectionView connectorName={'msnweather'} connectionReferences={connectionReferences} />
        </BJSWorkflowProvider>
      </DesignerProvider>
    </div>
  );
};
