import constants from '../../../common/constants';
import type { PanelTab } from '@microsoft/designer-ui';
import { MonitoringPanel } from '@microsoft/designer-ui';

export const MonitoringTab = () => {
  // TODO: Assign data here maybe
  return <MonitoringPanel />;
};

export const monitoringTab: PanelTab = {
  title: 'Monitoring',
  name: constants.PANEL_TAB_NAMES.MONITORING,
  description: 'Monitoring View Tab',
  visible: true,
  content: <MonitoringTab />,
  order: 0,
  icon: 'Info',
};
