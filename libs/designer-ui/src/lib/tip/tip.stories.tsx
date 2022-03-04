import type { TipProps } from './index';
import { Tip } from './index';
import { DefaultButton } from '@fluentui/react';
import { useBoolean, useId } from '@fluentui/react-hooks';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: Tip,
  title: 'Components/Tip',
} as ComponentMeta<typeof Tip>;

const props = {
  'implicit-foreach': {
    items: [
      {
        children: 'Got it',
        iconProps: {
          iconName: 'CheckMark',
        },
        key: 'got-it',
        onClick: () => {
          global.alert('Got it!');
        },
      },
      {
        children: `Do not show again`,
        iconProps: {
          iconName: 'Cancel',
        },
        key: 'dont-show-again',
        onClick: () => {
          global.alert(`Do not show again`);
        },
      },
    ],
    message: (
      <div>
        Based on the output parameter you selected, we have added a <strong>For each</strong> for you. <strong>For each</strong> enables you
        to perform actions for each individual item in a set of values.
      </div>
    ),
  },
  'queue-trigger': {
    items: [
      {
        children: 'Got it',
        iconProps: {
          iconName: 'CheckMark',
        },
        key: 'got-it',
        onClick: () => {
          global.alert('Got it!');
        },
      },
      {
        children: `Do not show again`,
        iconProps: {
          iconName: 'Cancel',
        },
        key: 'dont-show-again',
        onClick: () => {
          global.alert(`Do not show again`);
        },
      },
    ],
    message: (
      <div>
        Queue triggers will <em>not</em> dequeue items from queues.
      </div>
    ),
  },
  'request-trigger': {
    items: [
      {
        children: 'Got it',
        iconProps: {
          iconName: 'CheckMark',
        },
        key: 'got-it',
        onClick: () => {
          global.alert('Got it!');
        },
      },
      {
        children: `Do not show again`,
        iconProps: {
          iconName: 'Cancel',
        },
        key: 'dont-show-again',
        onClick: () => {
          global.alert(`Do not show again`);
        },
      },
    ],
    message: (
      <div>
        Remember to include a Content-Type header set to <strong>application/json</strong> in your request.
      </div>
    ),
  },
  'response-without-request': {
    items: [
      {
        children: 'Got it',
        iconProps: {
          iconName: 'CheckMark',
        },
        key: 'got-it',
        onClick: () => {
          global.alert('Got it!');
        },
      },
      {
        children: `Do not show again`,
        iconProps: {
          iconName: 'Cancel',
        },
        key: 'dont-show-again',
        onClick: () => {
          global.alert(`Do not show again`);
        },
      },
    ],
    message: (
      <div>
        Be sure to replace your existing trigger with a Request trigger. Response actions should only be added to workflows with a Request
        trigger.
      </div>
    ),
  },
  'service-bus-action': {
    items: [
      {
        children: 'Add Parse JSON',
        iconProps: {
          iconName: 'Add',
        },
        key: 'add-parse-json',
        onClick: () => {
          global.alert('Add Parse JSON');
        },
      },
      {
        children: `Do not show again`,
        iconProps: {
          iconName: 'Cancel',
        },
        key: 'dont-show-again',
        onClick: () => {
          global.alert(`Do not show again`);
        },
      },
    ],
    message: (
      <div>
        Are you expecting a JSON object? Use the <strong>Parse JSON</strong> action to get friendly outputs.
      </div>
    ),
  },
};

const Template: ComponentStory<typeof Tip> = (args: TipProps) => {
  const buttonId = useId('callout-button');
  const [isCalloutVisible, { toggle: toggleIsCalloutVisible }] = useBoolean(false);

  return (
    <div>
      <DefaultButton id={buttonId} onClick={toggleIsCalloutVisible}>
        See example
      </DefaultButton>
      {isCalloutVisible && <Tip {...args} target={buttonId} onDismiss={toggleIsCalloutVisible} />}
    </div>
  );
};

export const ImplicitForEach = Template.bind({});
ImplicitForEach.args = {
  ...props['implicit-foreach'],
};

export const QueueTrigger = Template.bind({});
QueueTrigger.args = {
  ...props['queue-trigger'],
};

export const RequestTrigger = Template.bind({});
RequestTrigger.args = {
  ...props['request-trigger'],
};

export const ResponseWithoutRequest = Template.bind({});
ResponseWithoutRequest.args = {
  ...props['response-without-request'],
};

export const ServiceBusAction = Template.bind({});
ServiceBusAction.args = {
  ...props['service-bus-action'],
};
