import { ReactPlugin } from '@microsoft/applicationinsights-react-js';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

export const reactPlugin = new ReactPlugin();

const appInsights = new ApplicationInsights({
  config: {
    connectionString: process.env.NX_AI_CON_STR,
    enableAutoRouteTracking: true, // Shouldn't matter either way with DM as it's an SPA
    extensions: [reactPlugin as any],
  },
});

// Don't bother loading AI if we don't have a connection string
if (process.env.NX_AI_CON_STR) {
  appInsights.loadAppInsights();
}

export default appInsights;
