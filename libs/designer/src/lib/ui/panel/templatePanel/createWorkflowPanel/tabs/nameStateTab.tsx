import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl, type IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { ChoiceGroup, Label, TextField } from '@fluentui/react';
import {
  updateKind,
  updateWorkflowName,
  clearTemplateDetails,
  validateWorkflowName,
} from '../../../../../core/state/templates/templateSlice';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { Text } from '@fluentui/react-components';
import { useCallback, useMemo } from 'react';
import { closePanel, selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import { useExistingWorkflowNames } from '../../../../../core/queries/template';
import type { CreateWorkflowTabProps } from '../createWorkflowPanel';

export const NameStatePanel = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    workflowName,
    errors: { workflow: workflowError, kind: kindError },
    kind,
    manifest,
  } = useSelector((state: RootState) => state.template);
  const { existingWorkflowName } = useSelector((state: RootState) => state.workflow);
  const { data: existingWorkflowNames } = useExistingWorkflowNames();
  const intl = useIntl();

  const intlText = useMemo(
    () => ({
      WORKFLOW_NAME_DESCRIPTION: intl.formatMessage({
        defaultMessage:
          'Provide a unique, descriptive name. Use underscores (_) or dashes (-) instead of spaces to keep names clean and searchable. To prevent any issues, avoid using the following symbols and characters in your project names: \\ / : * ? " < > | @, #, $, %, &',
        id: 'xtDCgy',
        description: 'Description for workflow name field and the expected format of the name.',
      }),
      STATE_TYPE: intl.formatMessage({
        defaultMessage: 'State type',
        id: 'W1rlxU',
        description: 'Label for choosing State type',
      }),
      STATE_TYPE_DESCRIPTION: intl.formatMessage({
        defaultMessage: 'The workflow state determines how data is managed and retained during execution of workflows.',
        id: 'ixEnhz',
        description: 'Description for state type choice group.',
      }),
      LEARN_MORE: intl.formatMessage({
        defaultMessage: 'Learn more',
        id: 'Xg1UDw',
        description: 'Link to learn more about state type',
      }),
      STATEFUL: intl.formatMessage({
        defaultMessage: 'Stateful',
        id: 'kU4VfD',
        description: 'Choice group first choice: Stateful Type',
      }),
      STATEFUL_FIRST_POINT: intl.formatMessage({
        defaultMessage: 'Optimized for high reliability',
        id: 'RLoDgQ',
        description: 'First bullet point of stateful type',
      }),
      STATEFUL_SECOND_POINT: intl.formatMessage({
        defaultMessage: 'Ideal for process business transitional data',
        id: 'F1AkvV',
        description: 'Second bullet point of stateful type',
      }),
      STATELESS: intl.formatMessage({
        defaultMessage: 'Stateless',
        id: 'uTTbhk',
        description: 'Choice group first choice: Stateless Type',
      }),
      STATELESS_FIRST_POINT: intl.formatMessage({
        defaultMessage: 'Optimized for low latency',
        id: 'xHyhqO',
        description: 'First bullet point of stateless type',
      }),
      STATELESS_SECOND_POINT: intl.formatMessage({
        defaultMessage: 'Ideal for request-response and processing IoT events',
        id: 'yeagrz',
        description: 'Second bullet point of stateless type',
      }),
      WORKFLOW_NAME: intl.formatMessage({
        defaultMessage: 'Workflow name',
        id: 'ekM77J',
        description: 'Label for workflow Name',
      }),
    }),
    [intl]
  );

  const onRenderStatefulField = useCallback(
    () => (
      <div className="msla-templates-tab-choiceGroup-label">
        <Text>{intlText.STATEFUL}</Text>
        <div className="msla-templates-tab-choiceGroup-list">
          <li>{intlText.STATEFUL_FIRST_POINT}</li>
          <li>{intlText.STATEFUL_SECOND_POINT}</li>
        </div>
      </div>
    ),
    [intlText]
  );

  const onRenderStatelessField = useCallback(
    () => (
      <div className="msla-templates-tab-choiceGroup-label">
        <Text>{intlText.STATELESS}</Text>
        <div className="msla-templates-tab-choiceGroup-list">
          <li>{intlText.STATELESS_FIRST_POINT}</li>
          <li>{intlText.STATELESS_SECOND_POINT}</li>
        </div>
      </div>
    ),
    [intlText]
  );

  return (
    <div className="msla-templates-tab msla-panel-no-description-tab">
      <Label className="msla-templates-tab-label" required={true} htmlFor={'workflowNameLabel'}>
        {intlText.WORKFLOW_NAME}
      </Label>
      <Text className="msla-templates-tab-label-description">{intlText.WORKFLOW_NAME_DESCRIPTION}</Text>
      <TextField
        className="msla-templates-tab-textField"
        data-testid={'workflowName'}
        id={'workflowName'}
        ariaLabel={intlText.WORKFLOW_NAME}
        value={existingWorkflowName ?? workflowName}
        onChange={(_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) =>
          dispatch(updateWorkflowName(newValue))
        }
        disabled={!!existingWorkflowName}
        onBlur={() => {
          dispatch(validateWorkflowName(existingWorkflowNames ?? []));
        }}
        errorMessage={workflowError}
      />
      <div className={kindError ? 'msla-templates-tab-stateType-error' : ''}>
        <Label className="msla-templates-tab-label" required={true} htmlFor={'stateTypeLabel'}>
          {intlText.STATE_TYPE}
        </Label>
        <Text className="msla-templates-tab-label-description">
          {intlText.STATE_TYPE_DESCRIPTION}{' '}
          <a
            href={'https://learn.microsoft.com/azure/logic-apps/single-tenant-overview-compare#stateful-stateless'}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'inline' }}
          >
            {intlText.LEARN_MORE}
          </a>
        </Text>
        <ChoiceGroup
          className="msla-templates-tab-choiceGroup"
          options={[
            { key: 'stateful', text: intlText.STATEFUL, onRenderLabel: onRenderStatefulField },
            {
              key: 'stateless',
              text: intlText.STATELESS,
              onRenderLabel: onRenderStatelessField,
            },
          ]}
          onChange={(_, option) => {
            if (option?.key) {
              dispatch(updateKind(option?.key));
            }
          }}
          selectedKey={kind}
          disabled={manifest?.kinds?.length === 1}
        />
      </div>
      {kindError && <Text className="msla-templates-tab-stateType-error-message">{kindError}</Text>}
    </div>
  );
};

export const nameStateTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  { isCreating, nextTabId, hasError }: CreateWorkflowTabProps
): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.BASIC,
  title: intl.formatMessage({
    defaultMessage: 'Basic',
    id: '8vPuBZ',
    description: 'The tab label for the monitoring name and state tab on the create workflow panel',
  }),
  hasError: hasError,
  content: <NameStatePanel />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: '0UfxUM',
      description: 'Button text for moving to the next tab in the create workflow panel',
    }),
    primaryButtonOnClick: () => {
      dispatch(selectPanelTab(nextTabId));
    },
    secondaryButtonText: intl.formatMessage({
      defaultMessage: 'Close',
      id: 'FTrMxN',
      description: 'Button text for closing the panel',
    }),
    secondaryButtonOnClick: () => {
      dispatch(closePanel());
      dispatch(clearTemplateDetails());
    },
    secondaryButtonDisabled: isCreating,
  },
});
