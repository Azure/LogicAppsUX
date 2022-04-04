import { SettingsBox } from '../../components/settings_box';
import type { RootState } from '../../state/store';
import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';
import { useSelector } from 'react-redux';

export const DesignerWrapper = () => {
  const workflow = useSelector((state: RootState) => state.workflowLoader.workflowDefinition);
  const token = useSelector((state: RootState) => state.workflowLoader.armToken ?? '');

  const getToken = () => token;
  return (
    <>
      <SettingsBox />
      <DesignerProvider locale="en-US" options={{}}>
        {workflow ? (
          <BJSWorkflowProvider workflow={workflow} getToken={getToken}>
            <Designer></Designer>
          </BJSWorkflowProvider>
        ) : null}
      </DesignerProvider>
    </>
  );
};
