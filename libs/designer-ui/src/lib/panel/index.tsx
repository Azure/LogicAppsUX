import React from 'react';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { PanelPivot } from './panelpivot';
import { PanelContent } from './panelcontent';
import { PanelHeader } from './panelheader';
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
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PanelContainer = ({
  isCollapsed,
  isRight,
  tabs,
  selectedTab,
  width,
  setSelectedTab,
  setIsCollapsed,
  trackEvent,
}: PanelContainerProps) => {
  const onTabChange = (itemKey: string): void => {
    console.log(itemKey);
    setSelectedTab(itemKey);
  };

  const renderHeader = (): JSX.Element => {
    return (
      <PanelHeader
        cardIcon="https://connectoricons-prod.azureedge.net/releases/v1.0.1550/1.0.1550.2686/azureblob/icon.png"
        isCollapsed={isCollapsed}
        isRight={isRight}
        noNodeSelected={false}
        readOnlyMode={false}
        title={'This is a title'}
        setIsCollapsed={setIsCollapsed}
      />
    );
    // isCollapsed,
    // isRight,
    // cardIcon,
    // comment,
    // noNodeSelected,
    // panelHeaderControlType,
    // readOnlyMode,
    // renameTitleDisabled,
    // showCommentBox,
    // title,
    // setIsCollapsed,
    // onRenderWarningMessage,
  };

  return (
    // <div className="msla-resizable-panel-container">
    //   <div className={isRight ? 'panel-container right' : 'panel-container left'}>
    <Panel
      className="msla-panel-container"
      headerClassName="msla-panel-header"
      isOpen
      onRenderHeader={renderHeader}
      isBlocking={false}
      hasCloseButton={false}
      type={isRight ? PanelType.custom : PanelType.customNear}
      customWidth={width}
      styles={{
        content: isCollapsed && { padding: 0 },
      }}
    >
      {!isCollapsed && (
        <>
          <PanelPivot isCollapsed={isCollapsed} tabs={tabs} selectedTab={selectedTab} onTabChange={onTabChange} trackEvent={trackEvent} />
          <PanelContent tabs={tabs} selectedTab={selectedTab} />
        </>
      )}
    </Panel>
    //   </div>
    // </div>
  );
};
