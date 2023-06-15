import { Panel, PanelType } from '@fluentui/react';
import { PanelLocation } from '@microsoft/designer-ui';
import { useState } from 'react';

interface ChatbotProps {
  panelLocation?: PanelLocation;
}

export const Chatbot = ({ panelLocation = PanelLocation.Left }: ChatbotProps) => {
  const [collapsed] = useState(false);
  return (
    <Panel
      type={panelLocation === PanelLocation.Right ? PanelType.custom : PanelType.customNear}
      isOpen={!collapsed}
      customWidth={'300px'}
      hasCloseButton={false}
      isBlocking={false}
      layerProps={{ styles: { root: { zIndex: 0 } } }}
    >
      <p>Content goes here.</p>
    </Panel>
  );
};
