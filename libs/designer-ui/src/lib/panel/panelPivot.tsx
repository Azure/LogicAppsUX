import { IPivotStyles, Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { EmptyContent } from '../card/cardv2/emptycontent';
import { PageActionTelemetryData, UserAction } from '../telemetry/models';
import Constants from '../constants';
import { Tab } from './';
import React from 'react';

export interface CategoryPivotProps {
  isCollapsed: boolean;
  tabs: Tab[];
  disabled?: boolean;
  selectedTab?: string;
  onTabChange(tabName?: string): void;
  onCategoryClick?(item: PivotItem): void;
  trackEvent(data: PageActionTelemetryData): void;
}

export const PanelPivot = ({
  isCollapsed,
  tabs,
  selectedTab,
  disabled = false,
  onTabChange,
  trackEvent,
  ...props
}: CategoryPivotProps): JSX.Element => {
  const onTabSelected = (item?: PivotItem): void => {
    if (item) {
      const { itemKey } = item.props;

      trackEventHandler(isCollapsed, itemKey);

      onTabChange(itemKey);
    }
  };

  const trackEventHandler = (isCollapsed: boolean, itemKey?: string): void => {
    trackEvent({
      action: UserAction.click,
      actionContext: {
        isCollapsed,
        itemKey,
      },
      controlId: Constants.TELEMETRY_IDENTIFIERS.PANEL_CONTAINER_TAB,
    });
  };
  if (!selectedTab) {
    return <EmptyContent />;
  }
  return (
    <div className="msla-pivot">
      <Pivot className="msla-panel-select-card-container" onLinkClick={onTabSelected} overflowBehavior="menu">
        {tabs.map(({ itemKey, itemText }: Tab) => (
          <PivotItem key={itemKey} itemKey={itemKey} headerText={itemText} />
        ))}
      </Pivot>
    </div>
  );
};
