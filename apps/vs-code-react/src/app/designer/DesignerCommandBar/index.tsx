import { VSCodeContext } from '../../../webviewCommunication';
import { mergeStyles, mergeStyleSets, Spinner, SpinnerSize } from '@fluentui/react';
import {
  serializeWorkflow as serializeBJSWorkflow,
  store as DesignerStore,
  useIsDesignerDirty,
  validateParameter,
  updateParameterValidation,
  openPanel,
  useWorkflowParameterValidationErrors,
  useAllSettingsValidationErrors,
  useAllConnectionErrors,
} from '@microsoft/logic-apps-designer';
import { RUN_AFTER_COLORS, isNullOrEmpty } from '@microsoft/logic-apps-shared';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useContext, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useMutation } from '@tanstack/react-query';
import { Toolbar, ToolbarButton } from '@fluentui/react-components';
import {
  SaveRegular,
  ArrowClockwiseRegular,
  ErrorCircleFilled,
  ErrorCircleRegular,
  ArrowSyncRegular,
  SettingsRegular,
} from '@fluentui/react-icons';

export interface DesignerCommandBarProps {
  isRefreshing: boolean;
  isDisabled: boolean;
  onRefresh(): void;
  isDarkMode: boolean;
}

export const DesignerCommandBar: React.FC<DesignerCommandBarProps> = ({ isRefreshing, isDisabled, onRefresh, isDarkMode }) => {
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
      await vscode.postMessage({
        command: ExtensionCommand.save,
        definition,
        parameters,
        connectionReferences,
      });
    }
  });

  const onResubmit = async () => {
    vscode.postMessage({
      command: ExtensionCommand.resubmitRun,
    });
  };

  const Resources = {
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
  };

  const iconClass = mergeStyles({
    fontSize: 16,
    height: 16,
    width: 16,
  });

  const classNames = mergeStyleSets({
    azureBlue: [{ color: 'rgb(0, 120, 212)' }, iconClass],
    disableGrey: [{ color: 'rgb(121, 119, 117)' }, iconClass],
  });

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

  const haveErrors = useMemo(
    () => haveInputErrors || haveWorkflowParameterErrors || haveSettingsErrors || haveConnectionErrors,
    [haveInputErrors, haveWorkflowParameterErrors, haveSettingsErrors, haveConnectionErrors]
  );

  const isSaveDisabled = useMemo(() => isSaving || haveErrors || !designerIsDirty, [isSaving, haveErrors, designerIsDirty]);

  const designerItems = [
    {
      key: 'Save',
      disabled: isSaveDisabled,
      ariaLabel: Resources.DESIGNER_SAVE,
      text: Resources.DESIGNER_SAVE,
      icon: isSaving ? (
        <Spinner size={SpinnerSize.small} />
      ) : (
        <SaveRegular className={isSaveDisabled ? classNames.disableGrey : classNames.azureBlue} />
      ),
      onClick: () => {
        saveWorkflowMutate();
      },
    },
    {
      key: 'Parameter',
      disabled: false,
      ariaLabel: Resources.DESIGNER_PARAMETERS,
      text: Resources.DESIGNER_PARAMETERS,
      icon: <SettingsRegular />,
      // onRenderText: (item: { text: string }) => {
      //   return (
      //     <>
      //       {item.text}
      //       {haveWorkflowParameterErrors ? (
      //         <div style={{ display: 'inline-block', marginLeft: 8 }}>
      //           <TrafficLightDot fill={RUN_AFTER_COLORS[isDarkMode ? 'dark' : 'light']['FAILED']} />
      //         </div>
      //       ) : null}
      //     </>
      //   );
      // },
      onClick: () => !!dispatch(openPanel({ panelMode: 'WorkflowParameters' })),
    },
    {
      key: 'errors',
      disabled: !haveErrors,
      ariaLabel: Resources.DESIGNER_ERRORS,
      text: Resources.DESIGNER_ERRORS,
      icon: haveErrors ? (
        <ErrorCircleFilled style={{ color: RUN_AFTER_COLORS[isDarkMode ? 'dark' : 'light']['FAILED'] }} />
      ) : (
        <ErrorCircleRegular />
      ),
      onClick: () => !!dispatch(openPanel({ panelMode: 'Error' })),
    },
  ];

  const monitoringViewItems = [
    {
      key: 'Refresh',
      disabled: isDisabled ? isDisabled : isRefreshing,
      ariaLabel: Resources.MONITORING_VIEW_REFRESH,
      text: Resources.MONITORING_VIEW_REFRESH,
      icon: <ArrowSyncRegular />,
      onClick: onRefresh,
    },
    {
      key: 'Rerun',
      disabled: isDisabled,
      ariaLabel: Resources.MONITORING_VIEW_RESUBMIT,
      text: Resources.MONITORING_VIEW_RESUBMIT,
      icon: <ArrowClockwiseRegular />,
      onClick: () => {
        onResubmit();
      },
    },
  ];

  return (
    <Toolbar aria-label={Resources.COMMAND_BAR_ARIA}>
      {(isMonitoringView ? monitoringViewItems : designerItems).map((buttonProps) => (
        <ToolbarButton
          disabled={buttonProps.disabled}
          key={buttonProps.key}
          aria-label={buttonProps.ariaLabel}
          icon={buttonProps.icon}
          onClick={buttonProps.onClick}
        >
          {buttonProps.text}
        </ToolbarButton>
      ))}
    </Toolbar>
    // <CommandBar
    //   items={isMonitoringView ? monitoringViewItems : designerItems}
    //   ariaLabel=
    //   styles={{
    //     root: { borderBottom: `1px solid ${isDarkMode ? '#333333' : '#d6d6d6'}`, padding: '0 20px' },
    //   }}
    // />
  );
};
