import { InfoLabel } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

export const InputCustomInfoLabel = () => {
  const intl = useIntl();
  const label = intl.formatMessage({
    defaultMessage: 'Wrap all custom value string and DateTime values in double quotes. For example, "abc".',
    id: 'vhwaYb',
    description: 'Info label describing how to format custom values',
  });

  return <InfoLabel info={<div>{label}</div>} />;
};
