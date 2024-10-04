import { FontIcon, mergeStyles, mergeStyleSets } from '@fluentui/react';
import { Badge } from '@fluentui/react-components';
import type { ICommandBarItemProps } from '@fluentui/react/lib/CommandBar';
import { CommandBar } from '@fluentui/react/lib/CommandBar';
import { Spinner, SpinnerSize } from '@fluentui/react/lib/Spinner';
import type { ILoggerService } from '@microsoft/logic-apps-shared';
import { LogEntryLevel, LoggerService, isNullOrEmpty, RUN_AFTER_COLORS } from '@microsoft/logic-apps-shared';
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
  getCustomCodeFilesWithData,
  resetDesignerDirtyState,
  collapsePanel,
  onUndoClick,
  useCanUndo,
  useCanRedo,
  onRedoClick,
} from '@microsoft/logic-apps-designer';
import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import LogicAppsIcon from '../../../assets/logicapp.svg';

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
  isDesignerView,
  isDarkMode,
  showConnectionsPanel,
  enableCopilot,
  switchViews,
  saveWorkflowFromCode,
}: {
  id: string;
  location: string;
  isReadOnly: boolean;
  discard: () => unknown;
  saveWorkflow: (workflow: Workflow, customCodeData: CustomCodeFileNameMapping | undefined, clearDirtyState: () => void) => Promise<void>;
  isDesignerView?: boolean;
  isDarkMode: boolean;
  showConnectionsPanel?: boolean;
  enableCopilot?: () => void;
  loggerService?: ILoggerService;
  switchViews: () => void;
  saveWorkflowFromCode: (clearDirtyState: () => void) => void;
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

  const isUndoDisabled = !useCanUndo();
  const isRedoDisabled = !useCanRedo();

  const items: ICommandBarItemProps[] = useMemo(
    () => [
      {
        key: 'save',
        text: 'Save',
        disabled: saveIsDisabled,
        onRenderIcon: () => {
          return isSaving ? (
            <Spinner size={SpinnerSize.small} />
          ) : (
            <FontIcon aria-label="Save" iconName="Save" className={saveIsDisabled ? classNames.azureGrey : classNames.azureBlue} />
          );
        },
        onClick: () => {
          isDesignerView ? saveWorkflowMutate() : saveWorkflowFromCode(() => dispatch(resetDesignerDirtyState(undefined)));
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
        key: 'codeview',
        text: isDesignerView ? 'Code View' : 'Designer View',
        iconProps: isDesignerView ? { iconName: 'Code' } : { imageProps: { src: LogicAppsIcon } },
        onClick: () => {
          switchViews();
          dispatch(collapsePanel());
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
        key: 'fileABug',
        text: 'File a bug',
        iconProps: { iconName: 'Bug' },
        onClick: () => {
          window.open('https://github.com/Azure/logic_apps_designer/issues/new', '_blank');
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
    ],
    [
      saveIsDisabled,
      isSaving,
      isDesignerView,
      showConnectionsPanel,
      haveErrors,
      isDarkMode,
      isCopilotReady,
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
    ]
  );

  return (
    <CommandBar
      items={items}
      ariaLabel="Use left and right arrow keys to navigate between commands"
      styles={{
        root: {
          borderBottom: `1px solid ${isDarkMode ? '#333333' : '#d6d6d6'}`,
          position: 'relative',
          padding: '4px 8px',
        },
      }}
    />
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
