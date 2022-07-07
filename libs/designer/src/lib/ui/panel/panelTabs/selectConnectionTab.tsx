import constants from '../../../common/constants';
import type { PanelTab } from '@microsoft/designer-ui';
import { SelectConnection } from '@microsoft/designer-ui';

export const selectConnectionTab: PanelTab = {
  title: 'Select Connection',
  name: constants.PANEL_TAB_NAMES.SELECT_CONNECTION,
  description: 'Select Connection Tab',
  visible: true,
  content: <SelectConnection />,
  order: 0,
};
