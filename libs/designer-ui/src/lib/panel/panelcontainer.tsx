import { EmptyContent } from '../card/emptycontent';
import type { MenuItemOption } from '../card/types';
import constants from '../constants';
import type { PageActionTelemetryData } from '../telemetry/models';
import type { CommonPanelProps, PanelTab } from './panelUtil';
import { PanelScope, PanelLocation } from './panelUtil';
import { PanelContent } from './panelcontent';
import type { PanelHeaderControlType } from './panelheader/panelheader';
import { PanelHeader } from './panelheader/panelheader';
import { PanelPivot } from './panelpivot';
import type { ILayerProps } from '@fluentui/react';
import type { IPanelHeaderRenderer, IPanelProps } from '@fluentui/react/lib/Panel';
import { Panel, PanelType } from '@fluentui/react/lib/Panel';
import React, { useCallback } from 'react';
import { useIntl } from 'react-intl';

export type PanelContainerProps = {
  cardIcon?: string;
  comment?: string;
  panelLocation: PanelLocation;
  noNodeSelected: boolean;
  isLoading?: boolean;
  panelScope: PanelScope;
  pivotDisabled?: boolean;
  panelHeaderControlType?: PanelHeaderControlType;
  panelHeaderMenu: MenuItemOption[];
  selectedTab?: string;
  showCommentBox: boolean;
  readOnlyMode?: boolean;
  tabs: Record<string, PanelTab>;
  nodeId: string;
  title?: string;
  layerProps?: ILayerProps;
  onDismissButtonClicked?(): void;
  trackEvent(data: PageActionTelemetryData): void;
  setSelectedTab: (tabName: string | undefined) => void;
  toggleCollapse: () => void;
  onCommentChange: (panelCommentChangeEvent?: string) => void;
  renderHeader?: (props?: IPanelProps, defaultrender?: IPanelHeaderRenderer, headerTextId?: string) => JSX.Element;
} & CommonPanelProps;

export const PanelContainer = ({
  cardIcon,
  comment,
  isCollapsed,
  panelLocation,
  noNodeSelected,
  isLoading,
  panelScope,
  panelHeaderControlType,
  panelHeaderMenu,
  selectedTab,
  showCommentBox,
  readOnlyMode,
  tabs,
  nodeId,
  title,
  width,
  layerProps,
  onDismissButtonClicked,
  setSelectedTab,
  toggleCollapse,
  trackEvent,
  renderHeader,
  onCommentChange,
}: PanelContainerProps) => {
  const intl = useIntl();
  const onTabChange = (itemKey: string): void => {
    setSelectedTab && setSelectedTab(itemKey);
  };

  const defaultRenderHeader = useCallback(
    (props?: IPanelProps, defaultrender?: IPanelHeaderRenderer, headerTextId?: string): JSX.Element => {
      return (
        <PanelHeader
          cardIcon={cardIcon ?? constants.PANEL.DEFAULT_ICON}
          isCollapsed={isCollapsed}
          headerLocation={panelLocation}
          showCommentBox={showCommentBox}
          noNodeSelected={noNodeSelected}
          panelScope={panelScope}
          onDismissButtonClicked={onDismissButtonClicked}
          panelHeaderMenu={panelHeaderMenu}
          panelHeaderControlType={panelHeaderControlType}
          readOnlyMode={readOnlyMode}
          titleId={headerTextId}
          title={title}
          includeTitle={true}
          isLoading={isLoading}
          comment={comment}
          commentChange={onCommentChange}
          toggleCollapse={toggleCollapse}
        />
      );
    },
    [
      cardIcon,
      isCollapsed,
      isLoading,
      panelLocation,
      showCommentBox,
      noNodeSelected,
      panelScope,
      onDismissButtonClicked,
      panelHeaderMenu,
      panelHeaderControlType,
      readOnlyMode,
      title,
      comment,
      onCommentChange,
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
      onRenderHeader={renderHeader ?? defaultRenderHeader}
      isBlocking={false}
      hasCloseButton={false}
      type={panelLocation === PanelLocation.Right ? PanelType.custom : PanelType.customNear}
      customWidth={width}
      styles={{ content: { padding: isCollapsed ? 0 : '1rem' } }}
      layerProps={layerProps}
    >
      {!isCollapsed && (
        <div className="msla-panel-content-container">
          {noNodeSelected && panelScope === PanelScope.CardLevel ? (
            <EmptyContent />
          ) : (
            <div className="msla-panel-content">
              <PanelPivot
                isCollapsed={isCollapsed}
                tabs={tabs}
                selectedTab={selectedTab}
                onTabChange={onTabChange}
                trackEvent={trackEvent}
                nodeId={nodeId}
              />
              <PanelContent tabs={tabs} selectedTab={selectedTab} />
            </div>
          )}
        </div>
      )}
    </Panel>
  );
};
