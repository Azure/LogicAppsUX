import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl, type IntlShape } from 'react-intl';
import constants from '../../../../../common/constants';
import { ChoiceGroup, Label, TextField } from '@fluentui/react';
import { updateKind, updateWorkflowName } from '../../../../../core/state/templates/templateSlice';
import type { TemplatePanelTab } from '@microsoft/designer-ui';
import { selectPanelTab } from '../../../../../core/state/templates/panelSlice';

export const NameStatePanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { workflowName, kind } = useSelector((state: RootState) => state.template);
  const { existingWorkflowName } = useSelector((state: RootState) => state.workflow);

  const { manifest } = useSelector((state: RootState) => state.template);
  const intl = useIntl();

  const intlText = {
    STATE_TYPE: intl.formatMessage({
      defaultMessage: 'State Type',
      id: 'X2xiq1',
      description: 'Label for choosing State type',
    }),
    STATEFUL: intl.formatMessage({
      defaultMessage: 'Stateful: Optimized for high reliability, ideal for process business transitional data.',
      id: 'V9EOZ+',
      description: 'Description for Stateful Type',
    }),
    STATELESS: intl.formatMessage({
      defaultMessage: 'Stateless: Optimized for low latency, ideal for request-response and processing IoT events.',
      id: 'mBZnZP',
      description: 'Description for Stateless Type',
    }),
    WORKFLOW_NAME: intl.formatMessage({
      defaultMessage: 'Workflow Name',
      id: '8WZwsC',
      description: 'Label for workflow Name',
    }),
  };

  return (
    <div>
      <Label required={true} htmlFor={'workflowName'}>
        {intlText.WORKFLOW_NAME}
      </Label>
      <TextField
        data-testid={'workflowName'}
        id={'workflowName'}
        ariaLabel={intlText.WORKFLOW_NAME}
        value={existingWorkflowName ?? workflowName}
        onChange={(_event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) =>
          dispatch(updateWorkflowName(newValue ?? ''))
        }
        disabled={!!existingWorkflowName}
      />
      <ChoiceGroup
        label={intlText.STATE_TYPE}
        options={[
          { key: 'stateful', text: intlText.STATEFUL },
          {
            key: 'stateless',
            text: intlText.STATELESS,
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

export const nameStateTab = (intl: IntlShape, dispatch: AppDispatch): TemplatePanelTab => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.NAME_AND_STATE,
  title: intl.formatMessage({
    defaultMessage: 'Name and State',
    id: '+sz9Ur',
    description: 'The tab label for the monitoring name and state tab on the create workflow panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Name and State Tab',
    id: 'PEo0hr',
    description: 'An accessability label that describes the name and state tab',
  }),
  visible: true,
  order: 2,
  content: <NameStatePanel />,
  footerContent: {
    primaryButtonText: 'Next',
    primaryButtonOnClick: () => {
      dispatch(selectPanelTab(constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE));
    },
    primaryButtonDisabled: false,
    onClose: () => {},
  },
});
