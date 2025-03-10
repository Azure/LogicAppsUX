import { TabList, Tab } from '@fluentui/react-components';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import type { TemplatePanelTab } from './model';
import { Dismiss12Filled } from '@fluentui/react-icons';

export interface TemplatesPanelContentProps {
  className?: string;
  tabs: TemplatePanelTab[];
  selectedTab?: string;
  selectTab: (tabId: string) => void;
}
export const TemplatesPanelContent = ({ tabs = [], selectedTab, selectTab, className }: TemplatesPanelContentProps): JSX.Element => {
  const selectedTabId = selectedTab ?? tabs[0]?.id;

  const selectedTabProps = tabs?.find((tab) => tab.id === selectedTabId);

  const onTabSelected = (e?: SelectTabEvent, data?: SelectTabData): void => {
    if (data) {
      const itemKey = data.value as string;
      selectTab(itemKey);
    }
  };

  const tabClass = className ?? 'msla-templates-panel-tabs';
  return (
    <div className="msla-templates-panel">
      {tabs.length > 1 && (
        <>
          <TabList selectedValue={selectedTabId} onTabSelect={onTabSelected} className={tabClass}>
            {tabs.map(({ id, title, disabled = false, hasError = false }) => (
              <Tab disabled={disabled} key={id} id={id} data-testid={id} className="msla-templates-panel-tabName" value={id} role={'tab'}>
                {hasError && (
                  <span className="msla-templates-panel-error-icon">
                    <Dismiss12Filled />
                  </span>
                )}
                {title}
              </Tab>
            ))}
          </TabList>
          {selectedTabProps?.description && <div className="msla-panel-content-description">{selectedTabProps?.description}</div>}
        </>
      )}
      <div className="msla-panel-content-container">{selectedTabProps?.content}</div>
    </div>
  );
};
