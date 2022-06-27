import { Text } from '@fluentui/react';
import { useIntl } from 'react-intl';

export const InstanceSelection: React.FC = () => {
  const intl = useIntl();

  const intlText = {
    SELECT_TITLE: intl.formatMessage({
      defaultMessage: 'Select Logic App Instance',
      description: 'Select logic app instance title',
    }),
    SELECT_DESCRIPTION: intl.formatMessage({
      defaultMessage:
        'Here you are able to export a selection of Logic Apps into a code format for re-usage and integration into larger Logic App schemas',
      description: 'Select apps to export description',
    }),
    SELECTION_SUBSCRIPTION: intl.formatMessage({
      defaultMessage: 'Select a Subscription',
      description: 'Select a subscription',
    }),
    SELECTION_ISE: intl.formatMessage({
      defaultMessage: 'Select an ISE (Integration Service Environment) instance',
      description: 'Select an ISE instance',
    }),
  };

  return (
    <div className="msla-export-instance-panel">
      <Text variant="xLarge" nowrap block>
        {intlText.SELECT_TITLE}
      </Text>
      <Text variant="large" nowrap block>
        {intlText.SELECT_DESCRIPTION}
      </Text>
    </div>
  );
};
