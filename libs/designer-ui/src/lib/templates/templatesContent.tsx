import { TabList, Tab, Text, tokens } from '@fluentui/react-components';
import type { SelectTabData, SelectTabEvent } from '@fluentui/react-components';
import type { TemplateTabProps, TemplateTabStatusType } from './model';
import { CheckmarkCircleFilled, CircleHintHalfVerticalFilled, DismissCircleFilled } from '@fluentui/react-icons';

export interface TemplateContentProps {
  containerClassName?: string;
  className?: string;
  tabs: TemplateTabProps[];
  selectedTab?: string;
  selectTab: (tabId: string) => void;
}
export const TemplateContent = ({
  tabs = [],
  selectedTab,
  selectTab,
  className,
  containerClassName,
}: TemplateContentProps): JSX.Element => {
  const selectedTabId = selectedTab ?? tabs[0]?.id;
  const selectedTabProps = tabs?.find((tab) => tab.id === selectedTabId);

  const onTabSelected = (_e?: SelectTabEvent, data?: SelectTabData): void => {
    if (data) {
      const itemKey = data.value as string;
      selectTab(itemKey);
    }
  };

  const tabClass = className ?? 'msla-templates-panel-tabs';

  return (
    <div className={containerClassName ?? 'msla-templates-panel'}>
      {tabs.length > 1 && (
        <>
          <TabList selectedValue={selectedTabId} onTabSelect={onTabSelected} className={tabClass}>
            {tabs.map(({ id, title, onTabClick = () => {}, disabled = false, tabStatusIcon }) => (
              <Tab
                disabled={disabled}
                key={id}
                id={id}
                data-testid={id}
                className="msla-templates-panel-tabName"
                value={id}
                role={'tab'}
                icon={TabStatusIcon(tabStatusIcon)}
                onClick={onTabClick}
              >
                {title}
              </Tab>
            ))}
          </TabList>
          {selectedTabProps?.description && <Text className="msla-panel-content-description">{selectedTabProps?.description}</Text>}
        </>
      )}
      <div className="msla-panel-content-container">{selectedTabProps?.content}</div>
    </div>
  );
};

const TabStatusIcon = (iconName: TemplateTabStatusType) => {
  switch (iconName) {
    case 'error':
      return <DismissCircleFilled color={tokens.colorStatusDangerForeground1} />;
    case 'success':
      return <CheckmarkCircleFilled color={tokens.colorPaletteGreenBackground3} />;
    case 'in-progress':
      return <CircleHintHalfVerticalFilled />;
    default:
      return null;
  }
};
