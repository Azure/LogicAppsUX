// app.stories.js|jsx|ts|tsx
import getMoreRunsData from '../../fixtures/get-more-runs.json';
import getRunData from '../../fixtures/get-run.json';
import getRunsData from '../../fixtures/get-runs.json';
import type { CallbackInfo } from '../../run-service/types';
import type { AppProps } from './app';
import { App } from './app';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import withMock from 'storybook-addon-mock';

export default {
  component: App,
  title: 'E2E/Overview',
  decorators: [withMock],
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

export const WithMockArgs = Template.bind({});

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

WithMockArgs.args = commonArgs;

WithMockArgs.parameters = {
  mockData: [
    {
      url: `https://baseurl/workflows/run/runs?api-version=apiversion`,

      method: 'GET',
      status: 200,
      delay: 800,
      response: getRunsData,
    },
    {
      url: getRunsData.nextLink,
      method: 'GET',
      status: 200,
      delay: 800,
      response: getMoreRunsData,
    },
    {
      url: callbackInfo.value,
      method: 'POST',
      status: 200,
      delay: 800,
      response: {},
    },
    {
      url: `https://baseurl/workflows/run/runs/:runId?api-version=apiversion`,
      method: 'GET',
      status: 200,
      delay: 800,
      response: getRunData,
    },
  ],
};
