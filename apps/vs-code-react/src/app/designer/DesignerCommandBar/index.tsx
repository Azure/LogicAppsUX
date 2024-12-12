import { VSCodeContext } from '../../../webviewCommunication';
import { CommandBar, type CommandBarItem } from '@microsoft/designer-ui';
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
import { isNullOrEmpty } from '@microsoft/logic-apps-shared';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useContext, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useMutation } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';

import {
  bundleIcon,
  ArrowClockwiseFilled,
  ArrowClockwiseRegular,
  SaveFilled,
  SaveRegular,
  ReplayFilled,
  ReplayRegular,
  MentionBracketsFilled,
  MentionBracketsRegular,
  ErrorCircleFilled,
  ErrorCircleRegular,
} from '@fluentui/react-icons';

const RefreshIcon = bundleIcon(ArrowClockwiseFilled, ArrowClockwiseRegular);
const SaveIcon = bundleIcon(SaveFilled, SaveRegular);
const ResubmitIcon = bundleIcon(ReplayFilled, ReplayRegular);
const ParametersIcon = bundleIcon(MentionBracketsFilled, MentionBracketsRegular);
const ErrorIcon = bundleIcon(ErrorCircleFilled, ErrorCircleRegular);

export interface DesignerCommandBarProps {
  isRefreshing: boolean;
  isDisabled: boolean;
  onRefresh(): void;
  isDarkMode: boolean;
}

export const DesignerCommandBar: React.FC<DesignerCommandBarProps> = ({ isRefreshing, isDisabled, onRefresh, isDarkMode }) => {
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);
  const dispatch = useDispatch();
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

  const haveErrors = useMemo(
    () => haveInputErrors || haveWorkflowParameterErrors || haveSettingsErrors || haveConnectionErrors,
    [haveInputErrors, haveWorkflowParameterErrors, haveSettingsErrors, haveConnectionErrors]
  );

  const isSaveDisabled = useMemo(() => isSaving || haveErrors || !designerIsDirty, [isSaving, haveErrors, designerIsDirty]);

  const designerItems: CommandBarItem[] = [
    {
      id: 'Save',
      text: Resources.DESIGNER_SAVE,
      icon: <SaveIcon />,
      disabled: isSaveDisabled,
      loading: isSaving,
      onClick: () => {
        saveWorkflowMutate();
      },
    },
    {
      id: 'Parameter',
      text: Resources.DESIGNER_PARAMETERS,
      icon: <ParametersIcon />,
      ariaLabel: Resources.DESIGNER_PARAMETERS,
      isError: haveWorkflowParameterErrors,
      onClick: () => !!dispatch(openPanel({ panelMode: 'WorkflowParameters' })),
    },
    {
      id: 'errors',
      text: Resources.DESIGNER_ERRORS,
      icon: <ErrorIcon />,
      ariaLabel: Resources.DESIGNER_ERRORS,
      disabled: !haveErrors,
      isError: haveErrors,
      onClick: () => !!dispatch(openPanel({ panelMode: 'Error' })),
    },
  ];

  const monitoringViewItems: CommandBarItem[] = [
    {
      id: 'Refresh',
      text: Resources.MONITORING_VIEW_REFRESH,
      icon: <RefreshIcon />,
      ariaLabel: Resources.MONITORING_VIEW_REFRESH,
      disabled: isDisabled ? isDisabled : isRefreshing,
      loading: isRefreshing,
      onClick: onRefresh,
    },
    {
      id: 'Rerun',
      ariaLabel: Resources.MONITORING_VIEW_RESUBMIT,
      icon: <ResubmitIcon />,
      disabled: isDisabled,
      text: Resources.MONITORING_VIEW_RESUBMIT,
      onClick: () => {
        onResubmit();
      },
    },
  ];

  return <CommandBar items={isMonitoringView ? monitoringViewItems : designerItems} isDarkMode={isDarkMode} tabIndex={1} />;
};
