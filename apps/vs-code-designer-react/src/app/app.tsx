import type { RootState } from '../state/Store';
import { VSCodeContext } from '../webviewCommunication';
import { DesignerCommandBar } from './DesignerCommandBar';
import { getDesignerServices } from './servicesHelper';
import { convertConnectionsDataToReferences } from './utilities/workflow';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import { DesignerProvider, BJSWorkflowProvider, Designer, getTheme, useThemeObserver } from '@microsoft/logic-apps-designer';
import { Theme } from '@microsoft/utils-logic-apps';
import { useContext, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

export const App = () => {
  const vscode = useContext(VSCodeContext);
  const vscodeState = useSelector((state: RootState) => state.designer);
  const { panelMetaData, connectionData, baseUrl, apiHubServiceDetails, readOnly, isLocal, apiVersion, tenantId } = vscodeState;

  const standardApp = panelMetaData?.standardApp;
  const appSettings = useMemo(() => {
    return panelMetaData?.localSettings ?? {};
  }, [panelMetaData?.localSettings]);

  const [theme, setTheme] = useState<Theme>(getTheme(document.body));

  useThemeObserver(document.body, theme, setTheme, {
    attributes: true,
  });

  const services = useMemo(() => {
    return getDesignerServices(baseUrl, apiVersion, apiHubServiceDetails, tenantId, isLocal, connectionData, appSettings, vscode);
  }, [baseUrl, apiVersion, apiHubServiceDetails, tenantId, isLocal, connectionData, vscode, appSettings]);

  const connectionReferences: ConnectionReferences = useMemo(() => {
    return convertConnectionsDataToReferences(connectionData);
  }, [connectionData]);

  return (
    <DesignerProvider
      locale="en-US"
      options={{
        isDarkMode: theme === Theme.Dark,
        readOnly,
        services: services,
      }}
    >
      {standardApp ? (
        <BJSWorkflowProvider workflow={{ definition: standardApp.definition, connectionReferences }}>
          {readOnly ? null : <DesignerCommandBar />}
          <Designer />
        </BJSWorkflowProvider>
      ) : null}
    </DesignerProvider>
  );
};
