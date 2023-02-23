import type { RootState } from '../state/Store';
import { VSCodeContext } from '../webviewCommunication';
import { DesignerCommandBar } from './DesignerCommandBar';
import { getDesignerServices } from './servicesHelper';
import { DesignerProvider, BJSWorkflowProvider, Designer, getTheme, useThemeObserver } from '@microsoft/logic-apps-designer';
import { Theme } from '@microsoft/utils-logic-apps';
import { useContext, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

export const App = async () => {
  const vscodeState = useSelector((state: RootState) => state.designer);
  const { panelMetaData, connectionReferences, baseUrl, apiHubServiceDetails, readOnly, isLocal, apiVersion, isMonitoringView, runId } =
    vscodeState;
  const codelessApp = panelMetaData?.codelessApp;
  const [theme, setTheme] = useState<Theme>(getTheme(document.body));
  const vscode = useContext(VSCodeContext);

  useThemeObserver(document.body, theme, setTheme, {
    attributes: true,
  });

  const services = useMemo(() => {
    return getDesignerServices(baseUrl, apiVersion, apiHubServiceDetails, isLocal, vscode);
  }, [baseUrl, apiVersion, apiHubServiceDetails, isLocal]);

  if (isMonitoringView && runId) {
    const runInstance = await services.runService.getRun(runId);
    console.log(runInstance);
  }

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
