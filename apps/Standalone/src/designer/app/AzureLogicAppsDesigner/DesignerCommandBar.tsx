import { FontIcon, mergeStyles, mergeStyleSets } from '@fluentui/react';
import { Badge, Spinner } from '@fluentui/react-components';
import type { ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import { CommandBar } from '@fluentui/react/lib/CommandBar';
import type { ILoggerService } from '@microsoft/logic-apps-shared';
import {
  LogEntryLevel,
  LoggerService,
  isNullOrEmpty,
  RUN_AFTER_COLORS,
  ChatbotService,
  WorkflowService,
} from '@microsoft/logic-apps-shared';
import type { AppDispatch, CustomCodeFileNameMapping, RootState, Workflow } from '@microsoft/logic-apps-designer';
import {
  store as DesignerStore,
  serializeBJSWorkflow,
  updateCallbackUrl,
  useIsDesignerDirty,
  useAllSettingsValidationErrors,
  useWorkflowParameterValidationErrors,
  useAllConnectionErrors,
  validateParameter,
  updateParameterValidation,
  openPanel,
  useNodesInitialized,
  serializeUnitTestDefinition,
  useAssertionsValidationErrors,
  getNodeOutputOperations,
  getCustomCodeFilesWithData,
  resetDesignerDirtyState,
  collapsePanel,
  onUndoClick,
  useCanUndo,
  useCanRedo,
  onRedoClick,
  serializeWorkflow,
  getDocumentationMetadata,
  resetDesignerView,
  useNodesAndDynamicDataInitialized,
  getRun,
  downloadDocumentAsFile,
} from '@microsoft/logic-apps-designer';
import { useCallback, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import LogicAppsIcon from '../../../assets/logicapp.svg';
import { environment } from '../../../environments/environment';
import { isSuccessResponse } from './Services/HttpClient';
import axios from 'axios';

const iconClass = mergeStyles({
  fontSize: 16,
  height: 16,
  width: 16,
});

const classNames = mergeStyleSets({
  azureBlue: [{ color: 'rgb(0, 120, 212)' }, iconClass],
  azureGrey: [{ color: '#A19F9D' }, iconClass],
  azureRed: [{ color: 'rgb(194, 57, 52)' }, iconClass],
});

export const DesignerCommandBar = ({
  id,
  discard,
  saveWorkflow,
  isDesignerView,
  isMonitoringView,
  isDarkMode,
  showConnectionsPanel,
  showRunHistory,
  toggleRunHistory,
  enableCopilot,
  isUnitTest,
  switchViews,
  saveWorkflowFromCode,
  toggleMonitoringView,
  selectRun,
}: {
  id: string;
  location: string;
  isReadOnly: boolean;
  discard: () => unknown;
  saveWorkflow: (workflow: Workflow, customCodeData: CustomCodeFileNameMapping | undefined, clearDirtyState: () => void) => Promise<void>;
  isDesignerView?: boolean;
  isMonitoringView?: boolean;
  isDarkMode: boolean;
  isUnitTest: boolean;
  isConsumption?: boolean;
  showConnectionsPanel?: boolean;
  showRunHistory?: boolean;
  toggleRunHistory: () => void;
  enableCopilot?: () => void;
  loggerService?: ILoggerService;
  switchViews: () => void;
  saveWorkflowFromCode: (clearDirtyState: () => void) => void;
  toggleMonitoringView: () => void;
  selectRun?: (runId: string) => void;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const isCopilotReady = useNodesInitialized();
  const { isLoading: isSaving, mutate: saveWorkflowMutate } = useMutation(async () => {
    const designerState = DesignerStore.getState();
    const serializedWorkflow = await serializeBJSWorkflow(designerState, {
      skipValidation: false,
      ignoreNonCriticalErrors: true,
    });

    const validationErrorsList = Object.entries(designerState.operations.inputParameters).reduce((acc: any, [id, nodeInputs]) => {
      const hasValidationErrors = Object.values(nodeInputs.parameterGroups).some((parameterGroup) => {
        return parameterGroup.parameters.some((parameter) => {
          const validationErrors = validateParameter(parameter, parameter.value);
          if (validationErrors.length > 0) {
            dispatch(
              updateParameterValidation({
                nodeId: id,
                groupId: parameterGroup.id,
                parameterId: parameter.id,
                validationErrors,
              })
            );
          }
          return validationErrors.length;
        });
      });
      if (hasValidationErrors) {
        acc[id] = hasValidationErrors;
      }
      return acc;
    }, {});

    const hasParametersErrors = !isNullOrEmpty(validationErrorsList);

    const customCodeFilesWithData = getCustomCodeFilesWithData(designerState.customCode);

    if (!hasParametersErrors) {
      await saveWorkflow(serializedWorkflow, customCodeFilesWithData, () => dispatch(resetDesignerDirtyState(undefined)));
      if (Object.keys(serializedWorkflow?.definition?.triggers ?? {}).length > 0) {
        updateCallbackUrl(designerState, dispatch);
      }
    }
  });
  const { isLoading: isSavingUnitTest, mutate: saveUnitTestMutate } = useMutation(async () => {
    const designerState = DesignerStore.getState();
    const definition = await serializeUnitTestDefinition(designerState);

    console.log(definition);
    alert('Check console for unit test serialization');
  });

  const { isLoading: isSavingBlankUnitTest, mutate: saveBlankUnitTestMutate } = useMutation(async () => {
    const designerState = DesignerStore.getState();
    const operationContents = await getNodeOutputOperations(designerState);

    console.log(operationContents);
    alert('Check console for blank unit test operationContents');
  });

  const { isLoading: isDownloadingDocument, mutate: downloadDocument } = useMutation(async () => {
    const designerState = DesignerStore.getState();
    const workflow = await serializeWorkflow(designerState);
    const docMetaData = getDocumentationMetadata(designerState.operations.operationInfo, designerState.tokens.outputTokens);
    const response = await ChatbotService().getCopilotDocumentation(
      docMetaData,
      workflow,
      environment?.armToken ? `Bearer ${environment.armToken}` : ''
    );
    if (!isSuccessResponse(response.status)) {
      alert('Failed to download document');
      return;
    }
    const queryResponse: string = response.data.properties.response;
    downloadDocumentAsFile(queryResponse);
  });

  const [runLoading, setRunLoading] = useState(false);
  const runWorkflow = useCallback(async () => {
    setRunLoading(true);
    const designerState = DesignerStore.getState();
    const serializedWorkflow = await serializeBJSWorkflow(designerState, {
      skipValidation: false,
      ignoreNonCriticalErrors: true,
    });
    const triggerId = Object.keys(serializedWorkflow.definition?.triggers ?? {})?.[0];
    const callbackInfo = await WorkflowService().getCallbackUrl(triggerId);
    const result = await axios.create().request({
      method: callbackInfo.method,
      url: callbackInfo.value,
    });
    setRunLoading(false);
    return result;
  }, []);

  const designerIsDirty = useIsDesignerDirty();
  const isInitialized = useNodesAndDynamicDataInitialized();

  const allInputErrors = useSelector((state: RootState) => {
    return (Object.entries(state.operations.inputParameters) ?? []).filter(([_id, nodeInputs]) =>
      Object.values(nodeInputs.parameterGroups).some((parameterGroup) =>
        parameterGroup.parameters.some((parameter) => (parameter?.validationErrors?.length ?? 0) > 0)
      )
    );
  });
  const allWorkflowParameterErrors = useWorkflowParameterValidationErrors();
  const haveWorkflowParameterErrors = Object.keys(allWorkflowParameterErrors ?? {}).length > 0;
  const allAssertionsErrors = useAssertionsValidationErrors();
  const haveAssertionErrors = Object.keys(allAssertionsErrors ?? {}).length > 0;
  const allSettingsErrors = useAllSettingsValidationErrors();
  const haveSettingsErrors = Object.keys(allSettingsErrors ?? {}).length > 0;
  const allConnectionErrors = useAllConnectionErrors();
  const haveConnectionErrors = Object.keys(allConnectionErrors ?? {}).length > 0;
  const saveBlankUnitTestIsDisabled = !isUnitTest || isSavingBlankUnitTest || haveAssertionErrors;

  const haveErrors = useMemo(
    () => allInputErrors.length > 0 || haveWorkflowParameterErrors || haveSettingsErrors || haveConnectionErrors,
    [allInputErrors, haveWorkflowParameterErrors, haveSettingsErrors, haveConnectionErrors]
  );

  const saveIsDisabled = isSaving || allInputErrors.length > 0 || haveWorkflowParameterErrors || haveSettingsErrors || !designerIsDirty;

  const saveUnitTestIsDisabled = !isUnitTest || isSavingUnitTest || haveAssertionErrors;
  const isUndoDisabled = !useCanUndo();
  const isRedoDisabled = !useCanRedo();

  const baseStartItems: ICommandBarItemProps[] = useMemo(
    () => [
      ...(showRunHistory
        ? []
        : [
            {
              key: 'runHistory',
              text: 'Run History',
              iconProps: { iconName: 'History' },
              onClick: () => {
                if (!isMonitoringView) {
                  toggleMonitoringView();
                }
                toggleRunHistory();
              },
            },
          ]),
    ],
    [showRunHistory, isMonitoringView, toggleMonitoringView, toggleRunHistory]
  );

  const baseEndItems: ICommandBarItemProps[] = useMemo(
    () => [
      {
        key: 'fileABug',
        text: 'File a bug',
        iconProps: { iconName: 'Bug' },
        onClick: () => {
          window.open('https://github.com/Azure/logic_apps_designer/issues/new', '_blank');
        },
      },
    ],
    []
  );

  const monitoringItems: ICommandBarItemProps[] = useMemo(
    () => [
      ...baseStartItems,
      {
        key: 'edit',
        text: 'Edit',
        iconProps: { iconName: 'Edit' },
        onClick: () => {
          toggleMonitoringView();
        },
      },
      ...baseEndItems,
    ],
    [baseStartItems, baseEndItems, toggleMonitoringView]
  );

  const editorItems: ICommandBarItemProps[] = useMemo(
    () => [
      ...baseStartItems,
      {
        key: 'run',
        text: 'Run',
        disabled: !isDesignerView || runLoading,
        iconProps: { iconName: 'Play' },
        onClick: () => {
          const asyncOnClick = async () => {
            const result = await runWorkflow();
            const runId = result.headers?.['x-ms-workflow-run-id'];
            const fullRunId = `${id}/runs/${runId}`;
            if (fullRunId) {
              await getRun(fullRunId);
              selectRun?.(runId);
            }
          };
          asyncOnClick();
        },
      },
      {
        key: 'save',
        text: 'Save',
        disabled: saveIsDisabled,
        onRenderIcon: () => {
          return isSaving ? (
            <Spinner size={'extra-tiny'} />
          ) : (
            <FontIcon aria-label="Save" iconName="Save" className={saveIsDisabled ? classNames.azureGrey : classNames.azureBlue} />
          );
        },
        onClick: () => {
          if (isDesignerView) {
            saveWorkflowMutate();
          } else {
            saveWorkflowFromCode(() => dispatch(resetDesignerDirtyState(undefined)));
          }
        },
      },
      {
        key: 'saveUnitTest',
        text: 'Save Unit Test',
        disabled: saveUnitTestIsDisabled,
        onRenderIcon: () => {
          return isSavingUnitTest ? (
            <Spinner size={'extra-tiny'} />
          ) : (
            <FontIcon aria-label="Save" iconName="Save" className={saveUnitTestIsDisabled ? classNames.azureGrey : classNames.azureBlue} />
          );
        },
        onClick: () => {
          saveUnitTestMutate();
        },
      },
      {
        key: 'saveBlankUnitTest',
        text: 'Save Blank Unit Test',
        disabled: saveBlankUnitTestIsDisabled,
        onRenderIcon: () => {
          return isSavingBlankUnitTest ? (
            <Spinner size="small" />
          ) : (
            <FontIcon aria-label="Save" iconName="Save" className={classNames.azureBlue} />
          );
        },
        onClick: () => {
          saveBlankUnitTestMutate();
        },
      },
      {
        key: 'discard',
        disabled: isSaving || !isDesignerView,
        text: 'Discard',
        iconProps: { iconName: 'Clear' },
        onClick: () => {
          discard();
        },
      },
      {
        key: 'parameters',
        text: 'Parameters',
        disabled: !isDesignerView,
        iconProps: { iconName: 'Parameter' },
        onClick: () => !!dispatch(openPanel({ panelMode: 'WorkflowParameters' })),
        onRenderText: (item: { text: string }) => <CustomCommandBarButton text={item.text} showError={haveWorkflowParameterErrors} />,
      },
      {
        key: 'Assertions',
        text: 'Assertions',
        ariaLabel: 'Assertions',
        iconProps: { iconName: 'CheckMark' },
        disabled: !isUnitTest,
        onClick: () => !!dispatch(openPanel({ panelMode: 'Assertions' })),
        onRenderText: (item: { text: string }) => <CustomCommandBarButton text={item.text} showError={haveAssertionErrors} />,
      },
      {
        key: 'codeview',
        text: isDesignerView ? 'Code View' : 'Designer View',
        iconProps: isDesignerView ? { iconName: 'Code' } : { imageProps: { src: LogicAppsIcon } },
        onClick: () => {
          switchViews();
          dispatch(collapsePanel());
          dispatch(resetDesignerView());
        },
      },
      ...(showConnectionsPanel
        ? [
            {
              key: 'connections',
              text: 'Connections',
              iconProps: { iconName: 'Link' },
              onClick: () => !!dispatch(openPanel({ panelMode: 'Connection' })),
              onRenderText: (item: { text: string }) => <CustomCommandBarButton text={item.text} showError={haveConnectionErrors} />,
            },
          ]
        : []),
      {
        key: 'errors',
        text: 'Errors',
        disabled: !haveErrors,
        iconProps: {
          iconName: haveErrors ? 'StatusErrorFull' : 'ErrorBadge',
          style: haveErrors
            ? {
                color: RUN_AFTER_COLORS[isDarkMode ? 'dark' : 'light']['FAILED'],
              }
            : undefined,
        },
        onClick: () => !!dispatch(openPanel({ panelMode: 'Error' })),
      },
      {
        key: 'copilot',
        text: 'Assistant',
        iconProps: { iconName: 'Chat' },
        disabled: !isCopilotReady,
        onClick: () => {
          enableCopilot?.();
          LoggerService().log({
            level: LogEntryLevel.Warning,
            area: 'chatbot',
            message: 'workflow assistant opened',
          });
        },
      },
      {
        key: 'document',
        text: 'Document',
        disabled: haveErrors || isDownloadingDocument,
        onRenderIcon: () => {
          return isDownloadingDocument ? (
            <Spinner size={'extra-small'} />
          ) : (
            <FontIcon aria-label="Download" iconName="Download" className={haveErrors ? classNames.azureGrey : classNames.azureBlue} />
          );
        },
        onClick: () => {
          downloadDocument();
        },
      },
      {
        key: 'Undo',
        text: 'Undo',
        iconProps: { iconName: 'Undo' },
        onClick: () => dispatch(onUndoClick()),
        disabled: isUndoDisabled,
      },
      {
        key: 'Redo',
        text: 'Redo',
        iconProps: { iconName: 'Redo' },
        onClick: () => dispatch(onRedoClick()),
        disabled: isRedoDisabled,
      },
      ...baseEndItems,
    ],
    [
      id,
      runLoading,
      selectRun,
      runWorkflow,
      saveIsDisabled,
      isSaving,
      isDesignerView,
      showConnectionsPanel,
      isSavingBlankUnitTest,
      saveBlankUnitTestIsDisabled,
      saveBlankUnitTestMutate,
      haveErrors,
      isDarkMode,
      isUndoDisabled,
      isRedoDisabled,
      saveWorkflowMutate,
      saveWorkflowFromCode,
      discard,
      dispatch,
      haveWorkflowParameterErrors,
      switchViews,
      haveConnectionErrors,
      enableCopilot,
      isCopilotReady,
      isUnitTest,
      saveUnitTestMutate,
      isSavingUnitTest,
      saveUnitTestIsDisabled,
      haveAssertionErrors,
      isDownloadingDocument,
      downloadDocument,
      baseEndItems,
      baseStartItems,
    ]
  );

  return (
    <>
      <CommandBar
        items={isMonitoringView ? monitoringItems : editorItems}
        ariaLabel="Use left and right arrow keys to navigate between commands"
        styles={{
          root: {
            borderBottom: `1px solid ${isDarkMode ? '#333333' : '#d6d6d6'}`,
            position: 'relative',
            padding: '4px 8px',
          },
        }}
      />
      <div
        style={{
          position: 'relative',
          top: '60px',
          left: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          height: '0px',
        }}
      >
        {!isInitialized && <Spinner size={'extra-small'} label={'Loading dynamic data...'} />}
      </div>
    </>
  );
};

const CustomCommandBarButton = ({
  text,
  showError,
}: {
  text: string;
  showError?: boolean;
}) => (
  <div style={{ margin: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
    {text}
    {showError && <Badge size="extra-small" color="danger" />}
  </div>
);
