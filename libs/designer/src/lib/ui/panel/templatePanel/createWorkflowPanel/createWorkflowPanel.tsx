import { useIntl } from 'react-intl';
import type { RootState } from '../../../../core/state/templates/store';
import { useSelector } from 'react-redux';
import { DisplayConnections } from '../../../templates/connections/displayConnections';

export const CreateWorkflowPanel = () => {
  const intl = useIntl();
  const { connections } = useSelector((state: RootState) => state.template);

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
    </>
  );
};
