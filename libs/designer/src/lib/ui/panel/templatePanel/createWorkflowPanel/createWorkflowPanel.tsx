import { useIntl } from 'react-intl';
import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { DisplayConnections } from '../../../templates/connections/displayConnections';
import { DisplayParameters } from '../../../templates/parameters/displayParameters';
import { Button, Spinner } from '@fluentui/react-components';
import { ChoiceGroup, Label, TextField } from '@fluentui/react';
import { updateKind, updateWorkflowName } from '../../../../core/state/templates/templateSlice';
import { useState } from 'react';

export const CreateWorkflowPanel = ({ onCreateClick }: { onCreateClick: () => Promise<void> }) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { workflowName, kind, manifest, parameters, connections } = useSelector((state: RootState) => state.template);
  const { workflowName: existingWorkflowName } = useSelector((state: RootState) => state.workflow);
  const [isLoadingCreate, setIsLoadingCreate] = useState(false);

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
    CREATE_NEW_WORKFLOW: intl.formatMessage({
      defaultMessage: 'Create New Workflow',
      id: '/G8rbe',
      description: 'Create new workflow description',
    }),
    CONFIGURE_CONNECTIONS: intl.formatMessage({
      defaultMessage: 'Configure Connections',
      id: 'D6Gabc',
      description: 'Configure Connections description',
    }),
    CREATE: intl.formatMessage({
      defaultMessage: 'Create',
      id: 'mmph/s',
      description: 'Button text for Creating new workflow from the template',
    }),
  };

  return (
    <>
      <div>
        <b>{intlText.CREATE_NEW_WORKFLOW}</b>
      </div>
      <div>
        <b>Placeholder 1. {intlText.CONFIGURE_CONNECTIONS}</b>
      </div>

      {connections ? <DisplayConnections connections={connections} /> : <>PLACEHOLDER: no connections to be made</>}
      {parameters ? <DisplayParameters /> : <>PLACEHOLDER: no parameters</>}

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
      <Button
        appearance="outline"
        onClick={async () => {
          setIsLoadingCreate(true);
          await onCreateClick();
          setIsLoadingCreate(false);
        }}
        disabled={!(existingWorkflowName ?? workflowName) || !kind}
      >
        {isLoadingCreate ? <Spinner size="extra-tiny" /> : intlText.CREATE}
      </Button>
    </>
  );
};
