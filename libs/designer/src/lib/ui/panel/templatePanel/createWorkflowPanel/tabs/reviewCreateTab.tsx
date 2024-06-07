import type { AppDispatch, RootState } from '../../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl, type IntlShape } from 'react-intl';
import { Button, Spinner } from '@fluentui/react-components';
import { ChoiceGroup, Label, TextField } from '@fluentui/react';
import constants from '../../../../../common/constants';
import { useState } from 'react';
import { updateKind, updateWorkflowName } from '../../../../../core/state/templates/templateSlice';

export const ReviewCreatePanel = ({ onCreateClick }: { onCreateClick: () => Promise<void> }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { workflowName, kind } = useSelector((state: RootState) => state.template);
  const { workflowName: existingWorkflowName } = useSelector((state: RootState) => state.workflow);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);
  const { manifest } = useSelector((state: RootState) => state.template);

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
    CREATE: intl.formatMessage({
      defaultMessage: 'Create',
      id: 'mmph/s',
      description: 'Button text for Creating new workflow from the template',
    }),
  };

  async function handleCreateClick() {
    setIsLoadingCreate(true);
    await onCreateClick();
    setIsLoadingCreate(false);
  }

  return (
    <div>
      Review and Create Tab Placeholder
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
          { key: 'stateful', text: intlText.STATEFUL, disabled: !manifest?.kinds.includes('stateful') },
          {
            key: 'stateless',
            text: intlText.STATELESS,
            disabled: !manifest?.kinds.includes('stateless'),
          },
        ]}
        onChange={(_, option) => {
          if (option?.key) {
            dispatch(updateKind(option?.key));
          }
        }}
        selectedKey={kind}
      />
      <div>
        <Button
          appearance="outline"
          onClick={handleCreateClick}
          data-testid={'create-workflow-button'}
          disabled={!(existingWorkflowName ?? workflowName) || !kind}
        >
          {isLoadingCreate ? <Spinner size="extra-tiny" /> : intlText.CREATE}
        </Button>
      </div>
    </div>
  );
};

export const reviewCreateTab = (intl: IntlShape, onCreateClick: () => Promise<void>) => ({
  id: constants.TEMPLATE_PANEL_TAB_NAMES.REVIEW_AND_CREATE,
  title: intl.formatMessage({
    defaultMessage: 'Review and Create',
    id: 'vlWl7f',
    description: 'The tab label for the monitoring review and create tab on the create workflow panel',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Review and Create Tab',
    id: 'z4pjNi',
    description: 'An accessability label that describes the review and create tab',
  }),
  visible: true,
  content: <ReviewCreatePanel onCreateClick={onCreateClick} />,
  order: 3,
  icon: 'Info',
});
