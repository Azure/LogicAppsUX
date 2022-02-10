import React, { useState, useEffect } from 'react';

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
  tabs: Tab[];
  width: string;
  trackEvent(data: PageActionTelemetryData): void;
}

export const PanelContainer = ({ isCollapsed, isRight, tabs, width, trackEvent }: PanelContainerProps) => {
  const [selectedTab, setSelectedTab] = useState('');
  const onTabChange = (itemKey: string): void => {
    setSelectedTab(itemKey);
  };

  return (
    <div className="msla-resizable-panel-container">
      {/* TODO: 12799012 Panel header */}
      <Panel
        isOpen={true}
        headerText={'TODO: 12799012 Panel header'}
        type={isRight ? PanelType.custom : PanelType.customNear}
        customWidth={width}
      >
        <PanelPivot isCollapsed={isCollapsed} tabs={tabs} selectedTab={selectedTab} onTabChange={onTabChange} trackEvent={trackEvent} />
      </Panel>
    </div>
  );
};
