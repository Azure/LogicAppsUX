import { PANEL_MODE } from '../../core/state/panel/panelTypes';
import type { AppDispatch } from '../../core';
import { useIsDarkMode } from '../../core/state/designerOptions/designerOptionsSelectors';
import {
  useCurrentPanelMode,
  useFocusReturnElementId,
  useIsPanelCollapsed,
  useIsPanelLoading,
} from '../../core/state/panel/panelSelectors';
import { clearPanel } from '../../core/state/panel/panelSlice';
import { ConnectionPanel } from './connectionsPanel/connectionsPanel';
import { ErrorsPanel } from './errorsPanel/errorsPanel';
import { NodeDetailsPanel } from './nodeDetailsPanel/nodeDetailsPanel';
import { NodeSearchPanel } from './nodeSearchPanel/nodeSearchPanel';
import { RecommendationPanelContext } from './recommendation/recommendationPanelContext';
import { WorkflowParametersPanel } from './workflowParametersPanel/workflowParametersPanel';
import { WorkflowParametersPanelFooter } from './workflowParametersPanel/workflowParametersPanelFooter';
import { Panel, PanelType } from '@fluentui/react';
import { Spinner } from '@fluentui/react-components';
import { isUndefined } from '@microsoft/applicationinsights-core-js';
import type { CommonPanelProps, CustomPanelLocation } from '@microsoft/designer-ui';
import { PanelLocation, PanelResizer, PanelSize } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useIntl } from 'react-intl';

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

export const PanelRoot = (props: PanelRootProps): JSX.Element => {
  const { panelContainerRef, panelLocation, customPanelLocations, isResizeable } = props;
  const dispatch = useDispatch<AppDispatch>();
  const isDarkMode = useIsDarkMode();

  const collapsed = useIsPanelCollapsed();
  const currentPanelMode = useCurrentPanelMode();
  const focusReturnElementId = useFocusReturnElementId();

  const panelContainerElement = panelContainerRef.current;

  const [width, setWidth] = useState<PanelSize | string>(PanelSize.Auto);

  useEffect(() => {
    setWidth(collapsed ? PanelSize.Auto : PanelSize.Medium);
  }, [collapsed]);

  const dismissPanel = useCallback(() => dispatch(clearPanel()), [dispatch]);

  const intl = useIntl();

  const panelLabels = useMemo(
    () => ({
      [PANEL_MODE.Operation]: intl.formatMessage({
        defaultMessage: 'Operation Panel',
        id: 'ba62e63e6252',
        description: 'Operation Panel',
      }),
      [PANEL_MODE.Discovery]: intl.formatMessage({
        defaultMessage: 'Discovery Panel',
        id: 'e6b9637fb338',
        description: 'Discovery Panel',
      }),
      [PANEL_MODE.WorkflowParameters]: intl.formatMessage({
        defaultMessage: 'Workflow Parameters Panel',
        id: 'b3441aa2d6ed',
        description: 'Workflow Parameters Panel',
      }),
      [PANEL_MODE.NodeSearch]: intl.formatMessage({
        defaultMessage: 'Node Search Panel',
        id: 'c238a9b65176',
        description: 'Node Search Panel',
      }),
      [PANEL_MODE.Error]: intl.formatMessage({
        defaultMessage: 'Error Panel',
        id: 'ddc645732c73',
        description: 'Error Panel',
      }),
      [PANEL_MODE.Connection]: intl.formatMessage({
        defaultMessage: 'Connection Panel',
        id: 'd0545592be39',
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
      width,
      layerProps,
      panelLocation: customLocation ?? panelLocation ?? PanelLocation.Right,
      isResizeable,
      mountNode: panelContainerElement || undefined,
    };
  }, [customPanelLocations, collapsed, dismissPanel, width, panelContainerElement, panelLocation, isResizeable, currentPanelMode]);

  const onRenderFooterContent = useMemo(
    () => (currentPanelMode === 'WorkflowParameters' ? () => <WorkflowParametersPanelFooter /> : undefined),
    [currentPanelMode]
  );

  const nonBlockingPanels = useMemo(() => ['Connection'], []);

  const isLoadingPanel = useIsPanelLoading();

  const LoadingComponent = () => (
    <div className="msla-loading-container">
      <Spinner size={'large'} />
    </div>
  );

  return !isLoadingPanel && (isUndefined(currentPanelMode) || currentPanelMode === 'Operation') ? (
    <NodeDetailsPanel {...commonPanelProps} />
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
      })}
      popupProps={{
        ariaLabel: currentPanelMode ? panelLabels?.[currentPanelMode] : undefined,
      }}
    >
      {isResizeable ? <PanelResizer updatePanelWidth={setWidth} /> : null}
      {
        isLoadingPanel ? (
          <LoadingComponent />
        ) : currentPanelMode === 'WorkflowParameters' ? (
          <WorkflowParametersPanel {...commonPanelProps} />
        ) : currentPanelMode === 'Discovery' ? (
          <RecommendationPanelContext {...commonPanelProps} />
        ) : currentPanelMode === 'NodeSearch' ? (
          <NodeSearchPanel {...commonPanelProps} focusReturnElementId={focusReturnElementId} />
        ) : currentPanelMode === 'Connection' ? (
          <ConnectionPanel {...commonPanelProps} />
        ) : currentPanelMode === 'Error' ? (
          <ErrorsPanel {...commonPanelProps} />
        ) : null // Caught above
      }
    </Panel>
  );
};
