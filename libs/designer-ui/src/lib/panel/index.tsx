import React, { useCallback } from 'react';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import { PanelPivot } from './panelpivot';
import { PanelContent } from './panelcontent';
import { PanelHeader, PanelHeaderControlType } from './panelheader/panelheader';
import { PageActionTelemetryData } from '../telemetry/models';
import { MenuItemOption } from '../card/types';
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
  comment?: string;
  isCollapsed: boolean;
  isRight?: boolean;
  noNodeSelected: boolean;
  pivotDisabled?: boolean;
  panelHeaderMenu: MenuItemOption[];
  selectedTab: string;
  showCommentBox: boolean;
  readOnlyMode?: boolean;
  tabs: PanelTab[];
  width: string;
  trackEvent(data: PageActionTelemetryData): void;
  setSelectedTab: React.Dispatch<React.SetStateAction<string>>;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PanelContainer = ({
  comment,
  isCollapsed,
  isRight,
  noNodeSelected,
  panelHeaderMenu,
  selectedTab,
  showCommentBox,
  readOnlyMode,
  tabs,
  width,
  setSelectedTab,
  setIsCollapsed,
  trackEvent,
}: PanelContainerProps) => {
  const onTabChange = (itemKey: string): void => {
    setSelectedTab(itemKey);
  };

  const renderHeader = useCallback((): JSX.Element => {
    return (
      <PanelHeader
        cardIcon="https://connectoricons-prod.azureedge.net/releases/v1.0.1550/1.0.1550.2686/azureblob/icon.png"
        isCollapsed={isCollapsed}
        isRight={isRight}
        showCommentBox={showCommentBox}
        noNodeSelected={noNodeSelected}
        panelHeaderMenu={panelHeaderMenu}
        panelHeaderControlType={PanelHeaderControlType.MENU}
        readOnlyMode={readOnlyMode}
        title={'This is a title'}
        comment={comment}
        setIsCollapsed={setIsCollapsed}
      />
    );
  }, [comment, isCollapsed, isRight, noNodeSelected, panelHeaderMenu, readOnlyMode, setIsCollapsed, showCommentBox]);

  return (
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
  );
};
