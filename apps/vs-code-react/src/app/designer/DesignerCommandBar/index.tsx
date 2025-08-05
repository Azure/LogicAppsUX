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
import { RUN_AFTER_COLORS, isNullOrEmpty } from '@microsoft/logic-apps-shared';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useContext, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useMutation } from '@tanstack/react-query';
import { Spinner, Toolbar, ToolbarButton } from '@fluentui/react-components';
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

// Designer icons
const SaveIcon = bundleIcon(SaveFilled, SaveRegular);
const ParametersIcon = bundleIcon(MentionBracketsFilled, MentionBracketsRegular);
const ConnectionsIcon = bundleIcon(LinkFilled, LinkRegular);
const SaveBlankUnitTestIcon = bundleIcon(BeakerFilled, BeakerRegular);
const GenerateTestsIcon = bundleIcon(BeakerFilled, BeakerRegular);

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
  onRefresh(): void;
  isDarkMode: boolean;
  isUnitTest: boolean;
  isLocal: boolean;
  runId: string;
}

export const DesignerCommandBar: React.FC<DesignerCommandBarProps> = ({
  isRefreshing,
  isDisabled,
  onRefresh,
  isDarkMode,
  isUnitTest,
  isLocal,
  runId,
}) => {
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);
  const dispatch = DesignerStore.dispatch;
  const designerState = DesignerStore.getState();

  const isMonitoringView = designerState.designerOptions.isMonitoringView;
  const designerIsDirty = useIsDesignerDirty();

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

  const { isLoading: isSavingBlankUnitTest, mutate: saveBlankUnitTestMutate } = useMutation(async () => {
    const designerState = DesignerStore.getState();
    const definition = await getNodeOutputOperations(designerState);

    vscode.postMessage({
      command: ExtensionCommand.logTelemetry,
      data: { name: 'SaveBlankUnitTest', timestamp: Date.now(), definition: definition },
    });

    await vscode.postMessage({
      command: ExtensionCommand.saveBlankUnitTest,
      definition,
    });
  });

  const { isLoading: isGeneratingTests, mutate: generateTestsMutate } = useMutation(async () => {
    const designerState = DesignerStore.getState();
    const operationData = await getNodeOutputOperations(designerState);

    vscode.postMessage({
      command: ExtensionCommand.logTelemetry,
      data: { name: 'GenerateTests', timestamp: Date.now(), operationData: operationData },
    });

    await vscode.postMessage({
      command: ExtensionCommand.generateTests,
      operationData,
    });
  });

  const onResubmit = async () => {
    vscode.postMessage({
      command: ExtensionCommand.resubmitRun,
    });
  };

  const onCreateUnitTest = async () => {
    const designerState = DesignerStore.getState();
    const definition = await getNodeOutputOperations(designerState);
    vscode.postMessage({
      command: ExtensionCommand.logTelemetry,
      data: { name: 'CreateUnitTest', timestamp: Date.now(), definition: definition },
    });

    vscode.postMessage({
      command: ExtensionCommand.createUnitTest,
      runId: runId,
      definition: definition,
    });
  };

  const Resources = {
    FILE_A_BUG: intl.formatMessage({
      defaultMessage: 'File a bug',
      id: '1PQFOA',
      description: 'Button text for file a bug',
    }),
    DESIGNER_SAVE: intl.formatMessage({
      defaultMessage: 'Save',
      id: 'ZvAp7m',
      description: 'Button text for save',
    }),
    DESIGNER_PARAMETERS: intl.formatMessage({
      defaultMessage: 'Parameters',
      id: '+0ua83',
      description: 'Button text for parameters',
    }),
    DESIGNER_CONNECTIONS: intl.formatMessage({
      defaultMessage: 'Connections',
      id: 'm/GihH',
      description: 'Button text for connections',
    }),
    DESIGNER_ERRORS: intl.formatMessage({
      defaultMessage: 'Errors',
      id: 'ohOaXj',
      description: 'Button text for errors',
    }),
    MONITORING_VIEW_REFRESH: intl.formatMessage({
      defaultMessage: 'Refresh',
      id: 'pr9GwA',
      description: 'Button text for refresh',
    }),
    MONITORING_VIEW_RESUBMIT: intl.formatMessage({
      defaultMessage: 'Resubmit',
      id: 'sOnphB',
      description: 'Button text for resubmit',
    }),
    COMMAND_BAR_ARIA: intl.formatMessage({
      defaultMessage: 'Use left and right arrow keys to navigate between commands',
      id: 'rd6fai',
      description: 'Aria describing the way to control the keyboard navigation',
    }),
    CREATE_UNIT_TEST: intl.formatMessage({
      defaultMessage: 'Create unit test from run',
      id: '4eH9hX',
      description: 'Button text for create unit test',
    }),
    UNIT_TEST_SAVE: intl.formatMessage({
      defaultMessage: 'Save unit test definition',
      id: 'QQmbz+',
      description: 'Button text for save unit test definition',
    }),
    UNIT_TEST_ASSERTIONS: intl.formatMessage({
      defaultMessage: 'Assertions',
      id: 'LxRzQm',
      description: 'Button text for unit test asssertions',
    }),
    UNIT_TEST_CREATE_BLANK: intl.formatMessage({
      defaultMessage: 'Create unit test',
      id: 'SUX3dO',
      description: 'Button test for save blank unit test',
    }),
    GENERATE_UNIT_TESTS: intl.formatMessage({
      defaultMessage: 'Generate tests',
      id: 'UpCa6n',
      description: 'Button text for generate tests',
    }),
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
  const isSaveBlankUnitTestDisabled = useMemo(
    () => isSavingBlankUnitTest || haveAssertionErrors || designerIsDirty,
    [isSavingBlankUnitTest, haveAssertionErrors, designerIsDirty]
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
        ariaLabel: Resources.FILE_A_BUG,
        text: Resources.FILE_A_BUG,
        icon: <BugIcon />,
        renderTextIcon: null,
        onClick: () => {
          vscode.postMessage({
            command: ExtensionCommand.fileABug,
          });
        },
      },
    ],
    [Resources.FILE_A_BUG, vscode]
  );

  const designerItems = [
    {
      key: 'Save',
      disabled: isSaveDisabled,
      ariaLabel: Resources.DESIGNER_SAVE,
      text: Resources.DESIGNER_SAVE,
      icon: isSaving ? <Spinner size="extra-small" /> : <SaveIcon />,
      renderTextIcon: null,
      onClick: () => {
        saveWorkflowMutate();
      },
    },
    {
      key: 'Parameter',
      disabled: false,
      ariaLabel: Resources.DESIGNER_PARAMETERS,
      text: Resources.DESIGNER_PARAMETERS,
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
      ariaLabel: Resources.DESIGNER_CONNECTIONS,
      text: Resources.DESIGNER_CONNECTIONS,
      icon: <ConnectionsIcon />,
      renderTextIcon: null,
      onClick: () => !!dispatch(openPanel({ panelMode: 'Connection' })),
    },
    {
      key: 'errors',
      disabled: !haveErrors,
      ariaLabel: Resources.DESIGNER_ERRORS,
      text: Resources.DESIGNER_ERRORS,
      icon: haveErrors ? (
        <DismissCircleFilled style={{ color: RUN_AFTER_COLORS[isDarkMode ? 'dark' : 'light']['FAILED'] }} />
      ) : (
        <DismissCircleRegular />
      ),
      renderTextIcon: null,
      onClick: () => !!dispatch(openPanel({ panelMode: 'Error' })),
    },
    {
      key: 'SaveBlank',
      disabled: isSaveBlankUnitTestDisabled,
      text: Resources.UNIT_TEST_CREATE_BLANK,
      ariaLabel: Resources.UNIT_TEST_CREATE_BLANK,
      icon: isSavingBlankUnitTest ? <Spinner size="extra-small" /> : <SaveBlankUnitTestIcon />,
      renderTextIcon: null,
      onClick: () => {
        saveBlankUnitTestMutate();
      },
    },
    {
      key: 'GenerateTests',
      disabled: isSaveBlankUnitTestDisabled,
      text: Resources.GENERATE_UNIT_TESTS,
      ariaLabel: Resources.GENERATE_UNIT_TESTS,
      icon: isGeneratingTests ? <Spinner size="extra-small" /> : <GenerateTestsIcon />,
      renderTextIcon: null,
      onClick: () => {
        generateTestsMutate();
      },
    },
    ...baseItems,
  ];

  const monitoringViewItems = [
    {
      key: 'Refresh',
      disabled: isDisabled ? isDisabled : isRefreshing,
      ariaLabel: Resources.MONITORING_VIEW_REFRESH,
      text: Resources.MONITORING_VIEW_REFRESH,
      icon: <RefreshIcon />,
      renderTextIcon: null,
      onClick: onRefresh,
    },
    {
      key: 'Rerun',
      disabled: isDisabled,
      ariaLabel: Resources.MONITORING_VIEW_RESUBMIT,
      text: Resources.MONITORING_VIEW_RESUBMIT,
      icon: <ResubmitIcon />,
      renderTextIcon: null,
      onClick: () => {
        onResubmit();
      },
    },
    ...(isLocal
      ? [
          {
            key: 'CreateUnitTest',
            disabled: isDisabled,
            ariaLabel: Resources.CREATE_UNIT_TEST,
            text: Resources.CREATE_UNIT_TEST,
            icon: <SaveBlankUnitTestIcon />,
            renderTextIcon: null,
            onClick: () => {
              onCreateUnitTest();
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
      text: Resources.UNIT_TEST_SAVE,
      ariaLabel: Resources.UNIT_TEST_SAVE,
      icon: isSavingUnitTest ? <Spinner size="extra-small" /> : <SaveIcon />,
      renderTextIcon: null,
      onClick: () => {
        saveUnitTestMutate();
      },
    },
    {
      key: 'SaveBlank',
      disabled: isSaveBlankUnitTestDisabled,
      text: Resources.UNIT_TEST_CREATE_BLANK,
      ariaLabel: Resources.UNIT_TEST_CREATE_BLANK,
      icon: isSavingBlankUnitTest ? <Spinner size="extra-small" /> : <SaveRegular />,
      renderTextIcon: null,
      onClick: () => {
        saveBlankUnitTestMutate();
      },
    },
    {
      key: 'Assertions',
      disabled: false,
      text: Resources.UNIT_TEST_ASSERTIONS,
      ariaLabel: Resources.UNIT_TEST_ASSERTIONS,
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
      aria-label={Resources.COMMAND_BAR_ARIA}
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
    </Toolbar>
  );
};
