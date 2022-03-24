import { SettingsBox } from '../../components/settings_box';
import type { RootState } from '../../state/store';
import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';
import { useSelector } from 'react-redux';

export const DesignerWrapper = () => {
  const workflow = useSelector((state: RootState) => state.workflowLoader.workflowDefinition);
  return (
    <>
      <SettingsBox />
      <DesignerProvider locale="en-US" options={{}}>
        {workflow ? (
          <BJSWorkflowProvider workflow={workflow}>
            <Designer></Designer>
          </BJSWorkflowProvider>
        ) : null}
      </DesignerProvider>
    </>
  );
};
