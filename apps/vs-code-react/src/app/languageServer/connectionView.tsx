import { PanelLocation, type CommonPanelProps } from '@microsoft/designer-ui';
import { ConnectionPanel, DesignerProvider, getTheme, useThemeObserver } from '@microsoft/logic-apps-designer';
import type { ReactNode } from 'react';
import { useCallback, useContext, useMemo, useState } from 'react';
import type { ConnectionCreationInfo } from '@microsoft/logic-apps-shared';
import { Theme } from '@microsoft/logic-apps-shared';
import { getDesignerServices } from '../designer/servicesHelper';
import { VSCodeContext } from '../../webviewCommunication';
import { useDispatch, useSelector } from 'react-redux';
import { createFileSystemConnection } from '../../state/DesignerSlice';
import type { AppDispatch, RootState } from '../../state/store';
import { useQueryClient } from '@tanstack/react-query';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import type { FileSystemConnectionInfo, MessageToVsix } from '@microsoft/vscode-extension-logic-apps';

export type DocumentationProps = {
  functionName?: string;
};

export const LanguageServerWrapper = ({ children }: { children: ReactNode }) => {
  const vscode = useContext(VSCodeContext);
  const dispatch: AppDispatch = useDispatch();
  const vscodeState = useSelector((state: RootState) => state.designer);
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
    (msg: MessageToVsix) => {
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

  return (
    <DesignerProvider
      locale="en-US"
      options={{
        isDarkMode: theme === Theme.Dark,
        isVSCode: true,
        readOnly: false,
        services: services,
        hostOptions: {
          displayRuntimeInfo: true,
        },
      }}
    >
      {children}
    </DesignerProvider>
  );
};
export const LanguageServerConnectionView: React.FC<DocumentationProps> = ({ functionName }) => {
  console.log('charlie', functionName);
  const dismissPanel = useCallback(() => {
    console.log('Panel dismissed');
  }, []);

  const commonPanelProps: CommonPanelProps = useMemo(() => {
    return {
      isCollapsed: false,
      toggleCollapse: dismissPanel,
      panelLocation: PanelLocation.Right,
    };
  }, [dismissPanel]);

  return (
    <div className="TEST-CLASS-FOR-CONNECTIONVIEW">
      <LanguageServerWrapper>
        <ConnectionPanel {...commonPanelProps} />
      </LanguageServerWrapper>
    </div>
  );
};
