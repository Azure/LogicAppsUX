import { createFileSystemConnection } from '../../state/DesignerSlice';
import type { AppDispatch, RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';

import { Spinner, SpinnerSize } from '@fluentui/react';
import type { ConnectionCreationInfo, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import {
  DesignerProvider,
  getTheme,
  useThemeObserver,
  Connections,
} from '@microsoft/logic-apps-designer';
import { isEmptyString, Theme } from '@microsoft/logic-apps-shared';
import type { FileSystemConnectionInfo, MessageToVsix, StandardApp } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useContext, useMemo, useState, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { XLargeText } from '@microsoft/designer-ui';
import { getDesignerServices } from '../designer/servicesHelper';
import { convertConnectionsDataToReferences } from '../designer/utilities/workflow';

export const DesignerApp = () => {
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
    oauthRedirectUrl,
    isMonitoringView,
    runId,
    hostVersion,
    isUnitTest,
    unitTestDefinition,
    workflowRuntimeBaseUrl,
  } = vscodeState;

  const [theme, setTheme] = useState<Theme>(getTheme(document.body));
  const intl = useIntl();
  const queryClient = useQueryClient();

  const intlText = {
    ERROR_APP: intl.formatMessage({
      defaultMessage: 'Something went wrong',
      id: 'XtVOMn',
      description: 'Something went wrong text',
    }),
    LOADING_APP: intl.formatMessage({
      defaultMessage: 'Loading designer',
      id: 'fZJWBR',
      description: 'Loading designer text',
    }),
  };

  useThemeObserver(document.body, theme, setTheme, {
    attributes: true,
  });

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

  const connectionReferences: ConnectionReferences = useMemo(() => {
    return convertConnectionsDataToReferences(connectionData);
  }, [connectionData]);

  const getRunInstance = () => {
    return services.runService.getRun(runId);
  };

  const {
    refetch,
    isError,
    isFetching,
    isLoading,
    isRefetching,
    data: runData,
  } = useQuery<any>(['runInstance', { runId }], getRunInstance, {
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    initialData: null,
    enabled: (isMonitoringView || isUnitTest) && !isEmptyString(runId),
  });

  const errorApp = <XLargeText text={`${intlText.ERROR_APP} `} className="designer--error" style={{ display: 'block' }} />;

  const loadingApp = <Spinner className="designer--loading" size={SpinnerSize.large} label={intlText.LOADING_APP} />;

  const connectionsApp = <Connections/>

  // const designerApp = standardApp ? (
  //   <BJSWorkflowProvider
  //     workflow={{
  //       definition: standardApp.definition,
  //       connectionReferences,
  //       parameters: panelMetaData?.parametersData,
  //       kind: standardApp.kind,
  //     }}
  //     customCode={customCode}
  //     runInstance={runInstance}
  //     unitTestDefinition={unitTestDefinition}
  //     appSettings={panelMetaData?.localSettings}
  //   >
  //     <Designer />
  //   </BJSWorkflowProvider>
  // ) : (
  //   loadingApp
  // );

  return (
    <div style={{ height: '100vh' }}>
      <DesignerProvider
        locale="en-US"
        options={{
          isDarkMode: theme === Theme.Dark,
          isVSCode: true,
          isUnitTest,
          readOnly,
          isMonitoringView,
          services: services,
          hostOptions: {
            displayRuntimeInfo: true,
          },
        }}
      >
        {isError ? errorApp : isFetching || isLoading ? loadingApp : connectionsApp}
      </DesignerProvider>
    </div>
  );
};
