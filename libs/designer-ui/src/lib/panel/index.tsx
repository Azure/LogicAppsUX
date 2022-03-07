import { EmptyContent } from '../card/emptycontent';
import type { MenuItemOption } from '../card/types';
import constants from '../constants';
import type { PageActionTelemetryData } from '../telemetry/models';
import type { PanelTab } from './panelUtil';
import { PanelContent } from './panelcontent';
import { PanelHeader, PanelHeaderControlType } from './panelheader/panelheader';
import { PanelPivot } from './panelpivot';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import React, { useCallback } from 'react';

export interface PanelContainerProps {
  cardIcon?: string;
  comment?: string;
  isCollapsed: boolean;
  isRight?: boolean;
  noNodeSelected: boolean;
  pivotDisabled?: boolean;
  panelHeaderMenu: MenuItemOption[];
  selectedTab: string | undefined;
  showCommentBox: boolean;
  readOnlyMode?: boolean;
  tabs: Record<string, PanelTab>;
  title: string;
  width: string;
  trackEvent(data: PageActionTelemetryData): void;
  setSelectedTab: React.Dispatch<React.SetStateAction<string | undefined>>;
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export const PanelContainer = ({
  cardIcon,
  comment,
  isCollapsed,
  isRight,
  noNodeSelected,
  panelHeaderMenu,
  selectedTab,
  showCommentBox,
  readOnlyMode,
  tabs,
  title,
  width,
  setSelectedTab,
  setIsCollapsed,
  trackEvent,
}: PanelContainerProps) => {
  const onTabChange = (itemKey: string): void => {
    console.log(itemKey);
    setSelectedTab && setSelectedTab(itemKey);
  };

  const renderHeader = useCallback((): JSX.Element => {
    return (
      <PanelHeader
        cardIcon={cardIcon ?? constants.PANEL.DEFAULT_ICON}
        isCollapsed={isCollapsed}
        isRight={isRight}
        showCommentBox={showCommentBox}
        noNodeSelected={noNodeSelected}
        panelHeaderMenu={panelHeaderMenu}
        panelHeaderControlType={PanelHeaderControlType.MENU}
        readOnlyMode={readOnlyMode}
        title={title}
        comment={comment}
        setIsCollapsed={setIsCollapsed}
      />
    );
  }, [cardIcon, comment, isCollapsed, isRight, noNodeSelected, panelHeaderMenu, readOnlyMode, showCommentBox, title, setIsCollapsed]);

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
        <div className="msla-panel-content-container">
          {noNodeSelected ? (
            <EmptyContent />
          ) : (
            <div className="msla-panel-content">
              <PanelPivot
                isCollapsed={isCollapsed}
                tabs={tabs}
                selectedTab={selectedTab}
                onTabChange={onTabChange}
                trackEvent={trackEvent}
              />
              <PanelContent tabs={tabs} selectedTab={selectedTab} />
            </div>
          )}
        </div>
      )}
    </Panel>
  );
};
