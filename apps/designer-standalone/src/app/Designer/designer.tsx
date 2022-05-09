import { SettingsBox } from '../../components/settings_box';
import type { RootState } from '../../state/store';
import type { DesignerOptionsContext } from '@microsoft/logic-apps-designer';
import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';
import { useCallback } from 'react';
import { useSelector } from 'react-redux';

const useGetToken = () => useSelector((state: RootState) => state.workflowLoader?.armToken ?? '');

export const DesignerWrapper = () => {
  const token = useGetToken();
  const getToken = useCallback(() => {
    return token;
  }, [token]);

  const workflow = useSelector((state: RootState) => state.workflowLoader.workflowDefinition);
  const designerProviderProps: DesignerOptionsContext = {
    getToken,
  };

  return (
    <>
      <SettingsBox />
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
