import type { ILayerProps } from '@fluentui/react';
import {
  Button,
  Divider,
  mergeClasses,
  MessageBar,
  MessageBarBody,
  Text,
  Drawer,
  Spinner,
  MessageBarTitle,
} from '@fluentui/react-components';
import { ChevronDoubleRightFilled } from '@fluentui/react-icons';
import { useCallback, useRef } from 'react';
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
  alternateSelectedNode: PanelNodeData | undefined;
  alternateSelectedNodeHeaderItems: JSX.Element[];
  alternateSelectedNodePersistence: 'pinned' | 'selected';
  layerProps?: ILayerProps;
  canResubmit?: boolean;
  overrideWidth?: string;
  resubmitOperation?: (nodeId: string) => void;
  onUnpinAction?: () => void;
  trackEvent(data: PageActionTelemetryData): void;
  toggleCollapse: () => void;
  onCommentChange: (nodeId: string, panelCommentChangeEvent?: string) => void;
  onTitleChange: TitleChangeHandler;
  handleTitleUpdate: (originalId: string, newId: string) => void;
  setOverrideWidth?: (width: string | undefined) => void;
  canShowLogicAppRun?: boolean;
  showLogicAppRun?: () => void;
  showTriggerInfo?: boolean;
  isTrigger?: boolean;
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
  alternateSelectedNode,
  alternateSelectedNodeHeaderItems,
  alternateSelectedNodePersistence,
  toggleCollapse,
  trackEvent,
  onCommentChange,
  onTitleChange,
  handleTitleUpdate,
  setOverrideWidth,
  overrideWidth,
  isResizeable,
  mountNode,
  canShowLogicAppRun,
  showLogicAppRun,
  showTriggerInfo,
  isTrigger,
}: PanelContainerProps) => {
  const intl = useIntl();
  const canResize = !!(isResizeable && setOverrideWidth);
  const isEmptyPanel = noNodeSelected && panelScope === PanelScope.CardLevel;
  const isRight = panelLocation === PanelLocation.Right;
  const alternateSelectedNodeId = alternateSelectedNode?.nodeId;
  const isAlternateNodeDifferent =
    alternateSelectedNode && alternateSelectedNode.nodeId !== node?.nodeId ? alternateSelectedNode : undefined;
  const panelRef = useRef<HTMLDivElement>(null);
  const drawerWidth = isCollapsed
    ? PanelSize.Auto
    : ((canResize ? overrideWidth : undefined) ?? (isAlternateNodeDifferent ? PanelSize.DualView : PanelSize.Medium));

  const renderHeader = useCallback(
    (headerNode: PanelNodeData): JSX.Element => {
      const { nodeId } = headerNode;
      const panelHasAlternateNode = !!isAlternateNodeDifferent;
      const isAlternateNode = alternateSelectedNodeId === nodeId;
      const canUnpin = !!onUnpinAction && isAlternateNode && alternateSelectedNodePersistence === 'pinned';

      return (
        <PanelHeader
          nodeData={headerNode}
          isCollapsed={isCollapsed}
          isOutermostPanel={!panelHasAlternateNode || !isAlternateNode}
          headerItems={isAlternateNode ? alternateSelectedNodeHeaderItems : nodeHeaderItems}
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
          handleTitleUpdate={handleTitleUpdate}
          showTriggerInfo={showTriggerInfo}
          isTrigger={isTrigger}
        />
      );
    },
    [
      isAlternateNodeDifferent,
      alternateSelectedNodeId,
      onUnpinAction,
      alternateSelectedNodePersistence,
      isCollapsed,
      alternateSelectedNodeHeaderItems,
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
      handleTitleUpdate,
      showTriggerInfo,
      isTrigger,
      resubmitOperation,
      onCommentChange,
    ]
  );

  const panelLabel = intl.formatMessage({
    defaultMessage: 'Operation details panel',
    id: 'nV2Spt',
    description: 'label for operation details panel component',
  });

  const panelErrorTitle = intl.formatMessage({
    defaultMessage: 'Operation details error',
    id: 'ir+plQ',
    description: 'title for panel error',
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
    (contentsNode: NonNullable<typeof node>, type: 'pinned' | 'selected', isAlternateSelectedNode: boolean): JSX.Element => {
      const { errorMessage, isError, isLoading, nodeId, onSelectTab, selectedTab, tabs } = contentsNode;
      return (
        <div
          className={mergeClasses('msla-panel-layout', `msla-panel-border-${type}`, isAlternateSelectedNode && 'msla-panel-layout-pinned')}
        >
          {renderHeader(contentsNode)}
          <div className={`${isError ? 'msla-panel-contents--error' : 'msla-panel-contents'}`}>
            {isLoading ? (
              <div className="msla-loading-container">
                <Spinner size={'large'} />
              </div>
            ) : isError ? (
              <MessageBar intent={'error'}>
                <MessageBarBody>
                  <MessageBarTitle>{panelErrorTitle}</MessageBarTitle>
                  <Text>{errorMessage ?? panelErrorMessage}</Text>
                </MessageBarBody>
              </MessageBar>
            ) : (
              <PanelContent tabs={tabs} trackEvent={trackEvent} nodeId={nodeId} selectedTab={selectedTab} selectTab={onSelectTab} />
            )}
          </div>
        </div>
      );
    },
    [renderHeader, panelErrorMessage, trackEvent, panelErrorTitle]
  );

  const minWidth = alternateSelectedNode ? Number.parseInt(PanelSize.DualView, 10) : undefined;

  if (suppressDefaultNodeSelectFunctionality) {
    // Used in cases like BPT where we do not want to show the panel during node selection
    return null;
  }

  return (
    <Drawer
      aria-label={panelLabel}
      className="msla-panel-container"
      modalType="non-modal"
      mountNode={{
        className: 'msla-panel-host-container',
        element: mountNode,
      }}
      open={true}
      ref={panelRef}
      position={isRight ? 'end' : 'start'}
      style={{ position: 'relative', maxWidth: '100%', width: drawerWidth, height: '100%' }}
    >
      {isEmptyPanel || isCollapsed ? (
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
              !isEmptyPanel && isAlternateNodeDifferent && 'msla-panel-container-nested-dual'
            )}
          >
            {isEmptyPanel ? (
              <EmptyContent />
            ) : (
              <>
                {node ? renderPanelContents(node, 'selected', false) : null}
                {isAlternateNodeDifferent ? (
                  <>
                    <Divider vertical={true} />
                    {renderPanelContents(isAlternateNodeDifferent, alternateSelectedNodePersistence, true)}
                  </>
                ) : null}
              </>
            )}
          </div>
          {canResize ? <PanelResizer minWidth={minWidth} panelRef={panelRef} updatePanelWidth={setOverrideWidth} /> : null}
        </>
      )}
    </Drawer>
  );
};
