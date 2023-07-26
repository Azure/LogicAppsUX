import { FontIcon, mergeStyles, mergeStyleSets } from '@fluentui/react';
import type { ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import { CommandBar } from '@fluentui/react/lib/CommandBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import { TrafficLightDot } from '@microsoft/designer-ui';
import type { RootState, Workflow } from '@microsoft/logic-apps-designer';
import {
  store as DesignerStore,
  serializeBJSWorkflow,
  updateCallbackUrl,
  switchToWorkflowParameters,
  switchToErrorsPanel,
  useIsDesignerDirty,
  useAllSettingsValidationErrors,
  useWorkflowParameterValidationErrors,
  useAllConnectionErrors,
  serializeWorkflow,
  validateParameter,
  updateParameterValidation,
} from '@microsoft/logic-apps-designer';
import { isNullOrEmpty, RUN_AFTER_COLORS } from '@microsoft/utils-logic-apps';
import { useMemo } from 'react';
import { useMutation } from 'react-query';
import { useDispatch, useSelector } from 'react-redux';

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
  discard,
  saveWorkflow,
  isDarkMode,
}: {
  id: string;
  location: string;
  isReadOnly: boolean;
  discard: () => unknown;
  saveWorkflow: (workflow: Workflow) => Promise<void>;
  isDarkMode: boolean;
  isConsumption?: boolean;
}) => {
  const dispatch = useDispatch();
  const { isLoading: isSaving, mutate: saveWorkflowMutate } = useMutation(async () => {
    const designerState = DesignerStore.getState();
    const serializedWorkflow = await serializeBJSWorkflow(designerState, {
      skipValidation: false,
      ignoreNonCriticalErrors: true,
    });

    const validationErrorsList = Object.entries(designerState.operations.inputParameters).reduce((acc, [id, nodeInputs]) => {
      const hasValidationErrors = Object.values(nodeInputs.parameterGroups).every((parameterGroup) => {
        return parameterGroup.parameters.every((parameter) => {
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
      await saveWorkflow(serializedWorkflow);
      updateCallbackUrl(designerState, DesignerStore.dispatch);
    }
  });

  const designerIsDirty = useIsDesignerDirty();

  const allInputErrors = useSelector((state: RootState) => {
    return (Object.entries(state.operations.inputParameters) ?? []).filter(([_id, nodeInputs]) =>
      Object.values(nodeInputs.parameterGroups).some((parameterGroup) =>
        parameterGroup.parameters.some((parameter) => (parameter?.validationErrors?.length ?? 0) > 0)
      )
    );
  });
  const allWorkflowParameterErrors = useWorkflowParameterValidationErrors();
  const haveWorkflowParameterErrors = Object.keys(allWorkflowParameterErrors ?? {}).length > 0;
  const allSettingsErrors = useAllSettingsValidationErrors();
  const haveSettingsErrors = Object.keys(allSettingsErrors ?? {}).length > 0;
  const allConnectionErrors = useAllConnectionErrors();
  const haveConnectionErrors = Object.keys(allConnectionErrors ?? {}).length > 0;

  const haveErrors = useMemo(
    () => allInputErrors.length > 0 || haveWorkflowParameterErrors || haveSettingsErrors || haveConnectionErrors,
    [allInputErrors, haveWorkflowParameterErrors, haveSettingsErrors, haveConnectionErrors]
  );

  const saveIsDisabled = isSaving || allInputErrors.length > 0 || haveWorkflowParameterErrors || haveSettingsErrors || !designerIsDirty;
  const items: ICommandBarItemProps[] = [
    {
      key: 'save',
      text: 'Save',
      disabled: saveIsDisabled,
      onRenderIcon: () => {
        return isSaving ? (
          <Spinner size={SpinnerSize.small} />
        ) : (
          <FontIcon aria-label="Save" iconName="Save" className={!saveIsDisabled ? classNames.azureBlue : classNames.azureGrey} />
        );
      },
      onClick: () => {
        saveWorkflowMutate();
      },
    },
    {
      key: 'discard',
      disabled: isSaving,
      text: 'Discard',
      iconProps: { iconName: 'Clear' },
      onClick: () => {
        discard();
      },
    },
    {
      key: 'parameters',
      text: 'Parameters',
      onRenderText: (item: { text: string }) => {
        return (
          <>
            {item.text}
            {haveWorkflowParameterErrors ? (
              <div style={{ display: 'inline-block', marginLeft: 8 }}>
                <TrafficLightDot fill={RUN_AFTER_COLORS[isDarkMode ? 'dark' : 'light']['FAILED']} />
              </div>
            ) : null}
          </>
        );
      },
      iconProps: { iconName: 'Parameter' },
      onClick: () => !!dispatch(switchToWorkflowParameters()),
    },
    {
      key: 'codeview',
      text: 'View Code',
      iconProps: { iconName: 'Code' },
      onClick: async () => {
        console.log(await serializeWorkflow(DesignerStore.getState()));
        alert('Check console for workflow serialization');
      },
    },
    {
      key: 'errors',
      text: 'Errors',
      disabled: !haveErrors,
      iconProps: {
        iconName: haveErrors ? 'StatusErrorFull' : 'ErrorBadge',
        style: haveErrors ? { color: RUN_AFTER_COLORS[isDarkMode ? 'dark' : 'light']['FAILED'] } : undefined,
      },
      onClick: () => !!dispatch(switchToErrorsPanel()),
    },
    {
      key: 'fileABug',
      text: 'File a bug',
      iconProps: { iconName: 'Bug' },
      onClick: () => {
        window.open('https://github.com/Azure/logic_apps_designer/issues/new', '_blank');
      },
    },
  ];
  return (
    <CommandBar
      items={items}
      ariaLabel="Use left and right arrow keys to navigate between commands"
      styles={{
        root: { borderBottom: `1px solid ${isDarkMode ? '#333333' : '#d6d6d6'}`, padding: '4px 8px' },
      }}
    />
  );
};
