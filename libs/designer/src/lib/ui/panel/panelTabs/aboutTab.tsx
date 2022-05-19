import constants from '../../../common/constants';
import type { PanelTab } from '@microsoft/designer-ui';
import { About } from '@microsoft/designer-ui';

export const AboutTab = () => {
  // TODO: Retrieve logic from a redux store?
  const descriptionDocumentation = { url: 'www.microsoft.com', description: 'more info' };
  const headerIcons = [
    { title: 'Tag1', badgeText: 'test' },
    { title: 'Tag2', badgeText: 'more' },
  ];
  return (
    <About
      connectorDisplayName="Node Name"
      description="description "
      descriptionDocumentation={descriptionDocumentation}
      headerIcons={headerIcons}
    />
  );
};

export const aboutTab: PanelTab = {
  title: 'About',
  name: constants.PANEL_TAB_NAMES.ABOUT,
  description: 'Request History',
  enabled: true,
  content: <AboutTab />,
  order: 0,
  icon: 'Info',
};
