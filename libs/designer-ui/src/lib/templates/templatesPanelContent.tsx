import { TabList, Tab, OverflowItem } from '@fluentui/react-components';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';

export interface TemplatesPanelContentProps {
  panelType: string;
  tabs: any[];
  selectedTab?: string;
  selectTab: (tabId: string) => void;
}
export const TemplatesPanelContent = ({ panelType, tabs = [], selectedTab, selectTab }: TemplatesPanelContentProps): JSX.Element => {
  const selectedTabId = selectedTab ?? tabs[0]?.id;

  const onTabSelected = (e?: SelectTabEvent, data?: SelectTabData): void => {
    if (data) {
      const itemKey = data.value as string;
      selectTab(itemKey);
    }
  };

  return (
    <div id={`msla-templates-panel-${panelType}`} className="msla-templates-panel">
      <TabList selectedValue={selectedTabId} onTabSelect={onTabSelected} style={{ margin: '0px -12px' }}>
        {tabs.map(({ id, visible, title }) =>
          visible ? (
            <OverflowItem key={id} id={id} priority={id === selectedTabId ? 2 : 1}>
              <Tab value={id} role={'tab'}>
                {title}
              </Tab>
            </OverflowItem>
          ) : null
        )}
      </TabList>
      <div className="msla-panel-content-container">{tabs.find((tab) => tab.id === selectedTabId)?.content}</div>
    </div>
  );
};
