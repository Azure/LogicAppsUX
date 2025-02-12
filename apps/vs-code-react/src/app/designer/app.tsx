import { createFileSystemConnection } from '../../state/DesignerSlice';
import type { AppDispatch, RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import { DesignerCommandBar } from './DesignerCommandBar';
import './app.less';
import { getDesignerServices } from './servicesHelper';
import { convertConnectionsDataToReferences } from './utilities/workflow';
import { Spinner, SpinnerSize } from '@fluentui/react';
import type { ConnectionCreationInfo, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import { DesignerProvider, BJSWorkflowProvider, Designer, getTheme, useThemeObserver } from '@microsoft/logic-apps-designer';
import { isEmptyString, isNullOrUndefined, Theme } from '@microsoft/logic-apps-shared';
import type { FileSystemConnectionInfo, MessageToVsix, StandardApp } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { XLargeText } from '@microsoft/designer-ui';

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
  } = vscodeState;
  const [standardApp, setStandardApp] = useState<StandardApp | undefined>(panelMetaData?.standardApp);
  const [customCode, setCustomCode] = useState<Record<string, string> | undefined>(panelMetaData?.customCodeData);
  const [runInstance, setRunInstance] = useState<LogicAppsV2.RunInstanceDefinition | null>(null);
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
    enabled: isMonitoringView && !isEmptyString(runId),
  });

  useEffect(() => {
    if (isMonitoringView && !isNullOrUndefined(runData)) {
      setRunInstance(runData);
      setStandardApp((previousApp: any) => {
        return {
          ...previousApp,
          definition: runData.properties.workflow.properties.definition,
        };
      });
    }
  }, [runData, isMonitoringView]);

  useEffect(() => {
    if (isMonitoringView && !isEmptyString(runId)) {
      refetch();
    }
  }, [isMonitoringView, runId, services, refetch]);

  useEffect(() => {
    setStandardApp(panelMetaData?.standardApp);
    setCustomCode(panelMetaData?.customCodeData);
  }, [panelMetaData]);

  const errorApp = <XLargeText text={`${intlText.ERROR_APP} `} className="designer--error" style={{ display: 'block' }} />;

  const loadingApp = <Spinner className="designer--loading" size={SpinnerSize.large} label={intlText.LOADING_APP} />;

  const designerCommandBar =
    readOnly && !isMonitoringView ? null : (
      <DesignerCommandBar
        isDisabled={isError || isFetching || isLoading}
        isRefreshing={isRefetching}
        onRefresh={refetch}
        isDarkMode={theme === Theme.Dark}
      />
    );

  const designerApp = standardApp ? (
    <BJSWorkflowProvider
      workflow={{
        definition: standardApp.definition,
        connectionReferences,
        parameters: panelMetaData?.parametersData,
        kind: standardApp.kind,
      }}
      customCode={customCode}
      runInstance={runInstance}
      appSettings={panelMetaData?.localSettings}
    >
      <Designer />
    </BJSWorkflowProvider>
  ) : (
    loadingApp
  );

  return (
    <div style={{ height: '100vh' }}>
      <DesignerProvider
        locale="en-US"
        options={{
          isDarkMode: theme === Theme.Dark,
          isVSCode: true,
          readOnly,
          isMonitoringView,
          services: services,
          hostOptions: {
            displayRuntimeInfo: true,
          },
        }}
      >
        {designerCommandBar}
        {isError ? errorApp : isFetching || isLoading ? loadingApp : designerApp}
      </DesignerProvider>
    </div>
  );
};
