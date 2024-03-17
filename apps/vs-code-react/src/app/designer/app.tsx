import { createFileSystemConnection, updateUnitTestDefinition } from '../../state/DesignerSlice';
import type { AppDispatch, RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import { DesignerCommandBar } from './DesignerCommandBar';
import './app.less';
import { getDesignerServices } from './servicesHelper';
import { convertConnectionsDataToReferences } from './utilities/workflow';
import { Spinner, SpinnerSize, Text } from '@fluentui/react';
import type { ConnectionCreationInfo } from '@microsoft/designer-client-services-logic-apps';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import { DesignerProvider, BJSWorkflowProvider, Designer, getTheme, useThemeObserver } from '@microsoft/logic-apps-designer';
import type { ContentLink, LogicAppsV2 } from '@microsoft/utils-logic-apps';
import { isEmptyString, isNullOrUndefined, Theme } from '@microsoft/utils-logic-apps';
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
    isUnitTest,
    unitTestDefinition,
    workflowRuntimeBaseUrl,
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
      queryClient
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
  ]);

  const connectionReferences: ConnectionReferences = useMemo(() => {
    return convertConnectionsDataToReferences(connectionData);
  }, [connectionData]);

  const getRunInstance = () => {
    if ((isMonitoringView || isUnitTest) && !isEmptyString(runId) && panelMetaData !== null) {
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
    } else if (isUnitTest && isNullOrUndefined(unitTestDefinition)) {
      const triggerOutputs = await services.runService.getActionLinks({
        outputsLink: runDefinition.properties.trigger.outputsLink as ContentLink,
      });
      const triggerMocks = {
        [runDefinition.properties.trigger.name]: {
          properties: {
            status: runDefinition.properties.trigger.status,
          },
          outputs: triggerOutputs.outputs,
        },
      };

      const actionMocks: Record<string, any> = {};
      await Promise.all(
        Object.keys(runDefinition.properties.actions).map(async (actionName) => {
          const outputsLink = runDefinition.properties.actions[actionName].outputsLink as ContentLink;
          const actionOutputs = await services.runService.getActionLinks({ outputsLink });
          actionMocks[actionName] = {
            properties: {
              status: runDefinition.properties.actions[actionName].status,
            },
            outputs: actionOutputs.outputs,
          };
        })
      );

      dispatch(
        updateUnitTestDefinition({
          unitTestDefinition: {
            triggerMocks: triggerMocks,
            actionMocks: actionMocks,
            assertions: [],
          },
        })
      );
    }
  };

  const onRunInstanceError = async () => {
    setRunInstance(null);
    setStandardApp(undefined);
  };

  /// TODO(ccastrotrejo): NEED TO UPDATE THIS
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
    readOnly && !isMonitoringView && !isUnitTest ? null : (
      <DesignerCommandBar
        isDisabled={isError || isFetching || isLoading}
        isRefreshing={isRefetching}
        onRefresh={refetch}
        isDarkMode={theme === Theme.Dark}
        isUnitTest={isUnitTest}
        isLocal={isLocal}
        runId={runId}
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
      unitTestDefinition={unitTestDefinition}
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
        isUnitTest,
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
