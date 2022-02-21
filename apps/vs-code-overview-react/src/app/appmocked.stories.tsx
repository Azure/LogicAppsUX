// app.stories.js|jsx|ts|tsx

import type { ComponentMeta, ComponentStory } from '@storybook/react';
import type { CallbackInfo } from '../run-service/types';
import { App, AppProps } from './app';
import withMock from 'storybook-addon-mock';

import getRunsData from '../fixtures/get-runs.json';
import getRunData from '../fixtures/get-run.json';
import getMoreRunsData from '../fixtures/get-more-runs.json';

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
      url: `https://baseurl/workflowId/runs?api-version=apiversion`,

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
      url: `https://baseurl/:runId?api-version=apiversion`,
      method: 'GET',
      status: 200,
      delay: 800,
      response: getRunData,
    },
  ],
};
