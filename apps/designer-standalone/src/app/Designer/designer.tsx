import { SettingsBox } from '../../components/settings_box';
import type { RootState } from '../../state/store';
import { HttpClient } from './httpClient';
import {
  StandardConnectionService,
  StandardOperationManifestService,
  StandardSearchService,
} from '@microsoft-logic-apps/designer-client-services';
import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';
import { useSelector } from 'react-redux';

const httpClient = new HttpClient();
const connectionService = new StandardConnectionService({
  baseUrl: '/url',
  apiVersion: '2018-11-01',
  httpClient,
});
const operationManifestService = new StandardOperationManifestService({
  apiVersion: '2018-11-01',
  baseUrl: '/url',
  httpClient,
});
const searchService = new StandardSearchService();
export const DesignerWrapper = () => {
  const { workflowDefinition, readOnly, monitoringView } = useSelector((state: RootState) => state.workflowLoader);
  const designerProviderProps = {
    services: { connectionService, operationManifestService, searchService },
    readOnly,
    isMonitoringView: monitoringView,
  };

  return (
    <>
      <SettingsBox />
      <DesignerProvider locale="en-US" options={{ ...designerProviderProps }}>
        {workflowDefinition ? (
          <BJSWorkflowProvider workflow={workflowDefinition}>
            <Designer></Designer>
          </BJSWorkflowProvider>
        ) : null}
      </DesignerProvider>
    </>
  );
};
