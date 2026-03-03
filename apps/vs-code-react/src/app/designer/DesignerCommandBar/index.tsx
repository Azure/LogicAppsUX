import { VSCodeContext } from '../../../webviewCommunication';
import {
  serializeWorkflow as serializeBJSWorkflow,
  store as DesignerStore,
  serializeUnitTestDefinition,
  getNodeOutputOperations,
  useIsDesignerDirty,
  validateParameter,
  updateParameterValidation,
  openPanel,
  useAssertionsValidationErrors,
  useWorkflowParameterValidationErrors,
  useAllSettingsValidationErrors,
  useAllConnectionErrors,
  getCustomCodeFilesWithData,
} from '@microsoft/logic-apps-designer';
import { type AgentURL, RUN_AFTER_COLORS, equals, isNullOrEmpty } from '@microsoft/logic-apps-shared';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useContext, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Spinner, Toolbar, ToolbarButton, Tooltip } from '@fluentui/react-components';
import {
  SaveRegular,
  ArrowClockwiseRegular,
  MentionBracketsRegular,
  ReplayRegular,
  DismissCircleRegular,
  DismissCircleFilled,
  BeakerRegular,
  CheckmarkRegular,
  bundleIcon,
  BugFilled,
  BugRegular,
  SaveFilled,
  BeakerFilled,
  MentionBracketsFilled,
  LinkFilled,
  LinkRegular,
  ArrowClockwiseFilled,
  CheckmarkFilled,
  ReplayFilled,
} from '@fluentui/react-icons';
import { TrafficLightDot } from '@microsoft/designer-ui';
import { useIntlMessages, designerMessages } from '../../../intl';
import { ChatButton } from './chat';

// Designer icons
const SaveIcon = bundleIcon(SaveFilled, SaveRegular);
const ParametersIcon = bundleIcon(MentionBracketsFilled, MentionBracketsRegular);
const ConnectionsIcon = bundleIcon(LinkFilled, LinkRegular);
const CreateUnitTestIcon = bundleIcon(BeakerFilled, BeakerRegular);

// Base icons
const BugIcon = bundleIcon(BugFilled, BugRegular);

// Monitoring view icons
const RefreshIcon = bundleIcon(ArrowClockwiseFilled, ArrowClockwiseRegular);
const ResubmitIcon = bundleIcon(ReplayFilled, ReplayRegular);

// Unit test icons
const AssertionsIcon = bundleIcon(CheckmarkFilled, CheckmarkRegular);

export interface DesignerCommandBarProps {
  isRefreshing: boolean;
  isDisabled: boolean;
  isWorkflowRuntimeRunning: boolean;
  onRefresh(): void;
  isDarkMode: boolean;
  isUnitTest: boolean;
  isLocal: boolean;
  runId: string;
  kind?: string;
  getAgentUrl?: () => Promise<AgentURL>;
}

export const DesignerCommandBar: React.FC<DesignerCommandBarProps> = ({
  isRefreshing,
  isDisabled,
  isWorkflowRuntimeRunning,
  onRefresh,
  isDarkMode,
  isUnitTest,
  isLocal,
  runId,
  getAgentUrl,
}) => {
  const vscode = useContext(VSCodeContext);
  const dispatch = DesignerStore.dispatch;
  const designerState = DesignerStore.getState();
  const isMonitoringView = designerState.designerOptions.isMonitoringView;
  const designerIsDirty = useIsDesignerDirty();
  const intlText = useIntlMessages(designerMessages);

  const shouldRenderChatButton = useMemo(() => {
    const isA2AWorkflow = equals(designerState.workflow.workflowKind, 'agent', false);
    return isA2AWorkflow && !isUnitTest && !isMonitoringView;
  }, [designerState.workflow.workflowKind, isMonitoringView, isUnitTest]);

  const { isLoading: isSaving, mutate: saveWorkflowMutate } = useMutation(async () => {
    const { definition, parameters, connectionReferences } = await serializeBJSWorkflow(designerState, {
      skipValidation: false,
      ignoreNonCriticalErrors: true,
    });
    const customCodeData = getCustomCodeFilesWithData(designerState.customCode);

    const validationErrorsList: Record<string, boolean> = {};
    const arr = Object.entries(designerState.operations.inputParameters);
    for (const [id, nodeInputs] of arr) {
      const hasValidationErrors = Object.values(nodeInputs.parameterGroups).some((parameterGroup) => {
        return parameterGroup.parameters.some((parameter) => {
          const validationErrors = validateParameter(parameter, parameter.value);
          if (validationErrors.length > 0) {
            dispatch(updateParameterValidation({ nodeId: id, groupId: parameterGroup.id, parameterId: parameter.id, validationErrors }));
          }
          return validationErrors.length;
        });
      });
      if (hasValidationErrors) {
        validationErrorsList[id] = hasValidationErrors;
      }
    }

    const hasParametersErrors = !isNullOrEmpty(validationErrorsList);

    if (!hasParametersErrors) {
      vscode.postMessage({
        command: ExtensionCommand.save,
        definition,
        parameters,
        connectionReferences,
        customCodeData,
      });
    }
  });

  const { isLoading: isSavingUnitTest, mutate: saveUnitTestMutate } = useMutation(async () => {
    const designerState = DesignerStore.getState();
    const definition = await serializeUnitTestDefinition(designerState);

    await vscode.postMessage({
      command: ExtensionCommand.saveUnitTest,
      definition,
    });
  });

  const { isLoading: isCreatingUnitTest, mutate: createUnitTestMutate } = useMutation(async () => {
    const designerState = DesignerStore.getState();
    const definition = await getNodeOutputOperations(designerState);

    vscode.postMessage({
      command: ExtensionCommand.logTelemetry,
      data: { name: 'CreateUnitTest', timestamp: Date.now(), definition: definition },
    });

    await vscode.postMessage({
      command: ExtensionCommand.createUnitTest,
      definition,
    });
  });

  const onResubmit = async () => {
    vscode.postMessage({
      command: ExtensionCommand.resubmitRun,
    });
  };

  const onCreateUnitTestFromRun = async () => {
    const designerState = DesignerStore.getState();
    const definition = await getNodeOutputOperations(designerState);
    vscode.postMessage({
      command: ExtensionCommand.logTelemetry,
      data: { name: 'CreateUnitTestFromRun', timestamp: Date.now(), definition: definition },
    });

    vscode.postMessage({
      command: ExtensionCommand.createUnitTestFromRun,
      runId: runId,
      definition: definition,
    });
  };

  const allInputErrors = (Object.entries(designerState.operations.inputParameters) ?? []).filter(([_id, nodeInputs]) =>
    Object.values(nodeInputs.parameterGroups).some((parameterGroup) =>
      parameterGroup.parameters.some((parameter) => (parameter?.validationErrors?.length ?? 0) > 0)
    )
  );

  const haveInputErrors = allInputErrors.length > 0;
  const allWorkflowParameterErrors = useWorkflowParameterValidationErrors();
  const haveWorkflowParameterErrors = Object.keys(allWorkflowParameterErrors ?? {}).length > 0;
  const allSettingsErrors = useAllSettingsValidationErrors();
  const haveSettingsErrors = Object.keys(allSettingsErrors ?? {}).length > 0;
  const allConnectionErrors = useAllConnectionErrors();
  const haveConnectionErrors = Object.keys(allConnectionErrors ?? {}).length > 0;

  const allAssertionsErrors = useAssertionsValidationErrors();
  const haveAssertionErrors = Object.keys(allAssertionsErrors ?? {}).length > 0;

  const isSaveUnitTestDisabled = isSavingUnitTest || haveAssertionErrors;
  const isCreateUnitTestDisabled = useMemo(
    () => isCreatingUnitTest || haveAssertionErrors || designerIsDirty,
    [isCreatingUnitTest, haveAssertionErrors, designerIsDirty]
  );
  const haveErrors = useMemo(
    () => haveInputErrors || haveWorkflowParameterErrors || haveSettingsErrors || haveConnectionErrors,
    [haveInputErrors, haveWorkflowParameterErrors, haveSettingsErrors, haveConnectionErrors]
  );

  const isSaveDisabled = useMemo(() => isSaving || haveErrors || !designerIsDirty, [isSaving, haveErrors, designerIsDirty]);

  const baseItems = useMemo(
    () => [
      {
        key: 'fileABug',
        disabled: false,
        ariaLabel: intlText.FILE_BUG,
        text: intlText.FILE_BUG,
        icon: <BugIcon />,
        renderTextIcon: null,
        onClick: () => {
          vscode.postMessage({
            command: ExtensionCommand.fileABug,
          });
        },
      },
    ],
    [intlText.FILE_BUG, vscode]
  );

  const designerItems = [
    {
      key: 'Save',
      disabled: isSaveDisabled,
      ariaLabel: intlText.SAVE,
      text: intlText.SAVE,
      icon: isSaving ? <Spinner size="extra-small" /> : <SaveIcon />,
      renderTextIcon: null,
      onClick: () => {
        saveWorkflowMutate();
      },
    },
    {
      key: 'Parameter',
      disabled: false,
      ariaLabel: intlText.PARAMETERS,
      text: intlText.PARAMETERS,
      icon: <ParametersIcon />,
      renderTextIcon: haveWorkflowParameterErrors ? (
        <div style={{ display: 'inline-block', marginLeft: 8 }}>
          <TrafficLightDot fill={RUN_AFTER_COLORS[isDarkMode ? 'dark' : 'light']['FAILED']} />
        </div>
      ) : null,
      onClick: () => !!dispatch(openPanel({ panelMode: 'WorkflowParameters' })),
    },
    {
      key: 'Connections',
      disabled: false,
      ariaLabel: intlText.CONNECTIONS,
      text: intlText.CONNECTIONS,
      icon: <ConnectionsIcon />,
      renderTextIcon: null,
      onClick: () => !!dispatch(openPanel({ panelMode: 'Connection' })),
    },
    {
      key: 'errors',
      disabled: !haveErrors,
      ariaLabel: intlText.ERRORS,
      text: intlText.ERRORS,
      icon: haveErrors ? (
        <DismissCircleFilled style={{ color: RUN_AFTER_COLORS[isDarkMode ? 'dark' : 'light']['FAILED'] }} />
      ) : (
        <DismissCircleRegular />
      ),
      renderTextIcon: null,
      onClick: () => !!dispatch(openPanel({ panelMode: 'Error' })),
    },
    {
      key: 'CreateUnitTest',
      disabled: isCreateUnitTestDisabled,
      text: intlText.CREATE_UNIT_TEST,
      ariaLabel: intlText.CREATE_UNIT_TEST,
      icon: isCreatingUnitTest ? <Spinner size="extra-small" /> : <CreateUnitTestIcon />,
      renderTextIcon: null,
      onClick: () => {
        createUnitTestMutate();
      },
    },
    ...baseItems,
  ];

  const monitoringViewItems = [
    {
      key: 'Refresh',
      disabled: isDisabled ? isDisabled : isRefreshing,
      ariaLabel: intlText.REFRESH,
      text: intlText.REFRESH,
      icon: <RefreshIcon />,
      renderTextIcon: null,
      onClick: onRefresh,
    },
    {
      key: 'Rerun',
      disabled: isDisabled,
      ariaLabel: intlText.RESUBMIT,
      text: intlText.RESUBMIT,
      icon: <ResubmitIcon />,
      renderTextIcon: null,
      onClick: () => {
        onResubmit();
      },
    },
    ...(isLocal
      ? [
          {
            key: 'CreateUnitTestFromRun',
            disabled: isDisabled,
            ariaLabel: intlText.CREATE_UNIT_TEST_FROM_RUN,
            text: intlText.CREATE_UNIT_TEST_FROM_RUN,
            icon: <CreateUnitTestIcon />,
            renderTextIcon: null,
            onClick: () => {
              onCreateUnitTestFromRun();
            },
          },
        ]
      : []),
    ...baseItems,
  ];

  const unitTestItems = [
    {
      key: 'Save',
      disabled: isSaveUnitTestDisabled,
      text: intlText.SAVE_UNIT_TEST,
      ariaLabel: intlText.SAVE_UNIT_TEST,
      icon: isSavingUnitTest ? <Spinner size="extra-small" /> : <SaveIcon />,
      renderTextIcon: null,
      onClick: () => {
        saveUnitTestMutate();
      },
    },
    {
      key: 'CreateUnitTest',
      disabled: isCreateUnitTestDisabled,
      text: intlText.CREATE_UNIT_TEST,
      ariaLabel: intlText.CREATE_UNIT_TEST,
      icon: isCreatingUnitTest ? <Spinner size="extra-small" /> : <SaveRegular />,
      renderTextIcon: null,
      onClick: () => {
        createUnitTestMutate();
      },
    },
    {
      key: 'Assertions',
      disabled: false,
      text: intlText.UNIT_TEST_ASSERTIONS,
      ariaLabel: intlText.UNIT_TEST_ASSERTIONS,
      icon: <AssertionsIcon />,
      renderTextIcon: haveWorkflowParameterErrors ? (
        <div style={{ display: 'inline-block', marginLeft: 8 }}>
          <TrafficLightDot fill={RUN_AFTER_COLORS[isDarkMode ? 'dark' : 'light']['FAILED']} />
        </div>
      ) : null,
      onClick: () => !!dispatch(openPanel({ panelMode: 'Assertions' })),
    },
    ...baseItems,
  ];

  return (
    <Toolbar
      style={{
        borderBottom: `1px solid ${isDarkMode ? '#333333' : '#d6d6d6'}`,
        padding: '0 20px',
      }}
      aria-label={intlText.COMMAND_BAR_ARIA}
    >
      {(isUnitTest ? unitTestItems : isMonitoringView ? monitoringViewItems : designerItems).map((buttonProps) => (
        <ToolbarButton
          disabled={buttonProps.disabled}
          key={buttonProps.key}
          aria-label={buttonProps.ariaLabel}
          icon={buttonProps.icon}
          onClick={buttonProps.onClick}
        >
          {buttonProps.text}
          {buttonProps.renderTextIcon}
        </ToolbarButton>
      ))}
      {shouldRenderChatButton ? (
        <Tooltip relationship="label" withArrow appearance="inverted" content={intlText.CHAT_BUTTON_TOOLTIP_CONTENT}>
          <span style={{ display: 'inline-flex' }}>
            <ChatButton
              appearance="transparent"
              isDarkMode={isDarkMode}
              saveWorkflow={async () => saveWorkflowMutate()}
              getAgentUrl={getAgentUrl}
              isWorkflowRuntimeRunning={isWorkflowRuntimeRunning}
              disabled={!isWorkflowRuntimeRunning}
            />
          </span>
        </Tooltip>
      ) : null}
    </Toolbar>
  );
};
