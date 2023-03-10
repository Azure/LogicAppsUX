import constants from '../../../../common/constants';
import type { PanelTab } from '@microsoft/designer-ui';
import { StaticResult } from '@microsoft/designer-ui';

export const TestingPanel: React.FC = () => {
  return <StaticResult />;
};

export const testingTab: PanelTab = {
  title: 'Testing',
  name: constants.PANEL_TAB_NAMES.TESTING,
  description: 'Static Testing Tab',
  visible: true,
  content: <TestingPanel />,
  order: 0,
  icon: 'Info',
};
