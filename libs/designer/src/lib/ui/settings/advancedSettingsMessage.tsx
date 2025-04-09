import { useIntl } from 'react-intl';
import { Link, Text } from '@fluentui/react-components';
import { bundleIcon, LinkSquare12Regular, LinkSquare12Filled } from '@fluentui/react-icons';
const NavigateIcon = bundleIcon(LinkSquare12Regular, LinkSquare12Filled);

export const AdvancedSettingsMessage = ({ shouldShowMessage }: { shouldShowMessage: boolean }) => {
  const intl = useIntl();

  const IntlMessage = {
    message: intl.formatMessage({
      defaultMessage:
        'Add advanced parameters to further customize how the language model responds. These advanced options are optional and can help you fine-tune the experience.',
      description: 'Agent advance parameters description',
      id: 'yJfhNL',
    }),
    messageLink: intl.formatMessage({
      defaultMessage: 'Guideline for agent advanced parameters',
      description: 'Agent advance parameters description link',
      id: '6F4Knf',
    }),
  };

  return (
    shouldShowMessage && (
      <div style={{ paddingBottom: '5px' }}>
        <Text style={{ fontSize: 12 }}>{IntlMessage.message} </Text>
        <Link
          href="https://learn.microsoft.com/en-us/azure/logic-apps/connectors/built-in/reference/openai/#get-chat-completions"
          target="_blank"
          style={{ fontSize: 12, fontStyle: 'italic' }}
        >
          {IntlMessage.messageLink}
          <NavigateIcon style={{ position: 'relative', top: '2px', left: '2px' }} />
        </Link>
      </div>
    )
  );
};
