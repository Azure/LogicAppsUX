import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { Tab } from '.';
import { EmptyContent } from '../card/cardv2/emptycontent';
import Constants from '../constants';
import { PageActionTelemetryData, UserAction } from '../telemetry/models';
import React from 'react';

export interface CategoryPivotProps {
  isCollapsed: boolean;
  tabs: Tab[];
  selectedTab?: string;
  onTabChange(tabName?: string): void;
  onCategoryClick?(item: PivotItem): void;
  trackEvent(data: PageActionTelemetryData): void;
}
export const PanelPivot = ({ isCollapsed, tabs, selectedTab, onTabChange, trackEvent }: CategoryPivotProps): JSX.Element => {
  const onTabSelected = (item?: PivotItem): void => {
    if (item) {
      const { itemKey } = item.props;
      trackEventHandler(isCollapsed, itemKey);
      onTabChange(itemKey);
    }
  };

  const trackEventHandler = (isCollapsed: boolean, itemKey?: string): void => {
    // TODO: 12799013 Panel root
    // trackEvent({
    //   action: UserAction.click,
    //   actionContext: {
    //     isCollapsed,
    //     itemKey,
    //   },
    //   controlId: Constants.TELEMETRY_IDENTIFIERS.PANEL_CONTAINER_TAB,
    // });
  };
  return (
    <div className="msla-pivot" style={{ overflow: 'hidden' }}>
      <Pivot
        selectedKey={selectedTab}
        className="msla-panel-select-card-container"
        onLinkClick={onTabSelected}
        overflowBehavior="menu"
        overflowAriaLabel="more panel tabs"
      >
        {tabs.map(({ itemKey, itemText }: Tab) => (
          <PivotItem key={itemKey} itemKey={itemKey} headerText={itemText} />
        ))}
      </Pivot>
    </div>
  );
};
