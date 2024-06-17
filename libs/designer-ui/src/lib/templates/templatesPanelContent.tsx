import { Icon, css } from '@fluentui/react';
import { TabList, Tab, Text } from '@fluentui/react-components';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import type { TemplatePanelTab } from './templatePanelUtil';

export interface TemplatesPanelContentProps {
  panelType: string;
  isSequence?: boolean;
  tabs: TemplatePanelTab[];
  selectedTab?: string;
  selectTab: (tabId: string) => void;
}
export const TemplatesPanelContent = ({
  panelType,
  isSequence = true,
  tabs = [],
  selectedTab,
  selectTab,
}: TemplatesPanelContentProps): JSX.Element => {
  const selectedTabId = selectedTab ?? tabs[0]?.id;
  const selectedTabOrder = tabs?.find((tab) => tab.id === selectedTabId)?.order ?? 0;

  const onTabSelected = (e?: SelectTabEvent, data?: SelectTabData): void => {
    if (data) {
      const itemKey = data.value as string;
      selectTab(itemKey);
    }
  };

  return (
    <div id={`msla-templates-panel-${panelType}`} className="msla-templates-panel">
      <TabList selectedValue={selectedTabId} onTabSelect={onTabSelected} style={{ margin: '0px -12px' }}>
        {tabs.map(({ id, visible, title, order }, index) =>
          visible ? (
            <Tab
              key={id}
              id={id}
              className={css('msla-templates-panel-tabName', id === selectedTabId && 'selected')}
              value={id}
              role={'tab'}
              disabled={isSequence ? order > selectedTabOrder : selectedTab !== id}
            >
              {isSequence && (
                <Text className="msla-templates-panel-tabName-index">
                  {order < selectedTabOrder ? <Icon iconName="accept" /> : index + 1}
                </Text>
              )}
              <Text className="msla-templates-panel-tabName-title">{title}</Text>
            </Tab>
          ) : null
        )}
      </TabList>
      <div className="msla-panel-content-container">{tabs.find((tab) => tab.id === selectedTabId)?.content}</div>
    </div>
  );
};
