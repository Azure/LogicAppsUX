import {
  Button,
  Card,
  Divider,
  makeStyles,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  mergeClasses,
  Spinner,
  tokens,
  Toolbar,
  ToolbarButton,
} from '@fluentui/react-components';
import { isNullOrEmpty, ChatbotService } from '@microsoft/logic-apps-shared';
import type { AppDispatch, CustomCodeFileNameMapping, RootState, Workflow } from '@microsoft/logic-apps-designer-v2';
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
  downloadDocumentAsFile,
  useNodesAndDynamicDataInitialized,
} from '@microsoft/logic-apps-designer-v2';
import { useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { environment } from '../../../environments/environment';
import { isSuccessResponse } from './Services/HttpClient';

import {
  bundleIcon,
  ArrowUndoFilled,
  ArrowUndoRegular,
  ArrowRedoFilled,
  ArrowRedoRegular,
  MoreHorizontalFilled,
  MoreHorizontalRegular,
  MentionBracketsFilled,
  MentionBracketsRegular,
  LinkFilled,
  LinkRegular,
  ErrorCircleFilled,
  ErrorCircleRegular,
  DocumentOnePageAddFilled,
  DocumentOnePageAddRegular,
  DocumentOnePageColumnsFilled,
  DocumentOnePageColumnsRegular,
} from '@fluentui/react-icons';

const UndoIcon = bundleIcon(ArrowUndoFilled, ArrowUndoRegular);
const RedoIcon = bundleIcon(ArrowRedoFilled, ArrowRedoRegular);
const MoreHorizontalIcon = bundleIcon(MoreHorizontalFilled, MoreHorizontalRegular);
const ParametersIcon = bundleIcon(MentionBracketsFilled, MentionBracketsRegular);
const ConnectionsIcon = bundleIcon(LinkFilled, LinkRegular);
const ErrorsIcon = bundleIcon(ErrorCircleFilled, ErrorCircleRegular);
const DocumentOnePageAddIcon = bundleIcon(DocumentOnePageAddFilled, DocumentOnePageAddRegular);
const DocumentOnePageColumnsIcon = bundleIcon(DocumentOnePageColumnsFilled, DocumentOnePageColumnsRegular);

const useStyles = makeStyles({
  viewModeContainer: {
    display: 'flex',
    flexDirection: 'row',
    gap: '4px',
    padding: '4px',
    borderRadius: '6px',
    position: 'absolute',
    bottom: '-16px',
    left: '50%',
    transform: 'translate(-50%, 0)',
    zIndex: 1,
  },
  viewButton: {
    padding: '3px 16px',
    fontWeight: 600,
  },
  selectedButton: {
    background: `${tokens.colorNeutralForeground1} !important`,
    color: tokens.colorNeutralForegroundInverted,
  },
});

export const DesignerCommandBar = ({
  id: _id,
  discard,
  saveWorkflow,
  saveWorkflowFromCode,
  isDesignerView,
  isMonitoringView,
  isCodeView,
  isDarkMode,
  isUnitTest,
  isDraftMode,
  enableCopilot,
  showMonitoringView,
  showDesignerView,
  showCodeView,
  switchWorkflowMode,
}: {
  id: string;
  location: string;
  isReadOnly: boolean;
  discard: () => unknown;
  saveWorkflow: (workflow: Workflow, customCodeData: CustomCodeFileNameMapping | undefined, clearDirtyState: () => void) => Promise<void>;
  saveWorkflowFromCode: (clearDirtyState: () => void) => void;
  isDesignerView?: boolean;
  isMonitoringView?: boolean;
  isCodeView?: boolean;
  isDarkMode: boolean;
  isUnitTest: boolean;
  isDraftMode?: boolean;
  enableCopilot?: () => void;
  showMonitoringView: () => void;
  showDesignerView: () => void;
  showCodeView: () => void;
  switchWorkflowMode: (draftMode: boolean) => void;
}) => {
  const styles = useStyles();

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

  const saveIsDisabled =
    isSaving || allInputErrors.length > 0 || haveWorkflowParameterErrors || haveSettingsErrors || !designerIsDirty || isMonitoringView;

  const saveUnitTestIsDisabled = !isUnitTest || isSavingUnitTest || haveAssertionErrors;
  const isUndoDisabled = !useCanUndo();
  const isRedoDisabled = !useCanRedo();

  const ViewModeSelect = () => (
    <Card className={styles.viewModeContainer}>
      <Button
        appearance={isDesignerView ? 'primary' : 'subtle'}
        className={mergeClasses(styles.viewButton, isDesignerView ? styles.selectedButton : '')}
        size="small"
        onClick={() => {
          showDesignerView();
          dispatch(collapsePanel());
          dispatch(resetDesignerView());
        }}
      >
        Workflow
      </Button>
      <Button
        appearance={isCodeView ? 'primary' : 'subtle'}
        className={mergeClasses(styles.viewButton, isCodeView ? styles.selectedButton : '')}
        size="small"
        onClick={() => {
          showCodeView();
          dispatch(collapsePanel());
          dispatch(resetDesignerView());
        }}
      >
        Code
      </Button>
      <Button
        appearance={isMonitoringView ? 'primary' : 'subtle'}
        className={mergeClasses(styles.viewButton, isMonitoringView ? styles.selectedButton : '')}
        size="small"
        onClick={() => {
          showMonitoringView();
          dispatch(collapsePanel());
          dispatch(resetDesignerView());
        }}
      >
        Run history
      </Button>
    </Card>
  );

  const SaveButton = () => (
    <ToolbarButton
      appearance="primary"
      disabled={saveIsDisabled}
      onClick={() => {
        if (isDesignerView) {
          saveWorkflowMutate();
        } else {
          saveWorkflowFromCode(() => dispatch(resetDesignerDirtyState(undefined)));
        }
      }}
      icon={isSaving ? <Spinner size={'extra-tiny'} /> : undefined}
    >
      {isSaving ? 'Saving' : 'Save'}
    </ToolbarButton>
  );

  const DiscardButton = () => (
    <ToolbarButton
      aria-label="Discard changes"
      icon={<UndoIcon />}
      onClick={discard}
      disabled={isSaving || isMonitoringView || !designerIsDirty}
    />
  );

  const OverflowMenu = () => (
    <Menu>
      <MenuTrigger>
        <ToolbarButton aria-label="More" icon={<MoreHorizontalIcon />} />
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {isDraftMode ? (
            <MenuItem disabled={!isDesignerView} onClick={() => switchWorkflowMode(false)} icon={<DocumentOnePageAddIcon />}>
              Switch to published version
            </MenuItem>
          ) : (
            <MenuItem disabled={!isDesignerView} onClick={() => switchWorkflowMode(true)} icon={<DocumentOnePageColumnsIcon />}>
              Switch to draft version
            </MenuItem>
          )}
          <MenuItem
            disabled={saveUnitTestIsDisabled}
            onClick={() => saveUnitTestMutate()}
            icon={isSavingUnitTest ? <Spinner size={'extra-tiny'} /> : undefined}
          >
            Save unit test
          </MenuItem>
          <MenuItem
            disabled={saveBlankUnitTestIsDisabled}
            onClick={() => saveBlankUnitTestMutate()}
            icon={isSavingBlankUnitTest ? <Spinner size={'extra-tiny'} /> : undefined}
          >
            Save blank unit test
          </MenuItem>
          <MenuDivider />
          <MenuItem
            disabled={!isDesignerView}
            onClick={() => dispatch(openPanel({ panelMode: 'WorkflowParameters' }))}
            icon={<ParametersIcon />}
          >
            Parameters
          </MenuItem>
          <MenuItem disabled={!isDesignerView} onClick={() => dispatch(openPanel({ panelMode: 'Connection' }))} icon={<ConnectionsIcon />}>
            Connections
          </MenuItem>
          <MenuItem
            disabled={!isDesignerView || !haveErrors}
            onClick={() => dispatch(openPanel({ panelMode: 'Error' }))}
            icon={<ErrorsIcon />}
          >
            Errors
          </MenuItem>
          <MenuDivider />
          <MenuItem disabled={!isUnitTest} onClick={() => dispatch(openPanel({ panelMode: 'Assertions' }))}>
            Assertions
          </MenuItem>
          <MenuDivider />
          <MenuItem disabled={!isCopilotReady} onClick={() => enableCopilot?.()}>
            Assistant
          </MenuItem>
          <MenuItem
            disabled={haveErrors || isDownloadingDocument}
            onClick={() => downloadDocument()}
            icon={isDownloadingDocument ? <Spinner size={'extra-tiny'} /> : undefined}
          >
            Download
          </MenuItem>
          <MenuDivider />
          <MenuItem disabled={!isDesignerView || isUndoDisabled} onClick={() => dispatch(onUndoClick())} icon={<UndoIcon />}>
            Undo
          </MenuItem>
          <MenuItem disabled={!isDesignerView || isRedoDisabled} onClick={() => dispatch(onRedoClick())} icon={<RedoIcon />}>
            Redo
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );

  return (
    <>
      <Toolbar
        style={{
          borderBottom: `1px solid ${isDarkMode ? '#333333' : '#d6d6d6'}`,
          position: 'relative',
          padding: '4px 8px',
          gap: '8px',
        }}
      >
        <ViewModeSelect />
        <div style={{ flexGrow: 1 }} />
        <SaveButton />
        <DiscardButton />
        <Divider vertical style={{ flexGrow: 0 }} />
        <OverflowMenu />
      </Toolbar>
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
