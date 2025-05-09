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
      description: 'Description for agent advanced parameters',
      id: 'uohgys',
    }),
    messageLink: intl.formatMessage({
      defaultMessage: 'Guideline for agent advanced parameters',
      description: 'Description link for agent advanced parameters',
      id: 'ZGGkV+',
    }),
  };

  return (
    shouldShowMessage && (
      <div style={{ paddingBottom: '5px' }}>
        <Text style={{ fontSize: 12 }}>{IntlMessage.message} </Text>
        <Link href="https://aka.ms/LogicApps/Agents/parameters" target="_blank" style={{ fontSize: 12, fontStyle: 'italic' }}>
          {IntlMessage.messageLink}
          <NavigateIcon style={{ position: 'relative', top: '2px', left: '2px' }} />
        </Link>
      </div>
    )
  );
};
