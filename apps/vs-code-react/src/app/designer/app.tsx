import { createFileSystemConnection } from '../../state/DesignerSlice';
import type { AppDispatch, RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import { DesignerCommandBar } from './DesignerCommandBar';
import './app.less';
import { getDesignerServices } from './servicesHelper';
import { convertConnectionsDataToReferences } from './utilities/workflow';
import { Spinner, SpinnerSize, Text } from '@fluentui/react';
import type { ConnectionCreationInfo } from '@microsoft/logic-apps-shared';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import { DesignerProvider, BJSWorkflowProvider, Designer, getTheme, useThemeObserver } from '@microsoft/logic-apps-designer';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { isEmptyString, Theme } from '@microsoft/logic-apps-shared';
import type { FileSystemConnectionInfo, StandardApp } from '@microsoft/vscode-extension';
import { ExtensionCommand } from '@microsoft/vscode-extension';
import { useContext, useMemo, useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useQuery, useQueryClient } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

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
  const [runInstance, setRunInstance] = useState<LogicAppsV2.RunInstanceDefinition | null>(null);
  const [theme, setTheme] = useState<Theme>(getTheme(document.body));
  const intl = useIntl();
  const queryClient = useQueryClient();

  const intlText = {
    ERROR_APP: intl.formatMessage({
      defaultMessage: 'Something went wrong',
      description: 'Something went wrong text',
    }),
    LOADING_APP: intl.formatMessage({
      defaultMessage: 'Loading designer',
      description: 'Loading designer text',
    }),
  };

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
      apiHubServiceDetails ?? {},
      isLocal,
      connectionData,
      panelMetaData,
      fileSystemConnectionCreate,
      vscode,
      oauthRedirectUrl,
      hostVersion,
      queryClient
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
  ]);

  const connectionReferences: ConnectionReferences = useMemo(() => {
    return convertConnectionsDataToReferences(connectionData);
  }, [connectionData]);

  const getRunInstance = () => {
    if (isMonitoringView && !isEmptyString(runId) && panelMetaData !== null) {
      return services.runService.getRun(runId);
    }
    return;
  };

  const onRunInstanceSuccess = async (runDefinition: LogicAppsV2.RunInstanceDefinition) => {
    if (isMonitoringView) {
      const standardAppInstance = {
        ...standardApp,
        definition: runDefinition.properties.workflow.properties.definition,
      } as StandardApp;
      setRunInstance(runDefinition);
      setStandardApp(standardAppInstance);
    }
  };

  const onRunInstanceError = async () => {
    setRunInstance(null);
    setStandardApp(undefined);
  };

  const { refetch, isError, isFetching, isLoading, isRefetching } = useQuery<any>(['runInstance', { runId }], getRunInstance, {
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    initialData: null,
    onSuccess: onRunInstanceSuccess,
    onError: onRunInstanceError,
  });

  useEffect(() => {
    refetch();
  }, [isMonitoringView, runId, services, refetch]);

  useEffect(() => {
    setStandardApp(panelMetaData?.standardApp);
  }, [panelMetaData]);

  const errorApp = (
    <Text className="designer--error" variant="xLarge" block>
      {intlText.ERROR_APP}{' '}
    </Text>
  );

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
      runInstance={runInstance}
    >
      <Designer />
    </BJSWorkflowProvider>
  ) : (
    loadingApp
  );

  return (
    <DesignerProvider
      locale="en-US"
      options={{
        isDarkMode: theme === Theme.Dark,
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
  );
};
