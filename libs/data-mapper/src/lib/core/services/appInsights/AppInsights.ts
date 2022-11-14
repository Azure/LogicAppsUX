import { ReactPlugin } from '@microsoft/applicationinsights-react-js';
import { ApplicationInsights } from '@microsoft/applicationinsights-web';

const reactPlugin = new ReactPlugin();
const appInsights = new ApplicationInsights({
  config: {
    connectionString:
      'InstrumentationKey=19a4f2b3-bf0a-4a6b-bd56-aa9d2cd85a75;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/',
    enableAutoRouteTracking: true, // Shouldn't matter either way with DM as it's an SPA
    extensions: [reactPlugin],
  },
});

appInsights.loadAppInsights();

export default reactPlugin;
