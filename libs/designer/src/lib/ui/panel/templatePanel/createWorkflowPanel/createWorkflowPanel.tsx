import { useIntl } from 'react-intl';
import type { RootState } from '../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { DisplayConnections } from '../../../templates/connections/displayConnections';
import { DisplayParameters } from '../../../templates/parameters/displayParameters';
import { Button } from '@fluentui/react-components';

export const CreateWorkflowPanel = () => {
  const intl = useIntl();
  const { parameters, connections } = useSelector((state: RootState) => state.template);

  const intlText = {
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

  const createWorkflowCall = () => {

  }

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

      <Button appearance="subtle" onClick={createWorkflowCall}>
        {intlText.CREATE}
      </Button>
    </>
  );
};
