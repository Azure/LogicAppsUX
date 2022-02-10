import React from 'react';

import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { PanelPivot } from './panelPivot';
import { PageActionTelemetryData } from '../telemetry/models';

export interface Tab {
  itemKey: string;
  itemText: string;
  content: JSX.Element;
}
export interface PanelContainerProps {
  isCollapsed: boolean;
  pivotDisabled?: boolean;
  isRight?: boolean;
  selectedTab?: string;
  tabs: Tab[];
  width: string;
  onTabChange(tabName?: string): void;
  trackEvent(data: PageActionTelemetryData): void;
}

export const PanelContainer = ({ isCollapsed, isRight, selectedTab, tabs, width, onTabChange, trackEvent }: PanelContainerProps) => {
  return (
    <div className="msla-resizable-panel-container">
      <Panel isOpen={true} headerText={'THE NEW PANEL! :)'} type={isRight ? PanelType.custom : PanelType.customNear} customWidth={width}>
        <PanelPivot isCollapsed={isCollapsed} tabs={tabs} selectedTab={selectedTab} onTabChange={onTabChange} trackEvent={trackEvent} />
      </Panel>
    </div>
  );
};
