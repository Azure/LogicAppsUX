import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import {
  BJSWorkflowProvider,
  ConnectionsView,
  DesignerProvider,
  getTheme,
  useThemeObserver,
  store as DesignerStore,
} from '@microsoft/logic-apps-designer';
import { useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { Connection, ConnectionCreationInfo } from '@microsoft/logic-apps-shared';
import { getRecordEntry, isArmResourceId, Theme } from '@microsoft/logic-apps-shared';
import { getDesignerServices } from '../designer/servicesHelper';
import { VSCodeContext } from '../../webviewCommunication';
import { useDispatch, useSelector } from 'react-redux';
import { createFileSystemConnection } from '../../state/DesignerSlice';
import type { AppDispatch, RootState } from '../../state/store';
import { useQueryClient } from '@tanstack/react-query';
import { ExtensionCommand, type FileSystemConnectionInfo } from '@microsoft/vscode-extension-logic-apps';
import { convertConnectionsDataToReferences } from '../designer/utilities/workflow';
import { useConnectionViewStyles } from './connectionViewStyles';

const ConnectionView = ({
  connectorName,
  connectorType,
  currentConnectionId,
  pendingLocalConnectionDataRef,
}: {
  connectorName: string;
  connectorType: string;
  currentConnectionId: string;
  pendingLocalConnectionDataRef: React.MutableRefObject<any>;
}) => {
  const vscode = useContext(VSCodeContext);
  const sendMsgToVsix = useCallback(
    (msg: any) => {
      vscode.postMessage(msg);
    },
    [vscode]
  );

  const closeView = useCallback(() => {
    sendMsgToVsix({ command: ExtensionCommand.close_panel });
  }, [sendMsgToVsix]);

  const onConnectionSuccessful = (connection: Connection) => {
    if (isArmResourceId(connection.id)) {
      // Managed API connection: send connectionReferences so the extension host
      // can persist them to connections.json (mirrors the designer save flow).
      const designerState = DesignerStore.getState();
      const { connectionsMapping, connectionReferences: referencesObject } = designerState.connections;
      const connectionReferences = Object.keys(connectionsMapping ?? {}).reduce((references: ConnectionReferences, nodeId: string) => {
        const referenceKey = getRecordEntry(connectionsMapping, nodeId);
        if (!referenceKey || !referencesObject[referenceKey]) {
          return references;
        }

        references[referenceKey] = referencesObject[referenceKey];
        return references;
      }, {});

      sendMsgToVsix({ command: ExtensionCommand.insert_connection, connection, connectionReferences });
    } else {
      // Local connection: include the connectionAndSetting captured from the
      // writeConnection callback so the extension host can write connections.json
      // and update the C# source in a single atomic handler.
      const connectionAndSetting = pendingLocalConnectionDataRef.current;
      pendingLocalConnectionDataRef.current = null;
      sendMsgToVsix({ command: ExtensionCommand.insert_connection, connection, connectionAndSetting });
    }
  };

  return (
    <ConnectionsView
      closeView={closeView}
      connectorName={connectorName}
      connectorType={connectorType}
      currentConnectionId={currentConnectionId}
      onConnectionSuccessful={onConnectionSuccessful}
    />
  );
};

export const LanguageServerConnectionView = () => {
  const vscode = useContext(VSCodeContext);
  const dispatch: AppDispatch = useDispatch();
  const vscodeDesigner = useSelector((state: RootState) => state.languageServer);
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
    connector,
  } = vscodeDesigner;

  const { name: connectorName, type: connectorType, currentConnectionId } = connector;

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

  // Ref to capture connectionAndSetting from the writeConnection callback
  // (addConnection message) so it can be included in the insert_connection
  // message for local connections — avoids a race between two separate messages.
  const pendingLocalConnectionDataRef = useRef<any>(null);

  // Wrap the vscode context so addConnection messages are intercepted for
  // local connections. The connection data is captured in the ref and sent
  // atomically with insert_connection instead.
  // TODO(aeldridge): The add connection logic should be decoupled from existing designer flows so this workaround is not necessary.
  const wrappedVscode = useMemo(
    () => ({
      ...vscode,
      postMessage: (msg: any) => {
        if (msg?.command === ExtensionCommand.addConnection) {
          pendingLocalConnectionDataRef.current = msg.connectionAndSetting;
          return;
        }
        vscode.postMessage(msg);
      },
    }),
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
      true,
      apiVersion,
      apiHubServiceDetails ?? {},
      isLocal,
      connectionData,
      panelMetaData,
      fileSystemConnectionCreate,
      wrappedVscode,
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
    wrappedVscode,
    oauthRedirectUrl,
    dispatch,
    hostVersion,
    queryClient,
    sendMsgToVsix,
  ]);

  const connectionReferences: ConnectionReferences = useMemo(() => {
    return convertConnectionsDataToReferences(connectionData);
  }, [connectionData]);

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
          <ConnectionView
            connectorName={connectorName}
            connectorType={connectorType}
            currentConnectionId={currentConnectionId}
            pendingLocalConnectionDataRef={pendingLocalConnectionDataRef}
          />
        </BJSWorkflowProvider>
      </DesignerProvider>
    </div>
  );
};
