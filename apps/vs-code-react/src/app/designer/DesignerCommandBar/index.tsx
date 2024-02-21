import { VSCodeContext } from '../../../webviewCommunication';
import { FontIcon, mergeStyles, mergeStyleSets, Spinner, SpinnerSize, CommandBar } from '@fluentui/react';
import type { ICommandBarItemProps } from '@fluentui/react';
import { TrafficLightDot } from '@microsoft/designer-ui';
import {
  serializeWorkflow as serializeBJSWorkflow,
  store as DesignerStore,
  serializeUnitTestDefinition,
  useIsDesignerDirty,
  validateParameter,
  updateParameterValidation,
  openPanel,
  useAssertionsValidationErrors,
} from '@microsoft/logic-apps-designer';
import type { RootState } from '@microsoft/logic-apps-designer';
import { RUN_AFTER_COLORS, isNullOrEmpty } from '@microsoft/utils-logic-apps';
import { ExtensionCommand } from '@microsoft/vscode-extension';
import { createSelector } from '@reduxjs/toolkit';
import { useContext, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useMutation } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

export interface DesignerCommandBarProps {
  isRefreshing: boolean;
  isDisabled: boolean;
  onRefresh(): void;
  isDarkMode: boolean;
  isUnitTest: boolean;
}

export const DesignerCommandBar: React.FC<DesignerCommandBarProps> = ({ isRefreshing, isDisabled, onRefresh, isDarkMode, isUnitTest }) => {
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);
  const dispatch = useDispatch();

  const isMonitoringView: boolean = useSelector(
    createSelector(
      (state: RootState) => state.designerOptions,
      (state: any) => state.isMonitoringView
    )
  );

  const { isLoading: isSaving, mutate: saveWorkflowMutate } = useMutation(async () => {
    const designerState = DesignerStore.getState();
    const { definition, parameters, connectionReferences } = await serializeBJSWorkflow(designerState, {
      skipValidation: false,
      ignoreNonCriticalErrors: true,
    });

    const validationErrorsList = Object.entries(designerState.operations.inputParameters).reduce((acc, [id, nodeInputs]) => {
      const hasValidationErrors = Object.values(nodeInputs.parameterGroups).some((parameterGroup) => {
        return parameterGroup.parameters.some((parameter) => {
          const validationErrors = validateParameter(parameter, parameter.value);
          if (validationErrors.length > 0) {
            dispatch(updateParameterValidation({ nodeId: id, groupId: parameterGroup.id, parameterId: parameter.id, validationErrors }));
          }
          return validationErrors.length;
        });
      });
      return hasValidationErrors ? { ...acc, [id]: hasValidationErrors } : { ...acc };
    }, {});

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

  const { isLoading: isSavingUnitTest, mutate: saveUnitTestMutate } = useMutation(async () => {
    const designerState = DesignerStore.getState();
    const definition = await serializeUnitTestDefinition(designerState);

    // TODO(ccastrotrejo): We need to check for unit test errors
    await vscode.postMessage({
      command: ExtensionCommand.saveUnitTest,
      definition,
    });
  });

  const onResubmit = async () => {
    vscode.postMessage({
      command: ExtensionCommand.resubmitRun,
    });
  };

  const Resources = {
    DESIGNER_SAVE: intl.formatMessage({
      defaultMessage: 'Save',
      description: 'Button text for save',
    }),
    DESIGNER_PARAMETERS: intl.formatMessage({
      defaultMessage: 'Parameters',
      description: 'Button text for parameters',
    }),
    MONITORING_VIEW_REFRESH: intl.formatMessage({
      defaultMessage: 'Refresh',
      description: 'Button text for refresh',
    }),
    MONITORING_VIEW_RESUBMIT: intl.formatMessage({
      defaultMessage: 'Resubmit',
      description: 'Button text for resubmit',
    }),
    UNIT_TEST_SAVE: intl.formatMessage({
      defaultMessage: 'Save unit test definition',
      description: 'Button text for save unit test definition',
    }),
    UNIT_TEST_ASSERTIONS: intl.formatMessage({
      defaultMessage: 'Assertions',
      description: 'Button text for unit test asssertions',
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

  const designerIsDirty = useIsDesignerDirty();

  const allInputErrors = useSelector((state: RootState) => {
    return (Object.entries(state.operations.inputParameters) ?? []).filter(([_id, nodeInputs]) =>
      Object.values(nodeInputs.parameterGroups).some((parameterGroup) =>
        parameterGroup.parameters.some((parameter) => (parameter?.validationErrors?.length ?? 0) > 0)
      )
    );
  });

  const allWorkflowParameterErrors = useSelector((state: RootState) => {
    let validationErrorToShow = null;
    for (const parameter of Object.entries(state.workflowParameters.validationErrors) ?? []) {
      if (parameter?.[1]?.value) {
        validationErrorToShow = {
          name: state.workflowParameters.definitions[parameter[0]]?.name,
          msg: parameter[1].value,
        };
      }
    }
    return validationErrorToShow;
  });

  const haveErrors = useMemo(() => allInputErrors.length > 0 || !!allWorkflowParameterErrors, [allInputErrors, allWorkflowParameterErrors]);
  const allAssertionsErrors = useAssertionsValidationErrors();
  const haveAssertionErrors = Object.keys(allAssertionsErrors ?? {}).length > 0;

  const isSaveWorkflowDisabled = isSaving || haveErrors || !designerIsDirty;
  const isSaveUnitTestDisabled = isSavingUnitTest || haveAssertionErrors;

  const desingerItems: ICommandBarItemProps[] = [
    {
      key: 'Save',
      disabled: isSaveWorkflowDisabled,
      text: Resources.DESIGNER_SAVE,
      onRenderIcon: () => {
        return isSaving ? (
          <Spinner size={SpinnerSize.small} />
        ) : (
          <FontIcon
            aria-label={Resources.DESIGNER_SAVE}
            iconName="Save"
            className={isSaveWorkflowDisabled ? classNames.disableGrey : classNames.azureBlue}
          />
        );
      },
      onClick: () => {
        saveWorkflowMutate();
      },
    },
    {
      ariaLabel: Resources.DESIGNER_PARAMETERS,
      iconProps: { iconName: 'Parameter' },
      key: 'Parameter',
      text: Resources.DESIGNER_PARAMETERS,
      onRenderText: (item: { text: string }) => {
        return (
          <>
            {item.text}
            {allWorkflowParameterErrors ? (
              <div style={{ display: 'inline-block', marginLeft: 8 }}>
                <TrafficLightDot fill={RUN_AFTER_COLORS[isDarkMode ? 'dark' : 'light']['FAILED']} />
              </div>
            ) : null}
          </>
        );
      },
      onClick: () => !!dispatch(openPanel({ panelMode: 'WorkflowParameters' })),
    },
  ];

  const monitoringViewItems: ICommandBarItemProps[] = [
    {
      ariaLabel: Resources.MONITORING_VIEW_REFRESH,
      iconProps: { iconName: 'Refresh' },
      key: 'Refresh',
      disabled: isDisabled ? isDisabled : isRefreshing,
      text: Resources.MONITORING_VIEW_REFRESH,
      onClick: onRefresh,
    },
    {
      ariaLabel: Resources.MONITORING_VIEW_RESUBMIT,
      iconProps: { iconName: 'Rerun' },
      key: 'Rerun',
      disabled: isDisabled,
      text: Resources.MONITORING_VIEW_RESUBMIT,
      onClick: () => {
        onResubmit();
      },
    },
  ];

  const unitTestItems: ICommandBarItemProps[] = [
    {
      key: 'Save',
      disabled: isSaveUnitTestDisabled,
      text: Resources.UNIT_TEST_SAVE,
      ariaLabel: Resources.UNIT_TEST_SAVE,
      onRenderIcon: () => {
        return isSavingUnitTest ? (
          <Spinner size={SpinnerSize.small} />
        ) : (
          <FontIcon
            aria-label={Resources.DESIGNER_SAVE}
            iconName="Save"
            className={isSaveUnitTestDisabled ? classNames.disableGrey : classNames.azureBlue}
          />
        );
      },
      onClick: () => {
        saveUnitTestMutate();
      },
    },
    {
      key: 'Assertions',
      text: Resources.UNIT_TEST_ASSERTIONS,
      ariaLabel: Resources.UNIT_TEST_ASSERTIONS,
      iconProps: { iconName: 'CheckMark' },
      onClick: () => !!dispatch(openPanel({ panelMode: 'Assertions' })),
    },
  ];

  return (
    <CommandBar
      items={isUnitTest ? unitTestItems : isMonitoringView ? monitoringViewItems : desingerItems}
      ariaLabel="Use left and right arrow keys to navigate between commands"
      styles={{
        root: { borderBottom: `1px solid ${isDarkMode ? '#333333' : '#d6d6d6'}` },
      }}
    />
  );
};
