import { Spinner } from '@fluentui/react-components';
import type { ILoggerService } from '@microsoft/logic-apps-shared';
import { LogEntryLevel, LoggerService, isNullOrEmpty, ChatbotService } from '@microsoft/logic-apps-shared';
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
  serializeWorkflow,
  getDocumentationMetadata,
  resetDesignerView,
  useNodesAndDynamicDataInitialized,
} from '@microsoft/logic-apps-designer';
import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import LogicAppsIcon from '../../../assets/logicapp.svg';
import { environment } from '../../../environments/environment';
import { isSuccessResponse } from './Services/HttpClient';
import { downloadDocumentAsFile } from '@microsoft/logic-apps-designer';
import { CommandBar, type CommandBarItem } from '@microsoft/designer-ui';

import {
  bundleIcon,
  SaveFilled,
  SaveRegular,
  DismissFilled,
  DismissRegular,
  MentionBracketsFilled,
  MentionBracketsRegular,
  BracesFilled,
  BracesRegular,
  LinkRegular,
  LinkFilled,
  ErrorCircleFilled,
  ErrorCircleRegular,
  ChatSparkleFilled,
  ChatSparkleRegular,
  DocumentArrowDownFilled,
  DocumentArrowDownRegular,
  ArrowUndoFilled,
  ArrowUndoRegular,
  ArrowRedoFilled,
  ArrowRedoRegular,
  BugFilled,
  BugRegular,
} from '@fluentui/react-icons';

const SaveIcon = bundleIcon(SaveFilled, SaveRegular);
const DiscardIcon = bundleIcon(DismissFilled, DismissRegular);
const ParametersIcon = bundleIcon(MentionBracketsFilled, MentionBracketsRegular);
const CodeIcon = bundleIcon(BracesFilled, BracesRegular);
const ConnectionsIcon = bundleIcon(LinkFilled, LinkRegular);
const ErrorIcon = bundleIcon(ErrorCircleFilled, ErrorCircleRegular);
const AssistantIcon = bundleIcon(ChatSparkleFilled, ChatSparkleRegular);
const WorkflowSummaryIcon = bundleIcon(DocumentArrowDownFilled, DocumentArrowDownRegular);
const UndoIcon = bundleIcon(ArrowUndoFilled, ArrowUndoRegular);
const RedoIcon = bundleIcon(ArrowRedoFilled, ArrowRedoRegular);
const BugIcon = bundleIcon(BugFilled, BugRegular);

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

  const items: CommandBarItem[] = useMemo(
    () => [
      {
        id: 'save',
        text: 'Save',
        icon: <SaveIcon />,
        disabled: saveIsDisabled,
        loading: isSaving,
        onClick: () => {
          if (isDesignerView) {
            saveWorkflowMutate();
          } else {
            saveWorkflowFromCode(() => dispatch(resetDesignerDirtyState(undefined)));
          }
        },
      },
      {
        id: 'discard',
        text: 'Discard',
        icon: <DiscardIcon />,
        disabled: isSaving || !isDesignerView,
        onClick: () => {
          discard();
        },
      },
      {
        id: 'parameters',
        text: 'Parameters',
        icon: <ParametersIcon />,
        disabled: !isDesignerView,
        isError: haveWorkflowParameterErrors,
        onClick: () => !!dispatch(openPanel({ panelMode: 'WorkflowParameters' })),
      },
      {
        id: 'codeview',
        text: isDesignerView ? 'Code View' : 'Designer View',
        icon: isDesignerView ? <CodeIcon /> : <img src={LogicAppsIcon} alt="Logic Apps Icon" />,
        onClick: () => {
          switchViews();
          dispatch(collapsePanel());
          dispatch(resetDesignerView());
        },
      },
      {
        id: 'connections',
        visible: showConnectionsPanel,
        text: 'Connections',
        icon: <ConnectionsIcon />,
        isError: haveConnectionErrors,
        onClick: () => !!dispatch(openPanel({ panelMode: 'Connection' })),
      },
      {
        id: 'errors',
        text: 'Errors',
        icon: <ErrorIcon />,
        disabled: !haveErrors,
        isError: haveErrors,
        onClick: () => !!dispatch(openPanel({ panelMode: 'Error' })),
      },
      {
        id: 'copilot',
        text: 'Assistant',
        icon: <AssistantIcon />,
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
        id: 'document',
        text: 'Document',
        icon: <WorkflowSummaryIcon />,
        disabled: haveErrors || isDownloadingDocument,
        loading: isDownloadingDocument,
        onClick: () => {
          downloadDocument();
        },
      },
      {
        id: 'fileABug',
        text: 'File a bug',
        icon: <BugIcon />,
        onClick: () => {
          window.open('https://github.com/Azure/logic_apps_designer/issues/new', '_blank');
        },
      },
      {
        id: 'Undo',
        text: 'Undo',
        icon: <UndoIcon />,
        disabled: isUndoDisabled,
        onClick: () => dispatch(onUndoClick()),
      },
      {
        id: 'Redo',
        text: 'Redo',
        icon: <RedoIcon />,
        disabled: isRedoDisabled,
        onClick: () => dispatch(onRedoClick()),
      },
    ],
    [
      saveIsDisabled,
      isSaving,
      isDesignerView,
      showConnectionsPanel,
      haveErrors,
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
      isDownloadingDocument,
      downloadDocument,
    ]
  );

  return (
    <>
      {!isInitialized && (
        <div
          style={{
            position: 'absolute',
            top: '60px',
            left: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <Spinner size={'extra-small'} label={'Loading dynamic data...'} />
        </div>
      )}
      <CommandBar items={items} isDarkMode={isDarkMode} tabIndex={1} />
    </>
  );
};
