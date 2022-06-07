import { SettingsBox } from '../../components/settings_box';
import type { RootState } from '../../state/store';
import { HttpClient } from './httpClient';
import type { DesignerOptionsContext } from '@microsoft/logic-apps-designer';
import { DesignerProvider, BJSWorkflowProvider, Designer, ProviderWrappedContext } from '@microsoft/logic-apps-designer';
import { useState } from 'react';
import { useSelector } from 'react-redux';

const httpClient = new HttpClient();
export const DesignerWrapper = () => {
  // This is temporary logic, lets us switch context values during testing
  const [readOnly, setReadOnly] = useState(false);
  const [isMonitoringView, setIsMonitoringView] = useState(false);

  const workflow = useSelector((state: RootState) => state.workflowLoader.workflowDefinition);
  const designerProviderProps: DesignerOptionsContext = {
    services: { httpClient },
    readOnly,
    toggleReadOnly: () => {
      setReadOnly(!readOnly);
    },
    isMonitoringView,
    toggleMonitoringView: () => {
      setIsMonitoringView(!isMonitoringView);
      if (!readOnly) setReadOnly(!readOnly);
    },
  };

  return (
    <>
      <ProviderWrappedContext.Provider value={designerProviderProps}>
        <SettingsBox />
      </ProviderWrappedContext.Provider>
      <DesignerProvider locale="en-US" options={{ ...designerProviderProps }}>
        {workflow ? (
          <BJSWorkflowProvider workflow={workflow}>
            <Designer></Designer>
          </BJSWorkflowProvider>
        ) : null}
      </DesignerProvider>
    </>
  );
};
