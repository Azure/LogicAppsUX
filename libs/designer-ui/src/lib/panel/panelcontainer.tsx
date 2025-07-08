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
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
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
import { equals, guid, SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import constants from '../constants';
import { TeachingPopup } from '../teachingPopup';

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
  ...rest
}: PanelContainerProps) => {
  const intl = useIntl();
  const canResize = !!(isResizeable && setOverrideWidth);
  const isEmptyPanel = noNodeSelected && panelScope === PanelScope.CardLevel;
  const isRight = panelLocation === PanelLocation.Right;
  const alternateSelectedNode = useMemo(
    () => (rest.alternateSelectedNode && rest.alternateSelectedNode.nodeId !== node?.nodeId ? rest.alternateSelectedNode : undefined),
    [node, rest.alternateSelectedNode]
  );

  const alternateSelectedNodeContainerId = useMemo(
    () =>
      alternateSelectedNode?.subgraphType &&
      alternateSelectedNodePersistence === 'selected' &&
      equals(alternateSelectedNode.subgraphType, SUBGRAPH_TYPES['AGENT_CONDITION'], true)
        ? guid()
        : undefined,
    [alternateSelectedNode?.subgraphType, alternateSelectedNodePersistence]
  );

  const targetElement = alternateSelectedNodeContainerId && document.getElementById(alternateSelectedNodeContainerId);
  const [shouldDisplayPopup, setShouldDisplayPopup] = useState(
    localStorage.getItem(constants.TEACHING_POPOVER_ID.agentToolPanel) !== 'true'
  );
  const panelRef = useRef<HTMLDivElement>(null);

  // Viewport-aware panel width
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate responsive panel width
  const getResponsiveWidth = () => {
    if (isCollapsed) {
      return PanelSize.Auto;
    }

    // If manually resized, use that width but constrain to viewport
    if (canResize && overrideWidth) {
      const numericWidth = Number.parseInt(overrideWidth, 10);
      const maxWidth = viewportWidth * 0.9; // 90% of viewport width
      return `${Math.min(numericWidth, maxWidth)}px`;
    }

    // Default widths based on panel type
    const defaultWidth = alternateSelectedNode ? Number.parseInt(PanelSize.DualView, 10) : Number.parseInt(PanelSize.Medium, 10);

    // Responsive breakpoints
    if (viewportWidth < 768) {
      return '100%'; // Full width on mobile
    }
    if (viewportWidth < 1024) {
      return `${Math.min(defaultWidth, viewportWidth * 0.8)}px`; // 80% max on tablet
    }
    return `${Math.min(defaultWidth, viewportWidth * 0.6)}px`; // 60% max on desktop
  };

  const drawerWidth = getResponsiveWidth();

  const renderHeader = useCallback(
    (headerNode: PanelNodeData): JSX.Element => {
      const { nodeId } = headerNode;
      const panelHasAlternateNode = !!alternateSelectedNode;
      const isAlternateNode = rest.alternateSelectedNode?.nodeId === nodeId;
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
      alternateSelectedNode,
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
      rest.alternateSelectedNode,
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

  const toolBranchTitle = intl.formatMessage({
    defaultMessage: 'Tool branch for the Agent',
    id: 'TgtIUN',
    description: 'Text of Tooltip to show tool branch',
  });

  const toolBranchMessage = intl.formatMessage({
    defaultMessage: 'Each action provided to the agent should be within a tool branch. We are adding a tool branch by default for you.',
    id: 'n55ef6',
    description: 'Text of Tooltip to show tool branch',
  });

  const renderPanelContents = useCallback(
    (contentsNode: NonNullable<typeof node>, type: 'pinned' | 'selected', isAlternateSelectedNode: boolean): JSX.Element => {
      const { errorMessage, isError, isLoading, nodeId, onSelectTab, selectedTab, tabs } = contentsNode;
      return (
        <div
          className={mergeClasses('msla-panel-layout', `msla-panel-border-${type}`, isAlternateSelectedNode && 'msla-panel-layout-pinned')}
          id={isAlternateSelectedNode ? alternateSelectedNodeContainerId : undefined}
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
    [renderHeader, panelErrorMessage, trackEvent, panelErrorTitle, alternateSelectedNodeContainerId]
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
      style={{
        position: 'relative',
        maxWidth: '100%',
        width: drawerWidth,
        height: '100%',
      }}
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
              !isEmptyPanel && alternateSelectedNode && 'msla-panel-container-nested-dual'
            )}
          >
            {isEmptyPanel ? (
              <EmptyContent />
            ) : (
              <>
                {node ? renderPanelContents(node, 'selected', false) : null}
                {alternateSelectedNode ? (
                  <>
                    <Divider vertical={true} />
                    {renderPanelContents(alternateSelectedNode, alternateSelectedNodePersistence, true)}
                    {shouldDisplayPopup && targetElement ? (
                      <TeachingPopup
                        targetElement={targetElement}
                        title={toolBranchTitle}
                        message={toolBranchMessage}
                        withArrow={true}
                        handlePopupPrimaryOnClick={() => {
                          localStorage.setItem(constants.TEACHING_POPOVER_ID.agentToolPanel, 'true');
                          setShouldDisplayPopup(false);
                        }}
                      />
                    ) : null}
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
