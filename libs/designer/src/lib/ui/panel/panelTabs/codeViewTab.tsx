import constants from '../../../common/constants';
import type { PanelTab } from '@microsoft/designer-ui';
import { Peek } from '@microsoft/designer-ui';

export const CodeViewTab = () => {
  return <Peek input={'{\n"test": true,\n"test2" : \n\t{\n\t\t"object" : "value"\n\t}\n}'} />;
};

export const codeViewTab: PanelTab = {
  title: 'Code View',
  name: constants.PANEL_TAB_NAMES.CODE_VIEW,
  description: 'Code View Tab',
  enabled: true,
  content: <CodeViewTab />,
  order: 1,
  icon: 'Info',
};
