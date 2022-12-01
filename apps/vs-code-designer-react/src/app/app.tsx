import type { RootState } from '../state/Store';
import { VSCodeContext } from '../webviewCommunication';
import { DesignerCommandBar } from './DesignerCommandBar';
import { HttpClient } from './httpClient';
import { getDesignerServices } from './servicesHelper';
import { Theme } from '@microsoft-logic-apps/utils';
import { DesignerProvider, BJSWorkflowProvider, Designer, getTheme, useThemeObserver } from '@microsoft/logic-apps-designer';
import { useContext, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

const httpClient = new HttpClient();

export const App = () => {
  const vscodeState = useSelector((state: RootState) => state.designer);
  const { panelMetaData, connectionReferences, baseUrl, apiHubServiceDetails, readOnly, isLocal, callbackInfo, apiVersion } = vscodeState;
  const codelessApp = panelMetaData?.codelessApp;
  const vscode = useContext(VSCodeContext);
  const [theme, setTheme] = useState<Theme>(getTheme(document.body));

  useThemeObserver(document.body, theme, setTheme, {
    attributes: true,
  });

  const services = useMemo(() => {
    return getDesignerServices(baseUrl, apiVersion, httpClient, apiHubServiceDetails, isLocal, vscode);
  }, [baseUrl, apiVersion, apiHubServiceDetails, isLocal, vscode, callbackInfo]);

  return (
    <DesignerProvider
      locale="en-US"
      options={{
        isDarkMode: theme === Theme.Dark,
        readOnly,
        services: services,
      }}
    >
      {codelessApp ? (
        <BJSWorkflowProvider workflow={{ definition: codelessApp.definition, connectionReferences }}>
          {readOnly ? null : <DesignerCommandBar />}
          <Designer />
        </BJSWorkflowProvider>
      ) : null}
    </DesignerProvider>
  );
};
