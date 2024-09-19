import type { ILayerProps } from '@fluentui/react';
import { MessageBar, MessageBarType } from '@fluentui/react';
import { Button, Divider, mergeClasses, OverlayDrawer, Spinner } from '@fluentui/react-components';
import { ChevronDoubleRightFilled } from '@fluentui/react-icons';
import { useCallback, useEffect, useRef } from 'react';
import { useIntl } from 'react-intl';
import { EmptyContent } from '../card/emptycontent';
import type { PageActionTelemetryData } from '../telemetry/models';
import { PanelContent } from './panelcontent';
import { PanelHeader } from './panelheader/panelheader';
import type { TitleChangeHandler } from './panelheader/panelheadertitle';
import { PanelResizer } from './panelResizer';
import type { CommonPanelProps } from './panelUtil';
import { PanelLocation, PanelScope, PanelSize } from './panelUtil';
import type { PanelNodeData } from './types';

export type PanelContainerProps = {
  noNodeSelected: boolean;
  panelScope: PanelScope;
  suppressDefaultNodeSelectFunctionality?: boolean;
  pivotDisabled?: boolean;
  readOnlyMode?: boolean;
  node: PanelNodeData | undefined;
  nodeHeaderItems: JSX.Element[];
  pinnedNode: PanelNodeData | undefined;
  pinnedNodeHeaderItems: JSX.Element[];
  layerProps?: ILayerProps;
  canResubmit?: boolean;
  overrideWidth?: string;
  resubmitOperation?: (nodeId: string) => void;
  onUnpinAction?: () => void;
  trackEvent(data: PageActionTelemetryData): void;
  toggleCollapse: () => void;
  onCommentChange: (nodeId: string, panelCommentChangeEvent?: string) => void;
  onTitleChange: TitleChangeHandler;
  onTitleBlur?: (prevTitle: string) => void;
  setOverrideWidth?: (width: string | undefined) => void;
  canShowLogicAppRun?: boolean;
  showLogicAppRun?: () => void;
} & CommonPanelProps;

export const PanelContainer = ({
  isCollapsed,
  panelLocation,
  noNodeSelected,
  panelScope,
  suppressDefaultNodeSelectFunctionality,
  canResubmit,
  resubmitOperation,
  onUnpinAction,
  readOnlyMode,
  node,
  nodeHeaderItems,
  pinnedNode,
  pinnedNodeHeaderItems,
  toggleCollapse,
  trackEvent,
  onCommentChange,
  onTitleChange,
  onTitleBlur,
  setOverrideWidth,
  overrideWidth,
  isResizeable,
  mountNode,
  canShowLogicAppRun,
  showLogicAppRun,
}: PanelContainerProps) => {
  const intl = useIntl();

  const selectedElementRef = useRef<HTMLElement | null>(null);

  const canResize = !!(isResizeable && setOverrideWidth);
  const isEmptyPane = noNodeSelected && panelScope === PanelScope.CardLevel;
  const isRight = panelLocation === PanelLocation.Right;
  const pinnedNodeId = pinnedNode?.nodeId;
  const pinnedNodeIfDifferent = pinnedNode && pinnedNode.nodeId !== node?.nodeId ? pinnedNode : undefined;

  const drawerWidth = isCollapsed
    ? PanelSize.Auto
    : (canResize ? overrideWidth : undefined) ?? (pinnedNodeIfDifferent ? PanelSize.DualView : PanelSize.Medium);

  useEffect(() => {
    selectedElementRef.current = node?.nodeId ? document.getElementById(`msla-node-${node.nodeId}`) : null;
  }, [node?.nodeId]);

  useEffect(() => {
    selectedElementRef.current?.focus();
  }, [isCollapsed]);

  const renderHeader = useCallback(
    (headerNode: PanelNodeData): JSX.Element => {
      const { nodeId } = headerNode;
      const panelHasPinnedNode = !!pinnedNodeIfDifferent;
      const isPinnedNode = pinnedNodeId === nodeId;
      const canUnpin = !!onUnpinAction && isPinnedNode;

      return (
        <PanelHeader
          nodeData={headerNode}
          isCollapsed={isCollapsed}
          isOutermostPanel={!panelHasPinnedNode || !isPinnedNode}
          headerItems={isPinnedNode ? pinnedNodeHeaderItems : nodeHeaderItems}
          headerLocation={panelLocation}
          noNodeSelected={noNodeSelected}
          panelScope={panelScope}
          suppressDefaultNodeSelectFunctionality={suppressDefaultNodeSelectFunctionality}
          readOnlyMode={readOnlyMode}
          canResubmit={canResubmit}
          canShowLogicAppRun={canShowLogicAppRun}
          showLogicAppRun={showLogicAppRun}
          onUnpinAction={canUnpin ? onUnpinAction : undefined}
          resubmitOperation={() => resubmitOperation?.(nodeId)}
          commentChange={(newValue) => onCommentChange(nodeId, newValue)}
          toggleCollapse={toggleCollapse}
          onTitleChange={onTitleChange}
          onTitleBlur={onTitleBlur}
        />
      );
    },
    [
      pinnedNodeIfDifferent,
      pinnedNodeId,
      onUnpinAction,
      isCollapsed,
      pinnedNodeHeaderItems,
      nodeHeaderItems,
      panelLocation,
      noNodeSelected,
      panelScope,
      suppressDefaultNodeSelectFunctionality,
      readOnlyMode,
      canResubmit,
      canShowLogicAppRun,
      showLogicAppRun,
      toggleCollapse,
      onTitleChange,
      onTitleBlur,
      resubmitOperation,
      onCommentChange,
    ]
  );

  const panelLabel = intl.formatMessage({
    defaultMessage: 'Operation details panel',
    id: 'nV2Spt',
    description: 'label for operation details panel component',
  });

  const panelErrorMessage = intl.formatMessage({
    defaultMessage: 'Error loading operation data',
    id: '62Ypnr',
    description: 'label for panel error',
  });

  const panelCollapseTitle = intl.formatMessage({
    defaultMessage: 'Collapse',
    id: 'lX30/R',
    description: 'Text of Tooltip to collapse',
  });

  const renderPanelContents = useCallback(
    (contentsNode: NonNullable<typeof node>, type: 'pinned' | 'selected'): JSX.Element => {
      const { errorMessage, isError, isLoading, nodeId, onSelectTab, selectedTab, tabs } = contentsNode;
      return (
        <div className={mergeClasses('msla-panel-layout', `msla-panel-layout-${type}`)}>
          {renderHeader(contentsNode)}
          <div className="msla-panel-contents">
            {isLoading ? (
              <div className="msla-loading-container">
                <Spinner size={'large'} />
              </div>
            ) : isError ? (
              <MessageBar messageBarType={MessageBarType.error}>{errorMessage ?? panelErrorMessage}</MessageBar>
            ) : (
              <PanelContent tabs={tabs} trackEvent={trackEvent} nodeId={nodeId} selectedTab={selectedTab} selectTab={onSelectTab} />
            )}
          </div>
        </div>
      );
    },
    [renderHeader, panelErrorMessage, trackEvent]
  );

  const minWidth = pinnedNode ? Number.parseInt(PanelSize.DualView, 10) : undefined;

  if (suppressDefaultNodeSelectFunctionality) {
    // Used in cases like BPT where we do not want to show the panel during node selection
    return null;
  }

  return (
    <OverlayDrawer
      aria-label={panelLabel}
      className="msla-panel-container"
      modalType="non-modal"
      mountNode={{
        className: 'msla-panel-host-container',
        element: mountNode,
      }}
      open={true}
      position={isRight ? 'end' : 'start'}
      style={{ position: 'absolute', width: drawerWidth }}
    >
      {isEmptyPane || isCollapsed ? (
        <Button
          appearance="subtle"
          aria-label={panelCollapseTitle}
          className={mergeClasses('collapse-toggle', isRight ? 'right' : 'left', isCollapsed && 'collapsed', 'empty')}
          icon={<ChevronDoubleRightFilled />}
          onClick={toggleCollapse}
          data-automation-id="msla-panel-header-collapse-nav"
        />
      ) : null}
      {isCollapsed ? null : (
        <>
          <div
            className={mergeClasses(
              'msla-panel-container-nested',
              `msla-panel-container-nested-${panelLocation.toLowerCase()}`,
              !isEmptyPane && pinnedNodeIfDifferent && 'msla-panel-container-nested-dual'
            )}
          >
            {isEmptyPane ? (
              <EmptyContent />
            ) : (
              <>
                {node ? renderPanelContents(node, 'selected') : null}
                {pinnedNodeIfDifferent ? (
                  <>
                    <Divider vertical={true} />
                    {renderPanelContents(pinnedNodeIfDifferent, 'pinned')}
                  </>
                ) : null}
              </>
            )}
          </div>
          {canResize ? <PanelResizer minWidth={minWidth} updatePanelWidth={setOverrideWidth} /> : null}
        </>
      )}
    </OverlayDrawer>
  );
};
