import { useIntl } from 'react-intl';
import type { AppDispatch, RootState } from '../../../../core/state/templates/store';
import { useDispatch, useSelector } from 'react-redux';
import { DisplayConnections } from '../../../templates/connections/displayConnections';
import { DisplayParameters } from '../../../templates/parameters/displayParameters';
import { Button } from '@fluentui/react-components';
import { ChoiceGroup } from '@fluentui/react';
import { updateKind } from '../../../../core/state/templates/templateSlice';

export const CreateWorkflowPanel = () => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const { kind, manifest, parameters, connections } = useSelector((state: RootState) => state.template);
  const { appId } = useSelector((state: RootState) => state.workflow);

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

  const createWorkflowCall = () => {};
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
      <Button appearance="outline" onClick={createWorkflowCall} disabled={!appId}>
        {intlText.CREATE}
      </Button>
    </>
  );
};
