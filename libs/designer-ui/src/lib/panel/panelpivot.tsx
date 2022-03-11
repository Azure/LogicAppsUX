import constants from '../constants';
import type { PageActionTelemetryData } from '../telemetry/models';
import type { PanelTab } from './panelUtil';
import type { IPivotStyles } from '@fluentui/react/lib/Pivot';
import { Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import React from 'react';
import { useIntl } from 'react-intl';

const pivotStyles: Partial<IPivotStyles> = {
  link: {
    margin: '1px 24px 1px 1px',
  },
  text: {
    '&:hover': {
      color: constants.PANEL_HIGHLIGHT_COLOR,
    },
  },
};
export interface CategoryPivotProps {
  isCollapsed: boolean;
  tabs: Record<string, PanelTab>;
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
        styles={pivotStyles}
        selectedKey={selectedTab}
        className="msla-panel-menu"
        onLinkClick={onTabSelected}
        overflowBehavior="menu"
        overflowAriaLabel={overflowLabel}
      >
        {Object.entries(tabs).map(([name, PanelTab]) => {
          return <PivotItem key={name} itemKey={name} headerText={PanelTab.title} />;
        })}
      </Pivot>
    </div>
  );
};
