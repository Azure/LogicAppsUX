import { Spinner } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

export const Waiting: React.FC = () => {
  const intl = useIntl();
  const intlText = {
    connectionsLoading: intl.formatMessage({
      defaultMessage: 'Run information loading',
      id: 'c4af2bd7f858',
      description: 'Run information loading text',
    }),
  };
  return <Spinner size="tiny" aria-label={intlText.connectionsLoading} />;
};
