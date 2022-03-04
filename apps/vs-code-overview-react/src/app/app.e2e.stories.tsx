// app.stories.js|jsx|ts|tsx
import type { CallbackInfo } from '../run-service/types';
import type { AppProps } from './app';
import { App } from './app';
import type { ComponentMeta, ComponentStory } from '@storybook/react';

export default {
  component: App,
  title: 'ForTesting/Overview',
  decorators: [],
} as ComponentMeta<typeof App>;

const Template: ComponentStory<typeof App> = (args: AppProps) => {
  return <App {...args} />;
};

const callbackInfo: CallbackInfo = {
  value: 'testurl/callbackinfo',
};

const workflowProperties = {
  callbackInfo,
  name: 'run',
  stateType: 'Stateful',
};

export const E2E = Template.bind({});

const commonArgs = {
  workflowProperties,
  workflowId: 'workflowId',
  baseUrl: 'https://baseurl',
  apiVersion: 'apiversion',
  onOpenRun: () => console.log('open run'),
  getAccessToken: async () => {
    return 'accesstoken';
  },
};

E2E.args = commonArgs;
