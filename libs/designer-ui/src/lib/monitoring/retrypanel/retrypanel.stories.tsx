// retrypanel.stories.js|jsx|ts|tsx

import { DefaultButton, Panel, PanelType } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { RetryPanel, RetryPanelProps } from './index';

export default {
  component: RetryPanel,
  title: 'Components/Monitoring/RetryPanel',
} as ComponentMeta<typeof RetryPanel>;

export const Standard: ComponentStory<typeof RetryPanel> = (args: RetryPanelProps) => {
  const [isOpen, { setTrue: handleClick, setFalse: handleDismiss }] = useBoolean(false);

  return (
    <>
      <DefaultButton text="Open panel" onClick={handleClick} />
      <Panel isOpen={isOpen} type={PanelType.medium} onDismiss={handleDismiss}>
        <RetryPanel {...args} />
      </Panel>
    </>
  );
};

Standard.args = {
  retryHistories: [
    {
      clientRequestId: 'a0b2b0fe-1be6-4640-8948-ab0ed223436a',
      code: 'Failed',
      endTime: '2017-10-06T22:51:00Z',
      error: {
        code: 'Error code',
        message: 'Error message',
      },
      serviceRequestId: 'd0c70b52-023f-4104-8865-3ce991addf3f',
      startTime: '2017-10-06T22:46:00Z',
    },
    {
      clientRequestId: '9bd6fec3-a1ad-428d-a198-391d0117dc20',
      code: 'Succeeded',
      endTime: '2017-10-06T22:52:00Z',
      serviceRequestId: 'd273e6f9-a10c-48f1-a91d-0b69f9705ce9',
      startTime: '2017-10-06T22:51:01Z',
    },
  ],
};
