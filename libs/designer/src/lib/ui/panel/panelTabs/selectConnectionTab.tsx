import constants from '../../../common/constants';
import type { PanelTab } from '@microsoft/designer-ui';
import { SelectConnection } from '@microsoft/designer-ui';

export const SelectConnectionTab = () => {
  return (
    <SelectConnection
      connections={[]}
      saveSelectionCallback={() => {
        console.log('TODO: Save connection selection, go back to params tab');
      }}
      cancelSelectionCallback={() => {
        console.log('TODO: Cancel connection selection, go back to params tab');
      }}
      createNewConnectionCallback={() => {
        console.log('TODO: Change to create new connection tab');
      }}
    />
  );
};

export const selectConnectionTab: PanelTab = {
  title: 'Select Connection',
  name: constants.PANEL_TAB_NAMES.SELECT_CONNECTION,
  description: 'Select Connection Tab',
  visible: true,
  content: <SelectConnectionTab />,
  order: 0,
};
