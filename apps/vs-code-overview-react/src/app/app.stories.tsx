// app.stories.js|jsx|ts|tsx

import { AzureThemeDark, AzureThemeLight } from '@fluentui/azure-themes';
import { ThemeProvider, Toggle } from '@fluentui/react';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import { useCallback, useState } from 'react';
import { RunService } from '../run-service/index';
import type { CallbackInfo } from '../run-service/types';
import { App, AppProps } from './app';

export default {
  component: App,
  title: 'E2E/Overview',
} as ComponentMeta<typeof App>;

export const E2E: ComponentStory<typeof App> = (args: AppProps) => {
  const [theme, setTheme] = useState(AzureThemeLight);

  const handleChange = useCallback(() => {
    setTheme(theme === AzureThemeDark ? AzureThemeLight : AzureThemeDark);
  }, [theme]);

  return (
    <ThemeProvider theme={theme}>
      <Toggle label="Dark mode" checked={theme === AzureThemeDark} onChange={handleChange} />
      <App {...args} />
    </ThemeProvider>
  );
};

class MockRunService extends RunService {
  async getMoreRuns(_: string) {
    return import('../fixtures/get-more-runs.json');
  }

  async getRuns(_: string) {
    return import('../fixtures/get-runs.json');
  }

  async getRun(_: string) {
    return import('../fixtures/get-run.json');
  }

  async runTrigger(_: CallbackInfo) {
    return {};
  }

  async verifyRunId(_: string) {
    return import('../fixtures/get-run.json');
  }
}

const callbackInfo: CallbackInfo = {
  value:
    'https://13065281-standard.azurewebsites.net:443/api/run/triggers/manual/invoke?api-version=2020-05-01-preview&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=oJOcuEO2R0ki0UA02ltRt-7Hjb6zc_GfWg4KNJKH37k',
};

const service = new MockRunService({
  apiVersion: '2018-11-01',
  baseUrl:
    'https://management.azure.com/subscriptions/f42cebc2-7290-432b-87ba-46487684bdb0/resourceGroups/joechung-eastus/providers/Microsoft.Web/sites/13065281-standard/hostruntime/runtime/webhooks/workflow/api/management',
  getAccessToken: async () => 'Bearer [REDACTED]',
});

const workflowProperties = {
  callbackInfo,
  name: 'run',
  stateType: 'Stateful',
};

E2E.args = {
  workflowProperties,
  listMoreRuns: (continuationToken) => {
    return service.getMoreRuns(continuationToken);
  },
  listRuns: () => {
    return service.getRuns(`/workflows/${workflowProperties.name}`);
  },
  runTrigger: () => {
    return service.runTrigger(callbackInfo);
  },
  verifyRunId: (runName) => {
    const runId = `/workflows/${workflowProperties.name}/runs/${runName}`;
    return service.getRun(runId);
  },
  onOpenRun: (run) => {
    console.log('onOpenRun', run);
  },
};
