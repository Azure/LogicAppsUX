// valuespanel.stories.js|jsx|ts|tsx

import { DefaultButton, Panel, PanelType, ThemeProvider } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { ValuesPanel, ValuesPanelProps } from './index';

export default {
  component: ValuesPanel,
  title: 'Components/Monitoring/ValuesPanel',
  argTypes: {
    onLinkClick: {
      action: 'onLinkClick',
    },
    onMoreClick: {
      action: 'onMoreClick',
    },
  },
} as ComponentMeta<typeof ValuesPanel>;

const Template: ComponentStory<typeof ValuesPanel> = (args: ValuesPanelProps) => {
  const [isOpen, { setTrue: handleClick, setFalse: handleDismiss }] = useBoolean(false);

  return (
    <ThemeProvider>
      <DefaultButton text="Open panel" onClick={handleClick} />
      <Panel type={PanelType.medium} isOpen={isOpen} onDismiss={handleDismiss}>
        <div className="msla-monitoring-parameters-card-body">
          <ValuesPanel {...args} />
        </div>
      </Panel>
    </ThemeProvider>
  );
};

export const Inputs = Template.bind({});
Inputs.args = {
  headerText: 'Inputs',
  linkText: 'Show inputs',
  showLink: true,
  values: {
    method: {
      displayName: 'Method',
      value: 'POST',
    },
    uri: {
      displayName: 'URL',
      value: 'https://httpbin.org/post/',
    },
  },
};

export const Outputs = Template.bind({});
Outputs.args = {
  headerText: 'Outputs',
  linkText: 'Show outputs',
  showLink: true,
  values: {
    statusCode: {
      displayName: 'Status code',
      value: 200,
    },
    headers: {
      displayName: 'Headers',
      format: 'key-value-pairs',
      value: {
        Date: 'Fri, 28 Jan 2022 00:02:51 GMT',
        Expires: '-1',
        Pragma: 'no-cache',
        Vary: 'Accept-Encoding',
      },
    },
    body: {
      displayName: 'Body',
      value: {
        nextLink: '[REDACTED]',
        value: [],
      },
    },
  },
};

export const Properties = Template.bind({});
Properties.args = {
  headerText: 'Properties',
  values: {
    startTime: {
      displayName: 'Start time',
      format: 'date-time',
      value: '2022-02-04T22:58:19.000Z',
    },
    endTime: {
      displayName: 'End time',
      format: 'date-time',
      value: '2022-02-04T22:58:19.000Z',
    },
    status: {
      displayName: 'Status',
      value: 'Succeeded',
    },
    clientTrackingId: {
      displayName: 'Client tracking ID',
      value: '08585576093858769344449858342CU00',
    },
    actionTrackingId: {
      displayName: 'Action tracking ID',
      value: '99d0fd21-4d63-4b88-ab06-140b2b37e97d',
    },
  },
};
