import { type EventHandler } from '../../eventhandler';
import { ActionResult } from './actionResult';
import './outputMocks.less';
import { Divider, Text } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

export interface MockUpdateEvent {
  id: string;
  actionResult: string;
}

export type MockUpdateHandler = EventHandler<MockUpdateEvent>;

export interface OutputMocksProps {
  isMockSupported: boolean;
  nodeId: string;
  onMockUpdate: MockUpdateHandler;
}

export const OutputMocks = ({ isMockSupported, nodeId, onMockUpdate }: OutputMocksProps) => {
  const intl = useIntl();

  const intlText = {
    UNSUPPORTED_MOCKS: intl.formatMessage({
      defaultMessage:
        'This operation does not support mocking. Mocking is only supported for operations that are connected to a service provider, function, API connection, or API Management.',
      description: 'Unsupported message for mock results tab',
    }),
  };

  const unsupportedMessage = <Text>{intlText.UNSUPPORTED_MOCKS}</Text>;

  return isMockSupported ? (
    <>
      <ActionResult nodeId={nodeId} onMockUpdate={onMockUpdate} />
      <Divider style={{ padding: '16px 0px' }} />
    </>
  ) : (
    unsupportedMessage
  );
};
