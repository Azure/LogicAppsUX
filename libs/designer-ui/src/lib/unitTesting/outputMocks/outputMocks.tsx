import { ActionResult } from './actionResult';
import './outputMocks.less';
import { Divider, Text } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

export interface OutputMocksProps {
  isMockSupported: boolean;
}

export const OutputMocks = ({ isMockSupported }: OutputMocksProps) => {
  const intl = useIntl();

  const supported = (
    <Text>
      {intl.formatMessage({
        defaultMessage: 'Supported',
        description: 'Unsupported message for mock results tab',
      })}
    </Text>
  );

  const unsupportedMessage = (
    <Text>
      {intl.formatMessage({
        defaultMessage:
          'This operation does not support mocking. Mocking is only supported for operations that are connected to a service provider, function, API connection, or API Management.',
        description: 'Unsupported message for mock results tab',
      })}
    </Text>
  );

  return isMockSupported ? (
    <>
      <ActionResult />
      <Divider style={{ padding: '16px 0px' }} />

      {supported}
    </>
  ) : (
    unsupportedMessage
  );
};
