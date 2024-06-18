import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl, type IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { ChoiceGroup, Label, TextField } from '@fluentui/react';
import { updateKind, updateWorkflowName } from '../../../../../core/state/templates/templateSlice';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { selectPanelTab } from '../../../../../core/state/templates/panelSlice';
import { Text } from '@fluentui/react-components';
import { useCallback, useMemo } from 'react';

export const NameStatePanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { workflowName, kind } = useSelector((state: RootState) => state.template);
  const { existingWorkflowName } = useSelector((state: RootState) => state.workflow);

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
      <div className="msla-templates-choiceGroup-label">
        <Text>{intlText.STATEFUL}</Text>
        <div className="msla-templates-choiceGroup-list">
          <li>{intlText.STATEFUL_FIRST_POINT}</li>
          <li>{intlText.STATEFUL_SECOND_POINT}</li>
        </div>
      </div>
    ),
    [intlText]
  );

  const onRenderStatelessField = useCallback(
    () => (
      <div className="msla-templates-choiceGroup-label">
        <Text>{intlText.STATELESS}</Text>
        <div className="msla-templates-choiceGroup-list">
          <li>{intlText.STATELESS_FIRST_POINT}</li>
          <li>{intlText.STATELESS_SECOND_POINT}</li>
        </div>
      </div>
    ),
    [intlText]
  );

  return (
    <div className="msla-templates-nameStateTab">
      <Label className="msla-templates-label" required={true} htmlFor={'workflowName'}>
        {intlText.WORKFLOW_NAME}
      </Label>
      <Text className="msla-templates-label-description">{intlText.WORKFLOW_NAME_DESCRIPTION}</Text>
      <TextField
        className="msla-templates-textField"
        data-testid={'workflowName'}
        id={'workflowName'}
        ariaLabel={intlText.WORKFLOW_NAME}
        value={existingWorkflowName ?? workflowName}
        onChange={(_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) =>
          dispatch(updateWorkflowName(newValue ?? ''))
        }
        disabled={!!existingWorkflowName}
      />
      <Label className="msla-templates-label" required={true} htmlFor={'workflowName'}>
        {intlText.STATE_TYPE}
      </Label>
      <Text className="msla-templates-label-description">{intlText.STATE_TYPE_DESCRIPTION}</Text>
      <ChoiceGroup
        className="msla-templates-choiceGroup"
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

export const nameStateTab = (intl: IntlShape, dispatch: AppDispatch, isMissingInfo: boolean): TemplatePanelTab => ({
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
      if (!isMissingInfo) {
        dispatch(selectPanelTab(constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE));
      }
    },
    primaryButtonDisabled: isMissingInfo,
  },
});
