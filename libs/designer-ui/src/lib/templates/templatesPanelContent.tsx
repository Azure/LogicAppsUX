import { css } from '@fluentui/react';
import { TabList, Tab, Text } from '@fluentui/react-components';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import type { TemplatePanelTab } from './model';
import { Checkmark12Filled, Dismiss12Filled } from '@fluentui/react-icons';

export interface TemplatesPanelContentProps {
  className?: string;
  isSequence: boolean;
  tabs: TemplatePanelTab[];
  selectedTab?: string;
  selectTab: (tabId: string) => void;
}
export const TemplatesPanelContent = ({
  isSequence = true,
  tabs = [],
  selectedTab,
  selectTab,
  className,
}: TemplatesPanelContentProps): JSX.Element => {
  const selectedTabId = selectedTab ?? tabs[0]?.id;

  const selectedTabProps = tabs?.find((tab) => tab.id === selectedTabId);
  const selectedTabOrder = selectedTabProps?.order ?? 0;

  const onTabSelected = (e?: SelectTabEvent, data?: SelectTabData): void => {
    if (data) {
      const itemKey = data.value as string;
      selectTab(itemKey);
    }
  };

  const tabClass = className ?? 'msla-template-panel-tabs';
  return (
    <div className="msla-templates-panel">
      <TabList selectedValue={selectedTabId} onTabSelect={onTabSelected} className={tabClass}>
        {tabs.map(({ id, title, order, hasError = false }, index) => (
          <Tab
            key={id}
            id={id}
            data-testid={id}
            className={css(
              'msla-templates-panel-tabName',
              id === selectedTabId ? 'selected' : order < selectedTabOrder && (hasError ? 'error' : 'completed')
            )}
            value={id}
            role={'tab'}
          >
            {isSequence && (
              <Text className="msla-templates-panel-tabName-index">
                {order < selectedTabOrder ? hasError ? <Dismiss12Filled /> : <Checkmark12Filled /> : index + 1}
              </Text>
            )}
            <Text className="msla-templates-panel-tabName-title">{title}</Text>
          </Tab>
        ))}
      </TabList>
      {selectedTabProps?.description && <div className="msla-panel-content-description">{selectedTabProps?.description}</div>}
      <div className="msla-panel-content-container">{selectedTabProps?.content}</div>
    </div>
  );
};
