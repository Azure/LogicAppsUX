import { Text } from '@fluentui/react';
import { useIntl } from 'react-intl';

export const Summary: React.FC = () => {
  const intl = useIntl();

  const intlText = {
    COMPLETE_EXPORT_TITLE: intl.formatMessage({
      defaultMessage: 'Complete Export',
      description: 'Complete export title',
    }),
    SELECT_LOCATION: intl.formatMessage({
      defaultMessage: 'Select a location to export your logic apps to',
      description: 'Select a location description',
    }),
  };

  return (
    <>
      <Text variant="xLarge" nowrap block>
        {intlText.COMPLETE_EXPORT_TITLE}
      </Text>
      <Text variant="large" nowrap block>
        {intlText.SELECT_LOCATION}
      </Text>
    </>
  );
};
