import type { PanelTab } from '.';
import type { PageActionTelemetryData } from '../telemetry/models';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import React from 'react';
import { useIntl } from 'react-intl';

export interface CategoryPivotProps {
  isCollapsed: boolean;
  tabs: PanelTab[];
  selectedTab?: string;
  onTabChange(tabName?: string): void;
  onCategoryClick?(item: PivotItem): void;
  trackEvent(data: PageActionTelemetryData): void;
}
export const PanelPivot = ({ isCollapsed, tabs, selectedTab, onTabChange, trackEvent }: CategoryPivotProps): JSX.Element => {
  const intl = useIntl();
  const onTabSelected = (item?: PivotItem): void => {
    if (item) {
      const { itemKey } = item.props;
      trackEventHandler(isCollapsed, itemKey);
      onTabChange(itemKey);
    }
  };

  const trackEventHandler = (isCollapsed: boolean, itemKey?: string): void => {
    // TODO: 12798935 Analytics (event logging)
  };
  const overflowLabel = intl.formatMessage({
    defaultMessage: 'more panels',
    description: 'This is a label to access the overflowed panels',
  });
  return (
    <div className="msla-pivot">
      <Pivot
        selectedKey={selectedTab}
        className="msla-panel-menu"
        onLinkClick={onTabSelected}
        overflowBehavior="menu"
        overflowAriaLabel={overflowLabel}
      >
        {tabs.map(({ name, title }: PanelTab) => (
          <PivotItem key={name} itemKey={name} headerText={title} />
        ))}
      </Pivot>
    </div>
  );
};
