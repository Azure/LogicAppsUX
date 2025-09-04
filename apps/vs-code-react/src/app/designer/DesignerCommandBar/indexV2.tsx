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
} from '@microsoft/logic-apps-designer-v2';
import { isNullOrEmpty, type Workflow } from '@microsoft/logic-apps-shared';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import { useContext, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useMutation } from '@tanstack/react-query';
import {
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
} from '@fluentui/react-icons';
import { useCommandBarStyles } from './styles';
import { useSelector } from 'react-redux';

// Designer icons
const SaveIcon = bundleIcon(SaveFilled, SaveRegular);
const DiscardIcon = bundleIcon(ArrowUndoFilled, ArrowUndoRegular);
const ParametersIcon = bundleIcon(MentionBracketsFilled, MentionBracketsRegular);
const ConnectionsIcon = bundleIcon(LinkFilled, LinkRegular);
const ErrorsIcon = bundleIcon(ErrorCircleFilled, ErrorCircleRegular);
const SaveBlankUnitTestIcon = bundleIcon(BeakerFilled, BeakerRegular);

// Base icons
const BugIcon = bundleIcon(BugFilled, BugRegular);
const MoreHorizontalIcon = bundleIcon(MoreHorizontalFilled, MoreHorizontalRegular);

// Unit test icons
const AssertionsIcon = bundleIcon(CheckmarkFilled, CheckmarkRegular);

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
}) => {
  const intl = useIntl();
  const vscode = useContext(VSCodeContext);
  const dispatch = DesignerStore.dispatch;

  const styles = useCommandBarStyles();

  const designerIsDirty = useIsDesignerDirty();

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

  /////////////////////////////////////////////////////////////////////////////

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
    DESIGNER_DISCARD: intl.formatMessage({
      defaultMessage: 'Discard',
      id: 'zU5AVD',
      description: 'Button text for discard changes',
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
  const isSaveBlankUnitTestDisabled = useMemo(
    () => isSavingBlankUnitTest || haveAssertionErrors || designerIsDirty,
    [isSavingBlankUnitTest, haveAssertionErrors, designerIsDirty]
  );
  const haveErrors = useMemo(
    () => haveInputErrors || haveWorkflowParameterErrors || haveSettingsErrors || haveConnectionErrors,
    [haveInputErrors, haveWorkflowParameterErrors, haveSettingsErrors, haveConnectionErrors]
  );

  const isSaveDisabled = useMemo(
    () => isMonitoringView || isSaving || isSavingFromCode || haveErrors || !designerIsDirty,
    [isMonitoringView, isSaving, isSavingFromCode, haveErrors, designerIsDirty]
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
        Workflow
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
        Code
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
        Run history
      </Button>
    </Card>
  );

  const SaveButton = () => (
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
      icon={isSaving ? <Spinner size={'extra-tiny'} /> : undefined}
    >
      {isSaving ? 'Saving' : 'Save'}
    </ToolbarButton>
  );

  const DiscardButton = () => (
    <ToolbarButton
      aria-label={Resources.DESIGNER_DISCARD}
      icon={<DiscardIcon />}
      onClick={discard}
      disabled={isSaving || isMonitoringView || !designerIsDirty}
    />
  );

  const UnitTestItems = () => (
    <>
      <MenuItem
        key="save-unit-test"
        disabled={isSaveUnitTestDisabled}
        onClick={() => saveUnitTestMutate()}
        aria-label={Resources.UNIT_TEST_SAVE}
        icon={isSavingUnitTest ? <Spinner size={'extra-tiny'} /> : <SaveIcon />}
      >
        {Resources.UNIT_TEST_SAVE}
      </MenuItem>
      <MenuItem
        disabled={isSaveBlankUnitTestDisabled}
        onClick={() => saveBlankUnitTestMutate()}
        aria-label={Resources.UNIT_TEST_CREATE_BLANK}
        icon={isSavingBlankUnitTest ? <Spinner size={'extra-tiny'} /> : <SaveRegular />}
      >
        {Resources.UNIT_TEST_CREATE_BLANK}
      </MenuItem>
      <MenuItem
        onClick={() => dispatch(openPanel({ panelMode: 'Assertions' }))}
        aria-label={Resources.UNIT_TEST_ASSERTIONS}
        icon={<AssertionsIcon />}
      >
        {Resources.UNIT_TEST_ASSERTIONS}
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
        {Resources.DESIGNER_PARAMETERS}
      </MenuItem>
      <MenuItem disabled={!isDesignerView} onClick={() => dispatch(openPanel({ panelMode: 'Connection' }))} icon={<ConnectionsIcon />}>
        {Resources.DESIGNER_CONNECTIONS}
      </MenuItem>
      <MenuItem disabled={!isDesignerView || !haveErrors} onClick={() => dispatch(openPanel({ panelMode: 'Error' }))} icon={<ErrorsIcon />}>
        {Resources.DESIGNER_ERRORS}
      </MenuItem>
    </>
  );

  const OverflowMenu = () => (
    <Menu>
      <MenuTrigger>
        <ToolbarButton aria-label="More" icon={<MoreHorizontalIcon />} />
      </MenuTrigger>
      <MenuPopover>
        <MenuList>
          {isLocal && (
            <MenuItem key={'create-unit-test'} onClick={onCreateUnitTest} icon={<SaveBlankUnitTestIcon />}>
              {Resources.CREATE_UNIT_TEST}
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
            {Resources.FILE_A_BUG}
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
      <SaveButton />
      <DiscardButton />
      <Divider vertical style={{ flexGrow: 0 }} />
      <OverflowMenu />
    </Toolbar>
  );
};
