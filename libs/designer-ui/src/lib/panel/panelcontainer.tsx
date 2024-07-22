import type { ILayerProps } from '@fluentui/react';
import { MessageBar, MessageBarType } from '@fluentui/react';
import { Divider, mergeClasses, OverlayDrawer, Spinner } from '@fluentui/react-components';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { EmptyContent } from '../card/emptycontent';
import type { PageActionTelemetryData } from '../telemetry/models';
import { PanelContent } from './panelcontent';
import { PanelHeader } from './panelheader/panelheader';
import type { TitleChangeHandler } from './panelheader/panelheadertitle';
import { PanelResizer } from './panelResizer';
import type { CommonPanelProps, PanelTab } from './panelUtil';
import { PanelLocation, PanelScope, PanelSize } from './panelUtil';

const horizontalPadding = '2rem';

export interface PanelContainerNodeData {
  comment: string | undefined;
  displayName: string;
  errorMessage: string | undefined;
  iconUri: string;
  isError: boolean;
  isLoading: boolean;
  nodeId: string;
  onSelectTab: (tabId: string) => void;
  runData: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger | undefined;
  selectedTab?: string;
  tabs: PanelTab[];
}

export type PanelContainerProps = {
  noNodeSelected: boolean;
  panelScope: PanelScope;
  suppressDefaultNodeSelectFunctionality?: boolean;
  pivotDisabled?: boolean;
  headerMenuItems: JSX.Element[];
  showCommentBox: boolean;
  readOnlyMode?: boolean;
  node: PanelContainerNodeData | undefined;
  pinnedNode: PanelContainerNodeData | undefined;
  layerProps?: ILayerProps;
  canResubmit?: boolean;
  resubmitOperation?: () => void;
  onUnpinAction?: () => void;
  trackEvent(data: PageActionTelemetryData): void;
  toggleCollapse: () => void;
  onCommentChange: (panelCommentChangeEvent?: string) => void;
  onTitleChange: TitleChangeHandler;
  onTitleBlur?: (prevTitle: string) => void;
  setCurrWidth: (width: string) => void;
} & CommonPanelProps;

export const PanelContainer = ({
  isCollapsed,
  panelLocation,
  noNodeSelected,
  panelScope,
  suppressDefaultNodeSelectFunctionality,
  headerMenuItems,
  canResubmit,
  resubmitOperation,
  onUnpinAction,
  showCommentBox,
  readOnlyMode,
  node,
  pinnedNode,
  width,
  // TODO layerProps,
  toggleCollapse,
  trackEvent,
  onCommentChange,
  onTitleChange,
  onTitleBlur,
  setCurrWidth,
  isResizeable,
}: PanelContainerProps) => {
  const intl = useIntl();

  const canResize = isResizeable && !pinnedNode;
  const pinnedNodeIfDifferent = pinnedNode && pinnedNode.nodeId !== node?.nodeId ? pinnedNode : undefined;
  const pinnedNodeId = pinnedNode?.nodeId;
  const isEmptyPane = noNodeSelected && panelScope === PanelScope.CardLevel;

  const renderHeader = useCallback(
    (headerNode: PanelContainerNodeData): JSX.Element => {
      const { comment, displayName, iconUri, isError, isLoading, nodeId } = headerNode;
      const canUnpin = !!onUnpinAction && pinnedNodeId === nodeId;

      return (
        <PanelHeader
          nodeId={nodeId}
          cardIcon={iconUri}
          isCollapsed={isCollapsed}
          headerLocation={panelLocation}
          showCommentBox={showCommentBox}
          noNodeSelected={noNodeSelected}
          panelScope={panelScope}
          suppressDefaultNodeSelectFunctionality={suppressDefaultNodeSelectFunctionality}
          headerMenuItems={headerMenuItems}
          readOnlyMode={readOnlyMode}
          // TODO titleId={headerTextId}
          title={displayName}
          isError={isError}
          isLoading={isLoading}
          comment={comment}
          canResubmit={canResubmit}
          onUnpinAction={canUnpin ? onUnpinAction : undefined}
          resubmitOperation={resubmitOperation}
          horizontalPadding={horizontalPadding}
          commentChange={onCommentChange}
          toggleCollapse={toggleCollapse}
          onTitleChange={onTitleChange}
          onTitleBlur={onTitleBlur}
        />
      );
    },
    [
      isCollapsed,
      panelLocation,
      showCommentBox,
      noNodeSelected,
      panelScope,
      suppressDefaultNodeSelectFunctionality,
      headerMenuItems,
      readOnlyMode,
      canResubmit,
      pinnedNodeId,
      resubmitOperation,
      onUnpinAction,
      onCommentChange,
      toggleCollapse,
      onTitleChange,
      onTitleBlur,
    ]
  );

  const panelLabel = intl.formatMessage({
    defaultMessage: 'panel',
    id: 'c6XbVI',
    description: 'label for panel component',
  });

  const panelErrorMessage = intl.formatMessage({
    defaultMessage: 'Error loading operation data',
    id: '62Ypnr',
    description: 'label for panel error',
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

  return (
    <OverlayDrawer
      aria-label={panelLabel}
      className="msla-panel-container"
      modalType="non-modal"
      mountNode={{
        className: 'msla-panel-host-container',
      }}
      open={true}
      position={panelLocation === PanelLocation.Right ? 'end' : 'start'}
      style={{ width: pinnedNodeIfDifferent ? PanelSize.DualView : width }}
    >
      {!isCollapsed && (
        <>
          <div
            className={mergeClasses(
              'msla-panel-container-nested',
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
          {canResize ? <PanelResizer updatePanelWidth={setCurrWidth} /> : null}
        </>
      )}
    </OverlayDrawer>
  );
};
