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
} from '@microsoft/logic-apps-designer';
import { RUN_AFTER_COLORS } from '@microsoft/utils-logic-apps';
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
    await saveWorkflow(serializedWorkflow);

    updateCallbackUrl(designerState, DesignerStore.dispatch);
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
  const allSettingsErrors = useAllSettingsValidationErrors();

  const haveErrors = useMemo(
    () => allInputErrors.length > 0 || !!allWorkflowParameterErrors || !!allSettingsErrors,
    [allInputErrors, allWorkflowParameterErrors, allSettingsErrors]
  );

  const saveIsDisabled = isSaving || haveErrors || !designerIsDirty;
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
            {allWorkflowParameterErrors ? (
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
