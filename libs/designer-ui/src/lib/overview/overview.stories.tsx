// overview.stories.js|jsx|ts|tsx

import type { ComponentMeta, ComponentStory } from '@storybook/react';
import { Overview, OverviewProps } from './index';

export default {
  component: Overview,
  title: 'Components/Overview',
} as ComponentMeta<typeof Overview>;

export const Standard: ComponentStory<typeof Overview> = (args: OverviewProps) => {
  return <Overview {...args} />;
};

Standard.args = {
  corsNotice: 'To view runs, set "*" to allowed origins in the CORS setting.',
  errorMessage: '504 GatewayTimeout',
  hasMoreRuns: true,
  loading: false,
  runItems: [
    {
      duration: '1s',
      id: '/workflows/run/versions/08585581919959304835',
      identifier: '08585581919959304835',
      startTime: '2022-02-04T17:58:19.6012324Z',
      status: 'Succeeded',
    },
  ],
  workflowProperties: {
    callbackInfo: {
      value: '[REDACTED]',
    },
    name: 'run',
    operationOptions: 'WithStatelessRunHistory',
    stateType: 'Stateless',
  },
};
