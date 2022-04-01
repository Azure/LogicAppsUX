import { EmptyContent } from '../card/emptycontent';
import type { MenuItemOption } from '../card/types';
import constants from '../constants';
import type { PageActionTelemetryData } from '../telemetry/models';
import type { PanelTab } from './panelUtil';
import { PanelContent } from './panelcontent';
import type { PanelHeaderControlType } from './panelheader/panelheader';
import { PanelHeader } from './panelheader/panelheader';
import { PanelPivot } from './panelpivot';
import type { IPanelHeaderRenderer, IPanelProps } from '@fluentui/react/lib/Panel';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import React, { useCallback } from 'react';
import { useIntl } from 'react-intl';

export interface PanelContainerProps {
  cardIcon?: string;
  comment?: string;
  isCollapsed: boolean;
  isRight?: boolean;
  noNodeSelected: boolean;
  pivotDisabled?: boolean;
  panelHeaderControlType?: PanelHeaderControlType;
  panelHeaderMenu: MenuItemOption[];
  selectedTab?: string;
  showCommentBox: boolean;
  readOnlyMode?: boolean;
  tabs: Record<string, PanelTab>;
  title: string;
  width: string;
  onDismissButtonClicked?(): void;
  trackEvent(data: PageActionTelemetryData): void;
  setSelectedTab: React.Dispatch<React.SetStateAction<string | undefined>>;
  toggleCollapse: () => void;
}

export const PanelContainer = ({
  cardIcon,
  comment,
  isCollapsed,
  isRight,
  noNodeSelected,
  panelHeaderControlType,
  panelHeaderMenu,
  selectedTab,
  showCommentBox,
  readOnlyMode,
  tabs,
  title,
  width,
  onDismissButtonClicked,
  setSelectedTab,
  toggleCollapse,
  trackEvent,
}: PanelContainerProps) => {
  const intl = useIntl();
  const onTabChange = (itemKey: string): void => {
    setSelectedTab && setSelectedTab(itemKey);
  };

  const renderHeader = useCallback(
    (props?: IPanelProps, defaultrender?: IPanelHeaderRenderer, headerTextId?: string): JSX.Element => {
      return (
        <PanelHeader
          cardIcon={cardIcon ?? constants.PANEL.DEFAULT_ICON}
          isCollapsed={isCollapsed}
          isRight={isRight}
          showCommentBox={showCommentBox}
          noNodeSelected={noNodeSelected}
          onDismissButtonClicked={onDismissButtonClicked}
          panelHeaderMenu={panelHeaderMenu}
          panelHeaderControlType={panelHeaderControlType}
          readOnlyMode={readOnlyMode}
          titleId={headerTextId}
          title={title}
          comment={comment}
          toggleCollapse={toggleCollapse}
        />
      );
    },
    [
      cardIcon,
      isCollapsed,
      isRight,
      showCommentBox,
      noNodeSelected,
      onDismissButtonClicked,
      panelHeaderMenu,
      panelHeaderControlType,
      readOnlyMode,
      title,
      comment,
      toggleCollapse,
    ]
  );

  const panelLabel = intl.formatMessage({
    defaultMessage: 'panel',
    description: 'label for panel component',
  });

  return (
    <Panel
      aria-label={panelLabel}
      className="msla-panel-container"
      headerClassName="msla-panel-header"
      headerText={title || panelLabel}
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
