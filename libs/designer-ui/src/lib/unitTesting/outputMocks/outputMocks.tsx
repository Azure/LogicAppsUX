import { type EventHandler } from '../../eventhandler';
import { ActionResult } from './actionResult';
import { OutputsSettings } from './ouputsSettings';
import './outputMocks.less';
import { Divider, Text } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

export interface MockUpdateEvent {
  id: string;
  actionResult: string;
}

export interface OutputMock {
  output: string;
  actionResult: string;
}

export type MockUpdateHandler = EventHandler<MockUpdateEvent>;

export interface OutputMocksProps {
  isMockSupported: boolean;
  nodeId: string;
  onMockUpdate: MockUpdateHandler;
  outputs: any[];
}

export const OutputMocks = ({ isMockSupported, nodeId, onMockUpdate, outputs }: OutputMocksProps) => {
  const intl = useIntl();
  console.log('charlie parseOutput', outputs);

  const intlText = {
    UNSUPPORTED_MOCKS: intl.formatMessage({
      defaultMessage:
        'This operation does not support mocking. Mocking is only supported for operations that are connected to a service provider, function, API connection, or API Management.',
      description: 'Unsupported message for mock results tab',
    }),
  };

  return isMockSupported ? (
    <>
      <ActionResult nodeId={nodeId} onMockUpdate={onMockUpdate} />
      <Divider style={{ padding: '16px 0px' }} />
      <OutputsSettings outputs={outputs} />
    </>
  ) : (
    <Text>{intlText.UNSUPPORTED_MOCKS}</Text>
  );
};
