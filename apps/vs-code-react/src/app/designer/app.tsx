import { createFileSystemConnection, updateUnitTestDefinition } from '../../state/DesignerSlice';
import type { AppDispatch, RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import { DesignerCommandBar } from './DesignerCommandBar';
import './app.less';
import { getDesignerServices, isMultiVariableSupport } from './servicesHelper';
import { getRunInstanceMocks } from './utilities/runInstance';
import { convertConnectionsDataToReferences } from './utilities/workflow';
import { Spinner } from '@fluentui/react-components';
import type { ConnectionCreationInfo, LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import {
  DesignerProvider,
  BJSWorkflowProvider,
  Designer,
  getTheme,
  useThemeObserver,
  getReactQueryClient,
  runsQueriesKeys,
} from '@microsoft/logic-apps-designer';
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
    isUnitTest,
    unitTestDefinition,
    workflowRuntimeBaseUrl,
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

  const isA2A = useMemo(() => {
    return standardApp?.kind === 'Agent';
  }, [standardApp?.kind]);

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
      isA2A,
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
    isA2A,
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

  const isMultiVariableSupportEnabled = useMemo(
    () => isMultiVariableSupport(panelMetaData?.extensionBundleVersion),
    [panelMetaData?.extensionBundleVersion]
  );

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
  } = useQuery<any>([runsQueriesKeys.useRunInstance, { runId }], getRunInstance, {
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    initialData: null,
    enabled: (isMonitoringView || isUnitTest) && !isEmptyString(runId),
  });

  const onRefreshMonitoringView = useCallback(() => {
    if (isMonitoringView) {
      refetch();
      const queryClient = getReactQueryClient();
      queryClient.removeQueries([runsQueriesKeys.useChatHistory]);
      queryClient.removeQueries([runsQueriesKeys.useAgentActionsRepetition]);
      queryClient.removeQueries([runsQueriesKeys.useAgentRepetition]);
      queryClient.removeQueries([runsQueriesKeys.useNodeRepetition]);
    }
  }, [isMonitoringView, refetch]);

  useEffect(() => {
    if (isMonitoringView && !isNullOrUndefined(runData)) {
      setRunInstance(runData);
      setStandardApp((previousApp: any) => {
        return {
          ...previousApp,
          definition: runData.properties.workflow.properties.definition,
        };
      });
    } else if (isUnitTest && isNullOrUndefined(unitTestDefinition)) {
      const updateTestDefinition = async () => {
        if (!isNullOrUndefined(runData)) {
          const { triggerMocks, actionMocks } = await getRunInstanceMocks(runData, services, false);
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
      updateTestDefinition();
    }
  }, [runData, isMonitoringView, isUnitTest, unitTestDefinition, services, dispatch]);

  useEffect(() => {
    if ((isMonitoringView || isUnitTest) && !isEmptyString(runId)) {
      refetch();
    }
  }, [isMonitoringView, isUnitTest, runId, services, refetch]);

  useEffect(() => {
    setStandardApp(panelMetaData?.standardApp);
    setCustomCode(panelMetaData?.customCodeData);
  }, [panelMetaData]);

  const errorApp = <XLargeText text={`${intlText.ERROR_APP} `} className="designer--error" style={{ display: 'block' }} />;

  const loadingApp = <Spinner className="designer--loading" size="large" label={intlText.LOADING_APP} />;

  const designerCommandBar =
    readOnly && !isMonitoringView && !isUnitTest ? null : (
      <DesignerCommandBar
        isDisabled={isError || isFetching || isLoading}
        isRefreshing={isRefetching}
        onRefresh={onRefreshMonitoringView}
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
      customCode={customCode}
      runInstance={runInstance}
      unitTestDefinition={unitTestDefinition}
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
          isUnitTest,
          readOnly,
          isMonitoringView,
          services: services,
          hostOptions: {
            displayRuntimeInfo: true,
            enableMultiVariable: isMultiVariableSupportEnabled,
          },
        }}
      >
        {designerCommandBar}
        {isError ? errorApp : isFetching || isLoading ? loadingApp : designerApp}
      </DesignerProvider>
    </div>
  );
};
