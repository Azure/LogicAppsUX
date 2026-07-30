import { PANEL_MODE } from '../../core/state/panel/panelTypes';
import type { AppDispatch } from '../../core';
import { useIsDarkMode } from '../../core/state/designerOptions/designerOptionsSelectors';
import {
  useCurrentPanelMode,
  useFocusReturnElementId,
  useIsPanelCollapsed,
  useIsPanelLoading,
  useOperationPanelSelectedNodeIds,
} from '../../core/state/panel/panelSelectors';
import { clearPanel } from '../../core/state/panel/panelSlice';
import { ConnectionPanel } from './connectionsPanel/connectionsPanel';
import { ErrorsPanel } from './errorsPanel/errorsPanel';
import { NodeDetailsPanel } from './nodeDetailsPanel/nodeDetailsPanel';
import { MultiSelectPanel } from './multiSelectPanel/multiSelectPanel';
import { NodeSearchDialog } from './nodeSearchPanel/nodeSearchDialog';
import { RecommendationPanelContext } from './recommendation/recommendationPanelContext';
import { WorkflowParametersPanel } from './workflowParametersPanel/workflowParametersPanel';
import { WorkflowParametersPanelFooter } from './workflowParametersPanel/workflowParametersPanelFooter';
import { Panel, PanelType } from '@fluentui/react';
import { Dialog, Spinner } from '@fluentui/react-components';
import { isUndefined } from '@microsoft/applicationinsights-core-js';
import type { CommonPanelProps, CustomPanelLocation } from '@microsoft/designer-ui';
import { PanelLocation, PanelResizer, PanelSize } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';
import { useShowMultiSelectDeleteModal } from '../../core/state/designerView/designerViewSelectors';

export interface PanelRootProps {
  panelContainerRef: React.MutableRefObject<HTMLElement | null>;
  panelLocation: PanelLocation;
  customPanelLocations?: CustomPanelLocation[];
  isResizeable?: boolean;
}

const layerProps = {
  hostId: 'msla-layer-host',
  eventBubblingEnabled: true,
};

export const PanelRoot = (props: PanelRootProps): JSX.Element | null => {
  const { panelContainerRef, panelLocation, customPanelLocations, isResizeable } = props;
  const dispatch = useDispatch<AppDispatch>();
  const isDarkMode = useIsDarkMode();

  const collapsed = useIsPanelCollapsed();
  const currentPanelMode = useCurrentPanelMode();
  const focusReturnElementId = useFocusReturnElementId();
  const selectedNodeIds = useOperationPanelSelectedNodeIds();
  const isMultiSelect = currentPanelMode === 'Operation' && selectedNodeIds.length > 2;

  const panelContainerElement = panelContainerRef.current;

  const [width, setWidth] = useState<PanelSize | string>(currentPanelMode === 'Discovery' ? PanelSize.Small : PanelSize.Medium);

  useEffect(() => {
    setWidth(currentPanelMode === 'Discovery' ? PanelSize.Small : PanelSize.Medium);
  }, [currentPanelMode]);

  // The multi-select delete confirmation dialog renders above this (light-dismiss) panel. Backing
  // out of that dialog (Escape / outside click) ends up triggering the panel's light-dismiss handler
  // and would otherwise clear the multi-selection. Escape closes the dialog first and the panel's
  // dismiss can fire either in the same tick or a later one (e.g. focus restoration after the
  // dialog unmounts), so we guard with both the live open state and a short window after it closes.
  const isMultiSelectDeleteModalOpen = useShowMultiSelectDeleteModal();
  const isMultiSelectDeleteModalOpenRef = useRef(isMultiSelectDeleteModalOpen);
  const multiSelectDeleteModalClosedAtRef = useRef(0);
  useEffect(() => {
    if (isMultiSelectDeleteModalOpenRef.current && !isMultiSelectDeleteModalOpen) {
      multiSelectDeleteModalClosedAtRef.current = Date.now();
    }
    isMultiSelectDeleteModalOpenRef.current = isMultiSelectDeleteModalOpen;
  }, [isMultiSelectDeleteModalOpen]);

  const dismissPanel = useCallback(() => {
    if (isMultiSelectDeleteModalOpenRef.current || Date.now() - multiSelectDeleteModalClosedAtRef.current < 500) {
      return;
    }
    dispatch(clearPanel());
  }, [dispatch]);

  const intl = useIntl();

  const panelLabels = useMemo(
    () => ({
      [PANEL_MODE.Operation]: intl.formatMessage({
        defaultMessage: 'Operation Panel',
        id: 'umLmPm',
        description: 'Operation Panel',
      }),
      [PANEL_MODE.Discovery]: intl.formatMessage({
        defaultMessage: 'Discovery Panel',
        id: '5rljf7',
        description: 'Discovery Panel',
      }),
      [PANEL_MODE.WorkflowParameters]: intl.formatMessage({
        defaultMessage: 'Workflow Parameters Panel',
        id: 's0Qaot',
        description: 'Workflow Parameters Panel',
      }),
      [PANEL_MODE.NodeSearch]: intl.formatMessage({
        defaultMessage: 'Node Search Panel',
        id: 'wjiptl',
        description: 'Node Search Panel',
      }),
      [PANEL_MODE.Error]: intl.formatMessage({
        defaultMessage: 'Error Panel',
        id: '3cZFcy',
        description: 'Error Panel',
      }),
      [PANEL_MODE.Connection]: intl.formatMessage({
        defaultMessage: 'Connection Panel',
        id: '0FRVkr',
        description: 'Connection Panel',
      }),
    }),
    [intl]
  );

  const commonPanelProps: CommonPanelProps = useMemo(() => {
    const customLocation = customPanelLocations?.find((x) => currentPanelMode === x.panelMode)?.panelLocation;
    return {
      isCollapsed: collapsed,
      toggleCollapse: dismissPanel,
      layerProps,
      panelLocation: customLocation ?? panelLocation ?? PanelLocation.Right,
      isResizeable,
      mountNode: panelContainerElement || undefined,
    };
  }, [customPanelLocations, collapsed, dismissPanel, panelContainerElement, panelLocation, isResizeable, currentPanelMode]);

  const onRenderFooterContent = useMemo(
    () => (currentPanelMode === 'WorkflowParameters' ? () => <WorkflowParametersPanelFooter /> : undefined),
    [currentPanelMode]
  );

  const nonBlockingPanels = useMemo(() => ['Connection', 'Discovery'], []);

  const dialogModes = useMemo(() => ['NodeSearch'], []);

  const isLoadingPanel = useIsPanelLoading();

  const loadingContent = (
    <div className="msla-loading-container">
      <Spinner size={'large'} />
    </div>
  );

  const content = isLoadingPanel ? (
    loadingContent
  ) : currentPanelMode === 'WorkflowParameters' ? (
    <WorkflowParametersPanel {...commonPanelProps} />
  ) : currentPanelMode === 'Discovery' ? (
    <RecommendationPanelContext {...commonPanelProps} />
  ) : currentPanelMode === 'NodeSearch' ? (
    <NodeSearchDialog {...commonPanelProps} focusReturnElementId={focusReturnElementId} />
  ) : currentPanelMode === 'Connection' ? (
    <ConnectionPanel {...commonPanelProps} />
  ) : currentPanelMode === 'Error' ? (
    <ErrorsPanel {...commonPanelProps} />
  ) : null; // Caught above

  if (isUndefined(currentPanelMode)) {
    return null;
  }

  if (dialogModes.includes(currentPanelMode) && content) {
    return (
      <Dialog
        open={true}
        onOpenChange={(_event, data) => {
          if (!data.open) {
            dismissPanel();
          }
        }}
      >
        {content}
      </Dialog>
    );
  }

  return !isLoadingPanel && currentPanelMode === 'Operation' ? (
    isMultiSelect ? (
      <MultiSelectPanel {...commonPanelProps} />
    ) : (
      <NodeDetailsPanel {...commonPanelProps} />
    )
  ) : (
    <Panel
      className={`msla-panel-root-${currentPanelMode}`}
      isLightDismiss
      isBlocking={!isLoadingPanel && !nonBlockingPanels.includes(currentPanelMode ?? '')}
      type={commonPanelProps.panelLocation === PanelLocation.Right ? PanelType.custom : PanelType.customNear}
      isOpen={!collapsed}
      onDismiss={dismissPanel}
      hasCloseButton={false}
      overlayProps={{ isDarkThemed: isDarkMode }}
      layerProps={layerProps}
      customWidth={width}
      onRenderFooterContent={onRenderFooterContent}
      isFooterAtBottom={true}
      styles={({ theme }) => ({
        footer: {
          backgroundColor: theme?.semanticColors.bodyBackground,
          borderTop: 0,
        },
        main:
          currentPanelMode === 'Discovery'
            ? {
                right: 0,
                position: 'absolute',
              }
            : undefined,
        content: {
          // Hide scrollbar
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          scrollBehavior: 'smooth',
          padding: currentPanelMode === 'Discovery' ? '0 8px' : undefined,
        },
        scrollableContent: {
          // Hide scrollbar
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          '&::-webkit-scrollbar': {
            display: 'none',
          },
          scrollBehavior: 'smooth',
        },
      })}
      popupProps={{
        ariaLabel: currentPanelMode ? panelLabels?.[currentPanelMode] : undefined,
      }}
    >
      {isResizeable ? <PanelResizer updatePanelWidth={setWidth} /> : null}
      {content}
    </Panel>
  );
};
