import React, { useState } from 'react';

import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { PanelPivot } from './panelpivot';
import { PanelContent } from './panelcontent';
import { PageActionTelemetryData } from '../telemetry/models';
export interface PanelTab {
  name: string;
  title: string;
  description?: string;
  icon?: string;
  enabled?: boolean;
  order?: number;
  content: JSX.Element;
  visibilityPredicate?(): boolean;
}
export interface PanelContainerProps {
  isCollapsed: boolean;
  pivotDisabled?: boolean;
  isRight?: boolean;
  tabs: PanelTab[];
  selectedTab: string;
  width: string;
  trackEvent(data: PageActionTelemetryData): void;
  setSelectedTab: React.Dispatch<React.SetStateAction<string>>;
}

export const PanelContainer = ({ isCollapsed, isRight, tabs, selectedTab, width, setSelectedTab, trackEvent }: PanelContainerProps) => {
  const onTabChange = (itemKey: string): void => {
    console.log(itemKey);
    setSelectedTab(itemKey);
  };

  return (
    <div className="msla-resizable-panel-container">
      {/* TODO: 12799012 Panel header */}
      <Panel
        isOpen
        headerText={'TODO: 12799012 Panel header'}
        isBlocking={false}
        hasCloseButton={false}
        type={isRight ? PanelType.custom : PanelType.customNear}
        customWidth={width}
      >
        {isCollapsed ? (
          <div />
        ) : (
          <>
            <PanelPivot isCollapsed={isCollapsed} tabs={tabs} selectedTab={selectedTab} onTabChange={onTabChange} trackEvent={trackEvent} />
            <PanelContent tabs={tabs} selectedTab={selectedTab} />
          </>
        )}
      </Panel>
    </div>
  );
};
