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
  resetDesignerDirtyState,
  type RootState,
  resetDesignerView,
  collapsePanel,
  useChangeCount,
} from '@microsoft/logic-apps-designer-v2';
import { isNullOrEmpty, useThrottledEffect, type Workflow } from '@microsoft/logic-apps-shared';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Badge,
  Button,
  Card,
  Divider,
  Menu,
  MenuDivider,
  MenuItem,
  MenuList,
  MenuPopover,
  MenuTrigger,
  mergeClasses,
  Spinner,
  Toolbar,
  ToolbarButton,
  Tooltip,
} from '@fluentui/react-components';
import {
  SaveRegular,
  ErrorCircleFilled,
  ErrorCircleRegular,
  MoreHorizontalFilled,
  MoreHorizontalRegular,
  MentionBracketsRegular,
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
  CheckmarkFilled,
  ArrowUndoFilled,
  ArrowUndoRegular,
  ArrowSyncFilled,
  CheckmarkCircleRegular,
  DocumentOnePageAddFilled,
  DocumentOnePageAddRegular,
  DocumentOnePageColumnsFilled,
  DocumentOnePageColumnsRegular,
} from '@fluentui/react-icons';
import { useCommandBarStyles } from './styles';
import { getRelativeTimeString } from './utils';
import { useSelector } from 'react-redux';
import { useIntlMessages, useIntlFormatters, designerMessages } from '../../../intl';

// Designer icons
const SaveIcon = bundleIcon(SaveFilled, SaveRegular);
const DiscardIcon = bundleIcon(ArrowUndoFilled, ArrowUndoRegular);
const ParametersIcon = bundleIcon(MentionBracketsFilled, MentionBracketsRegular);
const ConnectionsIcon = bundleIcon(LinkFilled, LinkRegular);
const ErrorsIcon = bundleIcon(ErrorCircleFilled, ErrorCircleRegular);
const CreateUnitTestIcon = bundleIcon(BeakerFilled, BeakerRegular);

// Base icons
const BugIcon = bundleIcon(BugFilled, BugRegular);
const MoreHorizontalIcon = bundleIcon(MoreHorizontalFilled, MoreHorizontalRegular);

// Unit test icons
const AssertionsIcon = bundleIcon(CheckmarkFilled, CheckmarkRegular);

// Draft/publish icons
const DocumentOnePageAddIcon = bundleIcon(DocumentOnePageAddFilled, DocumentOnePageAddRegular);
const DocumentOnePageColumnsIcon = bundleIcon(DocumentOnePageColumnsFilled, DocumentOnePageColumnsRegular);

export interface DesignerCommandBarProps {
  isDarkMode: boolean;
  isUnitTest: boolean;
  isLocal: boolean;
  runId: string;
  saveWorkflow: (workflow: Workflow, customCodeData: Record<string, string> | undefined, clearDirtyState: () => void) => Promise<any>;
  saveWorkflowFromCode: (clearDirtyState: () => void) => Promise<any>;
  discard: () => void;
  isDesignerView: boolean;
  isCodeView: boolean;
  isMonitoringView: boolean;
  switchToDesignerView: () => void;
  switchToCodeView: () => void;
  switchToMonitoringView: () => void;
  isDraftMode: boolean;
  saveDraftWorkflow: (definition: any, parameters: any, connectionReferences: any) => void;
  discardDraft: () => void;
  switchWorkflowMode: (toDraftMode: boolean) => void;
  lastDraftSaveTime: number | null;
  draftSaveError: string | null;
  isDraftSaving: boolean;
  hasDraft: boolean;
}

export const DesignerCommandBar: React.FC<DesignerCommandBarProps> = ({
  isDarkMode,
  isUnitTest,
  isLocal,
  runId,
  saveWorkflow: _saveWorkflow,
  saveWorkflowFromCode: _saveWorkflowFromCode,
  discard,
  isDesignerView,
  isCodeView,
  isMonitoringView,
  switchToDesignerView,
  switchToCodeView,
  switchToMonitoringView,
  isDraftMode,
  saveDraftWorkflow,
  discardDraft,
  switchWorkflowMode,
  lastDraftSaveTime,
  draftSaveError,
  isDraftSaving,
  hasDraft,
}) => {
  const vscode = useContext(VSCodeContext);
  const dispatch = DesignerStore.dispatch;

  const styles = useCommandBarStyles();
  const intlText = useIntlMessages(designerMessages);
  const formatters = useIntlFormatters(designerMessages);

  const designerIsDirty = useIsDesignerDirty();

  const [autoSaving, setAutoSaving] = useState(false);
  const [autosaveError, setAutosaveError] = useState<string>();

  const { isLoading: isSaving, mutate: saveWorkflowMutate } = useMutation(async () => {
    try {
      const designerState = DesignerStore.getState();
      const serializedWorkflow = await serializeBJSWorkflow(designerState, {
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
        _saveWorkflow(serializedWorkflow, customCodeData as any, () => dispatch(resetDesignerDirtyState(undefined)));
      }
    } catch (error: any) {
      console.error('Error saving workflow:', error);
    }
  });

  // Auto-save draft mutation
  const { mutate: autoSaveMutate } = useMutation(async () => {
    try {
      setAutoSaving(true);
      setAutosaveError(undefined);
      const designerState = DesignerStore.getState();
      const serializedWorkflow = await serializeBJSWorkflow(designerState, {
        skipValidation: true,
        ignoreNonCriticalErrors: true,
      });
      saveDraftWorkflow(serializedWorkflow.definition, serializedWorkflow.parameters, serializedWorkflow.connectionReferences);
    } catch (error: any) {
      console.error('Error auto-saving draft:', error);
      setAutosaveError(error?.message ?? 'Unknown error during auto-save');
    } finally {
      setAutoSaving(false);
    }
  });

  // When any change is made, set needsSaved to true
  const changeCount = useChangeCount();
  const [needsSaved, setNeedsSaved] = useState(false);
  useEffect(() => {
    if (changeCount === 0) {
      return;
    }
    setNeedsSaved(true);
  }, [changeCount]);

  // Auto-save every 5 seconds if needed
  useThrottledEffect(
    () => {
      if (!needsSaved || !isDraftMode || isSaving || isMonitoringView) {
        return;
      }
      setNeedsSaved(false);
      autoSaveMutate();
    },
    [isDraftMode, isSaving, isMonitoringView, needsSaved, autoSaveMutate],
    5000
  );

  const { mutate: saveWorkflowFromCode, isLoading: isSavingFromCode } = useMutation(async () => {
    _saveWorkflowFromCode(() => dispatch(resetDesignerDirtyState(undefined)));
  });

  /////////////////////////////////////////////////////////////////////////////
  // Unit test

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

  const inputParameterErrors = useSelector((state: RootState) => state.workflow?.operations?.inputParameters ?? {});

  const allInputErrors = useMemo(
    () =>
      (Object.entries(inputParameterErrors) ?? []).filter(([_id, nodeInputs]) =>
        Object.values(nodeInputs.parameterGroups).some((parameterGroup) =>
          (parameterGroup as any).parameters.some((parameter: any) => (parameter?.validationErrors?.length ?? 0) > 0)
        )
      ),
    [inputParameterErrors]
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

  const isSaveDisabled = useMemo(
    () => isMonitoringView || isSaving || isSavingFromCode || haveErrors || (!designerIsDirty && !hasDraft) || !isDraftMode,
    [isMonitoringView, isSaving, isSavingFromCode, haveErrors, designerIsDirty, hasDraft, isDraftMode]
  );

  const ViewModeSelect = () => (
    <Card className={styles.viewModeContainer}>
      <Button
        appearance={isDesignerView ? 'primary' : 'subtle'}
        className={mergeClasses(styles.viewButton, isDesignerView ? styles.selectedButton : '')}
        size="small"
        onClick={() => {
          dispatch(collapsePanel());
          dispatch(resetDesignerView());
          switchToDesignerView();
        }}
      >
        {intlText.WORKFLOW_TAB}
      </Button>
      <Button
        appearance={isCodeView ? 'primary' : 'subtle'}
        className={mergeClasses(styles.viewButton, isCodeView ? styles.selectedButton : '')}
        size="small"
        onClick={() => {
          dispatch(collapsePanel());
          dispatch(resetDesignerView());
          switchToCodeView();
        }}
      >
        {intlText.CODE_TAB}
      </Button>
      <Button
        appearance={isMonitoringView ? 'primary' : 'subtle'}
        className={mergeClasses(styles.viewButton, isMonitoringView ? styles.selectedButton : '')}
        size="small"
        onClick={() => {
          dispatch(collapsePanel());
          dispatch(resetDesignerView());
          switchToMonitoringView();
        }}
      >
        {intlText.RUN_HISTORY_TAB}
      </Button>
    </Card>
  );

  const SaveButton = () => {
    const publishLoading = !autoSaving && isSaving;
    return (
      <ToolbarButton
        appearance="primary"
        disabled={isSaveDisabled}
        onClick={() => {
          if (isDesignerView) {
            saveWorkflowMutate();
          } else {
            saveWorkflowFromCode();
          }
        }}
        icon={publishLoading ? <Spinner size={'extra-tiny'} /> : undefined}
      >
        {publishLoading ? intlText.PUBLISHING : intlText.PUBLISH}
      </ToolbarButton>
    );
  };

  const DiscardButton = () => {
    if (hasDraft) {
      return (
        <Menu>
          <MenuTrigger>
            <ToolbarButton aria-label={intlText.DISCARD} icon={<DiscardIcon />} disabled={isSaving || isMonitoringView} />
          </MenuTrigger>
          <MenuPopover>
            <MenuList>
              <MenuItem onClick={discard} disabled={!designerIsDirty}>
                {intlText.DISCARD_SESSION_CHANGES}
              </MenuItem>
              <MenuItem onClick={discardDraft}>{intlText.DISCARD_DRAFT}</MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      );
    }

    return (
      <ToolbarButton
        aria-label={intlText.DISCARD}
        icon={<DiscardIcon />}
        onClick={discard}
        disabled={isSaving || isMonitoringView || !designerIsDirty}
      />
    );
  };

  const DraftSaveNotification = () => {
    const [, setTick] = useState(0);

    useEffect(() => {
      if (isDraftMode && lastDraftSaveTime) {
        const interval = setInterval(() => {
          setTick((prev) => prev + 1);
        }, 2000);

        return () => clearInterval(interval);
      }
      return undefined;
    }, []);

    if (isDraftMode && (isDesignerView || isCodeView)) {
      const style = { fontStyle: 'italic' as const, fontSize: '12px' };
      const iconStyle = { fontSize: '16px' };

      if (isDraftSaving || autoSaving || needsSaved) {
        return (
          <Badge appearance="ghost" color="informative" size="small" style={style} icon={<ArrowSyncFilled style={iconStyle} />}>
            {intlText.SAVING_DRAFT}
          </Badge>
        );
      }

      const savedTime = lastDraftSaveTime ? new Date(lastDraftSaveTime) : null;

      return savedTime ? (
        <Tooltip content={formatters.DRAFT_AUTOSAVED_AT({ time: savedTime.toLocaleTimeString() })} relationship="label" withArrow>
          <Badge appearance="ghost" color="informative" size="small" style={style} icon={<CheckmarkCircleRegular style={iconStyle} />}>
            {getRelativeTimeString(savedTime, {
              secondsAgo: intlText.AUTOSAVED_SECONDS_AGO,
              minutesAgo: intlText.AUTOSAVED_MINUTES_AGO,
              oneHourAgo: intlText.AUTOSAVED_ONE_HOUR_AGO,
              hoursAgo: formatters.AUTOSAVED_HOURS_AGO,
            })}
          </Badge>
        </Tooltip>
      ) : draftSaveError || autosaveError ? (
        <Tooltip content={draftSaveError || autosaveError || ''} relationship="label" withArrow>
          <Badge appearance="ghost" color="danger" size="small" style={style} icon={<ErrorCircleFilled style={iconStyle} />}>
            {intlText.ERROR_AUTOSAVING_DRAFT}
          </Badge>
        </Tooltip>
      ) : null;
    }
    return null;
  };

  const UnitTestItems = () => (
    <>
      <MenuItem
        key="save-unit-test"
        disabled={isSaveUnitTestDisabled}
        onClick={() => saveUnitTestMutate()}
        aria-label={intlText.SAVE_UNIT_TEST}
        icon={isSavingUnitTest ? <Spinner size={'extra-tiny'} /> : <SaveIcon />}
      >
        {intlText.SAVE_UNIT_TEST}
      </MenuItem>
      <MenuItem
        disabled={isCreateUnitTestDisabled}
        onClick={() => createUnitTestMutate()}
        aria-label={intlText.CREATE_UNIT_TEST}
        icon={isCreatingUnitTest ? <Spinner size={'extra-tiny'} /> : <SaveRegular />}
      >
        {intlText.CREATE_UNIT_TEST}
      </MenuItem>
      <MenuItem
        onClick={() => dispatch(openPanel({ panelMode: 'Assertions' }))}
        aria-label={intlText.UNIT_TEST_ASSERTIONS}
        icon={<AssertionsIcon />}
      >
        {intlText.UNIT_TEST_ASSERTIONS}
      </MenuItem>
      <MenuDivider />
    </>
  );

  const PanelItems = () => (
    <>
      <MenuItem
        disabled={!isDesignerView}
        onClick={() => dispatch(openPanel({ panelMode: 'WorkflowParameters' }))}
        icon={<ParametersIcon />}
      >
        {intlText.PARAMETERS}
      </MenuItem>
      <MenuItem disabled={!isDesignerView} onClick={() => dispatch(openPanel({ panelMode: 'Connection' }))} icon={<ConnectionsIcon />}>
        {intlText.CONNECTIONS}
      </MenuItem>
      <MenuItem disabled={!isDesignerView || !haveErrors} onClick={() => dispatch(openPanel({ panelMode: 'Error' }))} icon={<ErrorsIcon />}>
        {intlText.ERRORS}
      </MenuItem>
    </>
  );

  // TODO(aeldridge): Will need to update to support unit test creation from V2 designer
  const OverflowMenu = () => (
    <Menu>
      <MenuTrigger>
        <ToolbarButton aria-label={intlText.MORE_ACTIONS} icon={<MoreHorizontalIcon />} />
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {hasDraft && isDraftMode && (
            <MenuItem disabled={!isDesignerView} onClick={() => switchWorkflowMode(false)} icon={<DocumentOnePageAddIcon />}>
              {intlText.SWITCH_TO_PUBLISHED}
            </MenuItem>
          )}
          {hasDraft && !isDraftMode && (
            <MenuItem disabled={!isDesignerView} onClick={() => switchWorkflowMode(true)} icon={<DocumentOnePageColumnsIcon />}>
              {intlText.SWITCH_TO_DRAFT}
            </MenuItem>
          )}
          {hasDraft && <MenuDivider />}
          {isLocal && (
            <MenuItem key={'create-unit-test'} onClick={onCreateUnitTestFromRun} icon={<CreateUnitTestIcon />}>
              {intlText.CREATE_UNIT_TEST_FROM_RUN}
            </MenuItem>
          )}
          {isUnitTest && <UnitTestItems />}
          <PanelItems />
          <MenuDivider />
          <MenuItem
            key={'file-a-bug'}
            icon={<BugIcon />}
            onClick={() => {
              vscode.postMessage({
                command: ExtensionCommand.fileABug,
              });
            }}
          >
            {intlText.FILE_BUG}
          </MenuItem>
        </MenuList>
      </MenuPopover>
    </Menu>
  );

  return (
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
      <DraftSaveNotification />
      <SaveButton />
      <DiscardButton />
      <Divider vertical style={{ flexGrow: 0 }} />
      <OverflowMenu />
    </Toolbar>
  );
};
