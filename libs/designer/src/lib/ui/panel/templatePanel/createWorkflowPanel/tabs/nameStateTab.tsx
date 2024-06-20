import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl, type IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { ChoiceGroup, Label, TextField } from '@fluentui/react';
import { updateKind, updateWorkflowName } from '../../../../../core/state/templates/templateSlice';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import { Text } from '@fluentui/react-components';
import { useCallback, useMemo, useState } from 'react';

export const NameStatePanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { workflowName, kind } = useSelector((state: RootState) => state.template);
  const { existingWorkflowName, existingWorkflowNames } = useSelector((state: RootState) => state.workflow);
  const [validationError, setValidationError] = useState('');

  const { manifest } = useSelector((state: RootState) => state.template);
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
        defaultMessage: 'State Type',
        id: 'X2xiq1',
        description: 'Label for choosing State type',
      }),
      STATE_TYPE_DESCRIPTION: intl.formatMessage({
        defaultMessage: 'The workflow state determines how data is managed and retained during execution of workflows.',
        id: 'ixEnhz',
        description: 'Description for state type choice group.',
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
        defaultMessage: 'Workflow Name',
        id: '8WZwsC',
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

  const testRegex = () => {
    if (!workflowName) {
      setValidationError(
        intl.formatMessage({
          defaultMessage: 'Must provide value for workflow name.',
          id: 'sKy720',
          description: 'Error message when the workflow name is empty.',
        })
      );
      return;
    }
    const regex = /^[A-Za-z][A-Za-z0-9]*(?:[_-][A-Za-z0-9]+)*$/;
    if (!regex.test(workflowName)) {
      setValidationError(
        intl.formatMessage({
          defaultMessage: 'Name does not match the given pattern.',
          id: 'zMKxg9',
          description: 'Error message when the workflow name is invalid regex.',
        })
      );
      return;
    }
    if (existingWorkflowNames.includes(workflowName)) {
      setValidationError(
        intl.formatMessage(
          {
            defaultMessage: 'Workflow with name "{workflowName}" already exists.',
            id: '7F4Bzv',
            description: 'Error message when the workflow name already exists.',
          },
          { workflowName }
        )
      );
      return;
    }
    setValidationError('');
  };

  return (
    <div className="msla-templates-tab">
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
          dispatch(updateWorkflowName(newValue ?? ''))
        }
        disabled={!!existingWorkflowName}
        onBlur={testRegex}
        errorMessage={validationError}
      />
      <Label className="msla-templates-tab-label" required={true} htmlFor={'stateTypeLabel'}>
        {intlText.STATE_TYPE}
      </Label>
      <Text className="msla-templates-tab-label-description">{intlText.STATE_TYPE_DESCRIPTION}</Text>
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
  );
};

export const nameStateTab = (
  intl: IntlShape,
  dispatch: AppDispatch,
  {
    primaryButtonDisabled,
    previousTabId,
  }: {
    primaryButtonDisabled: boolean;
    previousTabId: string | undefined;
  }
): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE,
  title: intl.formatMessage({
    defaultMessage: 'Name and State',
    id: '+sz9Ur',
    description: 'The tab label for the monitoring name and state tab on the create workflow panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Provide a unique, descriptive name and review the state type to ensure your workflow is properly configured.',
    id: 'ZXyMDQ',
    description: 'An accessability label that describes the objective of name and state tab',
  }),
  visible: true,
  order: 2,
  content: <NameStatePanel />,
  footerContent: {
    primaryButtonText: intl.formatMessage({
      defaultMessage: 'Next',
      id: '0UfxUM',
      description: 'Button text for moving to the next tab in the create workflow panel',
    }),
    primaryButtonOnClick: () => {
      if (!primaryButtonDisabled) {
        dispatch(selectPanelTab(constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE));
      }
    },
    primaryButtonDisabled: primaryButtonDisabled,
    secondaryButtonText: previousTabId
      ? intl.formatMessage({
          defaultMessage: 'Previous',
          id: 'Yua/4o',
          description: 'Button text for moving to the previous tab in the create workflow panel',
        })
      : undefined,
    secondaryButtonOnClick: previousTabId
      ? () => {
          dispatch(selectPanelTab(previousTabId));
        }
      : undefined,
  },
});
