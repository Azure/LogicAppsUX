import type { RootState } from '../state/Store';
import { DesignerCommandBar } from './DesignerCommandBar';
import { getDesignerServices } from './servicesHelper';
import { DesignerProvider, BJSWorkflowProvider, Designer, getTheme, useThemeObserver } from '@microsoft/logic-apps-designer';
import { Theme } from '@microsoft/utils-logic-apps';
import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

export const App = () => {
  const vscodeState = useSelector((state: RootState) => state.designer);
  const { panelMetaData, connectionReferences, baseUrl, apiHubServiceDetails, readOnly, isLocal, apiVersion, isMonitoringView } =
    vscodeState;
  const codelessApp = panelMetaData?.codelessApp;
  const [theme, setTheme] = useState<Theme>(getTheme(document.body));

  useThemeObserver(document.body, theme, setTheme, {
    attributes: true,
  });

  const services = useMemo(() => {
    return getDesignerServices(baseUrl, apiVersion, apiHubServiceDetails, isLocal);
  }, [baseUrl, apiVersion, apiHubServiceDetails, isLocal]);

  return (
    <DesignerProvider
      locale="en-US"
      options={{
        isDarkMode: theme === Theme.Dark,
        readOnly,
        isMonitoringView,
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
