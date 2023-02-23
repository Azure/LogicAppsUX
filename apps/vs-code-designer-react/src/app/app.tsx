import type { RootState } from '../state/Store';
import { VSCodeContext } from '../webviewCommunication';
import { DesignerCommandBar } from './DesignerCommandBar';
import { getDesignerServices } from './servicesHelper';
import { DesignerProvider, BJSWorkflowProvider, Designer, getTheme, useThemeObserver } from '@microsoft/logic-apps-designer';
import { Theme } from '@microsoft/utils-logic-apps';
import { useContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

export const App = () => {
  const vscodeState = useSelector((state: RootState) => state.designer);
  const { panelMetaData, connectionReferences, baseUrl, apiHubServiceDetails, readOnly, isLocal, apiVersion, isMonitoringView, runId } =
    vscodeState;
  const codelessApp = panelMetaData?.codelessApp;
  const [theme, setTheme] = useState<Theme>(getTheme(document.body));
  const vscode = useContext(VSCodeContext);
  const [runInstance, setRunInstance] = useState({});

  useThemeObserver(document.body, theme, setTheme, {
    attributes: true,
  });

  const services = useMemo(() => {
    return getDesignerServices(baseUrl, apiVersion, apiHubServiceDetails, isLocal, vscode);
  }, [baseUrl, apiVersion, apiHubServiceDetails, isLocal]);

  useEffect(() => {
    async function getRunInstance() {
      if (isMonitoringView && runId) {
        setRunInstance(await services.runService.getRun(runId));
      }
    }
    getRunInstance();
  }, [isMonitoringView, runId, services]);

  console.log(runInstance);

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
          {readOnly ? null : <DesignerCommandBar isMonitoringView />}
          <Designer />
        </BJSWorkflowProvider>
      ) : null}
    </DesignerProvider>
  );
};
