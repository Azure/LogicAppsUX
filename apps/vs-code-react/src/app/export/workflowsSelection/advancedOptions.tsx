import { Text } from '@fluentui/react';
import { useIntl } from 'react-intl';

export const AdvancedOptions: React.FC<any> = () => {
  const intl = useIntl();

  const intlText = {
    ADVANCED_OPTIONS: intl.formatMessage({
      defaultMessage: 'Advanced options',
      description: 'Advanced options title',
    }),
    EXPORT_CONNECTION: intl.formatMessage({
      defaultMessage: 'Export connection credentials',
      description: 'Export connection credentials title',
    }),
    EXPORT_CONNECTION_DESCRIPTION: intl.formatMessage({
      defaultMessage: 'Export the connection credentials for each application',
      description: 'Export the connection credentials for each application description',
    }),
  };
  return (
    <div className="msla-export-workflows-advanced-options">
      <Text className="msla-export-workflows-advanced-options-title" variant="xLarge" block>
        {intlText.ADVANCED_OPTIONS}
      </Text>
      <Text variant="large" block>
        {intlText.EXPORT_CONNECTION}
      </Text>
      <Text variant="large" block>
        {intlText.EXPORT_CONNECTION_DESCRIPTION}
      </Text>
    </div>
  );
};
