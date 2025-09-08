import { createFileSystemConnection, updateUnitTestDefinition } from '../../state/DesignerSlice';
import type { AppDispatch, RootState } from '../../state/store';
import { VSCodeContext } from '../../webviewCommunication';
import { DesignerCommandBar } from './DesignerCommandBar/indexV2';
import { getDesignerServices, isMultiVariableSupport } from './servicesHelper';
import { getRunInstanceMocks } from './utilities/runInstance';
import { convertConnectionsDataToReferences } from './utilities/workflow';
import type { ConnectionCreationInfo, Workflow } from '@microsoft/logic-apps-shared';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer-v2';
import {
  DesignerProvider,
  BJSWorkflowProvider,
  Designer,
  getTheme,
  useThemeObserver,
  RunHistoryPanel,
  FloatingRunButton,
  useRun,
  FloatinChatButton,
} from '@microsoft/logic-apps-designer-v2';
import { guid, isNullOrUndefined, Theme } from '@microsoft/logic-apps-shared';
import type { FileSystemConnectionInfo, MessageToVsix, StandardApp } from '@microsoft/vscode-extension-logic-apps';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useContext, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useIntl } from 'react-intl';
import { useQueryClient } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { XLargeText } from '@microsoft/designer-ui';
import { useAppStyles } from './appStyles';
import { DesignerViewType } from './constants';
import CodeViewEditor from './CodeViewEditor';

export const DesignerApp = () => {
  const vscode = useContext(VSCodeContext);
  const dispatch: AppDispatch = useDispatch();
  const vscodeState = useSelector((state: RootState) => state.designer);
  const styles = useAppStyles();
  const {
    panelMetaData,
    connectionData,
    baseUrl,
    apiHubServiceDetails,
    readOnly,
    isLocal,
    apiVersion,
    oauthRedirectUrl,
    isMonitoringView: _isMonitoringView,
    runId: _runId,
    hostVersion,
    isUnitTest,
    unitTestDefinition,
    workflowRuntimeBaseUrl,
  } = vscodeState;

  const [currentView, setCurrentView] = useState(_isMonitoringView ? DesignerViewType.Monitoring : DesignerViewType.Workflow);
  const isDesignerView = useMemo(() => currentView === DesignerViewType.Workflow, [currentView]);
  const isCodeView = useMemo(() => currentView === DesignerViewType.Code, [currentView]);
  const isMonitoringView = useMemo(() => currentView === DesignerViewType.Monitoring, [currentView]);

  const [runId, setRunId] = useState(_runId);

  const [initialWorkflow, setInitialWorkflow] = useState<StandardApp | undefined>(panelMetaData?.standardApp);
  const [workflow, setWorkflow] = useState<StandardApp | undefined>(panelMetaData?.standardApp);
  const [customCode, setCustomCode] = useState<Record<string, string> | undefined>(panelMetaData?.customCodeData);

  const [designerID, setDesignerID] = useState(guid());
  const [workflowDefinitionId, setWorkflowDefinitionId] = useState<string>(guid());

  const codeEditorRef = useRef<{ getValue: () => string | undefined; hasChanges: () => boolean }>(null);

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

  const discardAllChanges = useCallback(() => {
    setDesignerID(guid());
  }, []);

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
      connectionData as any,
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

  const isMultiVariableSupportEnabled = useMemo(
    () => isMultiVariableSupport(panelMetaData?.extensionBundleVersion),
    [panelMetaData?.extensionBundleVersion]
  );

  const { data: runInstance, refetch: refetchRunInstance, isError: isErrorRunInstance } = useRun(runId);

  useEffect(() => {
    if (isUnitTest && isNullOrUndefined(unitTestDefinition)) {
      const updateTestDefinition = async () => {
        if (!isNullOrUndefined(runInstance)) {
          const { triggerMocks, actionMocks } = await getRunInstanceMocks(runInstance as any, services, false);
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
  }, [runInstance, isMonitoringView, isUnitTest, unitTestDefinition, services, dispatch]);

  useEffect(() => {
    setWorkflow(panelMetaData?.standardApp);
    setCustomCode(panelMetaData?.customCodeData);
  }, [panelMetaData]);

  useEffect(() => {
    if (runInstance) {
      const standardAppInstance = {
        ...workflow,
        definition: (runInstance.properties.workflow as any).properties.definition,
      } as StandardApp;
      setWorkflow(standardAppInstance);
      setWorkflowDefinitionId(guid());
    }
    // We don't want this to run when workflow is updated
  }, [runInstance]); // eslint-disable-line react-hooks/exhaustive-deps

  /////////////////////////////////////////////////////////////////////////////
  // Saving

  const saveWorkflowFromDesigner = useCallback(
    async (workflowToSave: Workflow, customCodeData: Record<string, string> | undefined, clearDirtyState?: () => void) => {
      const { definition, parameters, connectionReferences } = workflowToSave;
      vscode.postMessage({
        command: ExtensionCommand.save,
        definition,
        parameters,
        connectionReferences,
        customCodeData,
      });
      const newWorkflow = {
        ...workflow,
        definition,
      } as StandardApp;
      setWorkflow(newWorkflow);
      setInitialWorkflow(newWorkflow);
      clearDirtyState?.();
      return {
        definition,
        parameters,
        connectionReferences,
        customCodeData,
      };
    },
    [vscode, workflow]
  );

  const validateAndSaveCodeView = useCallback(
    async (clearDirtyState?: () => void) => {
      try {
        const codeToConvert = JSON.parse(codeEditorRef.current?.getValue() ?? '');
        const { definition, parameters, connectionReferences } = codeToConvert;
        // code view editor cannot add/remove connections, parameters, settings, or customcode
        vscode.postMessage({
          command: ExtensionCommand.save,
          definition,
          parameters,
          connectionReferences,
        });
        const newWorkflow = {
          ...workflow,
          definition,
        } as StandardApp;
        setWorkflow(newWorkflow);
        setInitialWorkflow(newWorkflow);

        clearDirtyState?.();
        return newWorkflow;
      } catch (error: any) {
        if (error.status !== 404) {
          alert(`Error converting code to workflow ${error}`);
        }
      }
      return undefined;
    },
    [vscode, workflow]
  );

  /////////////////////////////////////////////////////////////////////////////
  // View Switching

  const hideMonitoringView = useCallback(() => {
    setRunId('');
    setWorkflow(initialWorkflow);
    setWorkflowDefinitionId(guid());
  }, [initialWorkflow]);

  const switchToDesignerView = useCallback(async () => {
    if (isDesignerView) {
      return;
    }
    if (isCodeView) {
      validateAndSaveCodeView().then(() => setCurrentView(DesignerViewType.Workflow));
    }
    if (isMonitoringView) {
      hideMonitoringView();
      setCurrentView(DesignerViewType.Workflow);
    }
  }, [isDesignerView, isCodeView, isMonitoringView, validateAndSaveCodeView, hideMonitoringView]);

  const switchToCodeView = useCallback(async () => {
    if (isCodeView) {
      return;
    }

    if (isDesignerView) {
      setCurrentView(DesignerViewType.Code);
    }
    if (isMonitoringView) {
      hideMonitoringView();
      setCurrentView(DesignerViewType.Code);
    }
  }, [hideMonitoringView, isCodeView, isDesignerView, isMonitoringView]);

  const switchToMonitoringView = useCallback(async () => {
    if (isMonitoringView) {
      return;
    }

    if (isDesignerView) {
      setCurrentView(DesignerViewType.Monitoring);
    }

    if (isCodeView) {
      validateAndSaveCodeView().then(() => setCurrentView(DesignerViewType.Monitoring));
    }
  }, [isMonitoringView, isDesignerView, isCodeView, validateAndSaveCodeView]);

  /////////////////////////////////////////////////////////////////////////////
  // Rendering

  const ErrorComponent = () => <XLargeText text={`${intlText.ERROR_APP} `} className={styles.designerError} style={{ display: 'block' }} />;
  if (isErrorRunInstance) {
    return <ErrorComponent />;
  }

  return (
    <div key={designerID} style={{ height: '100vh' }}>
      <DesignerProvider
        id={workflowDefinitionId}
        key={designerID}
        locale="en-US"
        options={{
          isDarkMode: theme === Theme.Dark,
          isVSCode: true,
          isUnitTest,
          readOnly: readOnly || isMonitoringView,
          isMonitoringView,
          services: services,
          hostOptions: {
            displayRuntimeInfo: true,
            enableMultiVariable: isMultiVariableSupportEnabled,
          },
        }}
      >
        {workflow?.definition ? (
          <BJSWorkflowProvider
            workflow={{
              definition: workflow.definition,
              connectionReferences,
              parameters: panelMetaData?.parametersData,
              kind: workflow.kind,
            }}
            workflowId={workflowDefinitionId}
            customCode={customCode}
            runInstance={runInstance as any}
            unitTestDefinition={unitTestDefinition}
            appSettings={panelMetaData?.localSettings}
          >
            <DesignerCommandBar
              isDarkMode={theme === Theme.Dark}
              isUnitTest={isUnitTest}
              isLocal={isLocal}
              runId={runId}
              saveWorkflow={saveWorkflowFromDesigner}
              saveWorkflowFromCode={validateAndSaveCodeView}
              discard={discardAllChanges}
              isDesignerView={isDesignerView}
              isCodeView={isCodeView}
              isMonitoringView={isMonitoringView}
              switchToDesignerView={switchToDesignerView}
              switchToCodeView={switchToCodeView}
              switchToMonitoringView={switchToMonitoringView}
            />

            {!isCodeView && (
              <div style={{ display: 'flex', flexDirection: 'row', flexGrow: 1, height: '80%' }}>
                <RunHistoryPanel
                  collapsed={!isMonitoringView}
                  onRunSelected={(_id: string) => setRunId(_id)}
                  onRefresh={() => refetchRunInstance()}
                />
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  <Designer />
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '16px',
                      left: '44%%',
                      display: 'flex',
                      gap: '6%',
                    }}
                  >
                    <FloatingRunButton
                      id={workflowDefinitionId}
                      saveDraftWorkflow={saveWorkflowFromDesigner}
                      onRun={(newRunId: string | undefined) => {
                        switchToMonitoringView();
                        setRunId(newRunId ?? '');
                      }}
                    />
                    <FloatinChatButton />
                  </div>
                </div>
              </div>
            )}
            {isCodeView && <CodeViewEditor ref={codeEditorRef} workflowKind={workflow?.kind} workflowFile={initialWorkflow} />}
          </BJSWorkflowProvider>
        ) : null}
      </DesignerProvider>
    </div>
  );
};
