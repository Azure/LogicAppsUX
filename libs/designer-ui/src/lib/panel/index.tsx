import React from 'react';
import { EmptyContent } from '../card/cardv2/emptycontent';
import { Panel } from '@fluentui/react/lib/Panel';
import { IPivotStyles, Pivot, PivotItem } from '@fluentui/react/lib/Pivot';
import { PageActionTelemetryData, UserAction } from '../telemetry/models';
import Constants from '../constants';

export interface PanelContainerProps {
  isCollapsed: boolean;
  isOpen?: boolean;
  noNodeSelected?: boolean;
  selectedTab?: string;
  tabs: JSX.Element[];
  onTabChange(tabName?: string): void;
  trackEvent(data: PageActionTelemetryData): void;
}

const pivotStyle: Partial<IPivotStyles> = {
  root: {
    display: 'none',
    height: '100%',
  },
};

export function PanelContainer({ isCollapsed, isOpen, noNodeSelected, selectedTab, tabs, onTabChange, trackEvent }: PanelContainerProps) {
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
  return (
    <div className="msla-resizable-panel-container">
      <Panel isOpen={isOpen}>
        {!noNodeSelected ? (
          <Pivot className="msla-panel-select-card-container" selectedKey={selectedTab} styles={pivotStyle} onLinkClick={onTabSelected}>
            {tabs}
          </Pivot>
        ) : (
          <EmptyContent />
        )}
      </Panel>
    </div>
  );
}
