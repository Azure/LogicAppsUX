import { DesignerProvider, BJSWorkflowProvider, Designer } from '@microsoft/logic-apps-designer';
import { useSelector } from 'react-redux';
import { SettingsBox } from '../../components/settings_box';
import { RootState } from '../../state/store';

export const DesignerWrapper = () => {
  const workflow = useSelector((state: RootState) => state.workflowLoader.workflowDefinition);
  return (
    <>
      <SettingsBox />
      <DesignerProvider locale="en-US">
        {workflow ? (
          <BJSWorkflowProvider workflow={workflow}>
            <Designer></Designer>
          </BJSWorkflowProvider>
        ) : null}
      </DesignerProvider>
    </>
  );
};
