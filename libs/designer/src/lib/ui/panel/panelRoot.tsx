import type { AppDispatch } from '../../core';
import { useHostOptions, useIsDarkMode } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useCurrentPanelMode, useIsLoadingPanel, useIsPanelCollapsed } from '../../core/state/panel/panelSelectors';
import { clearPanel } from '../../core/state/panel/panelSlice';
import { AssertionsPanel } from './assertionsPanel/assertionsPanel';
import { ConnectionPanel } from './connectionsPanel/connectionsPanel';
import { ErrorPanel } from './errorsPanel/errorsPanel';
import { NodeDetailsPanel } from './nodeDetailsPanel/nodeDetailsPanel';
import { usePanelTabs } from './nodeDetailsPanel/tabInitialization';
import { NodeSearchPanel } from './nodeSearchPanel/nodeSearchPanel';
import { RecommendationPanelContext } from './recommendation/recommendationPanelContext';
import { WorkflowParametersPanel } from './workflowParametersPanel/workflowParametersPanel';
import { WorkflowParametersPanelFooter } from './workflowParametersPanel/workflowParametersPanelFooter';
import { Panel, PanelType } from '@fluentui/react';
import { Spinner } from '@fluentui/react-components';
import { isUndefined } from '@microsoft/applicationinsights-core-js';
import type { CommonPanelProps, CustomPanelLocation } from '@microsoft/designer-ui';
import { PanelLocation, PanelSize } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

export interface PanelRootProps {
  panelLocation?: PanelLocation;
  customPanelLocations?: CustomPanelLocation[];
}

const layerProps = {
  hostId: 'msla-layer-host',
  eventBubblingEnabled: true,
};

export const PanelRoot = (props: PanelRootProps): JSX.Element => {
  const { panelLocation, customPanelLocations } = props;
  const dispatch = useDispatch<AppDispatch>();
  const { displayRuntimeInfo } = useHostOptions();
  const isDarkMode = useIsDarkMode();

  const collapsed = useIsPanelCollapsed();
  const currentPanelMode = useCurrentPanelMode();

  usePanelTabs(); // This initializes tabs for the node details panel, can't be run twice so it lives here instead of in the panel

  const [width, setWidth] = useState<PanelSize>(PanelSize.Auto);

  useEffect(() => {
    setWidth(collapsed ? PanelSize.Auto : PanelSize.Medium);
  }, [collapsed]);

  const dismissPanel = useCallback(() => dispatch(clearPanel()), [dispatch]);

  const commonPanelProps: CommonPanelProps = useMemo(() => {
    const customLocation = customPanelLocations?.find((x) => currentPanelMode === x.panelMode)?.panelLocation;
    return {
      isCollapsed: collapsed,
      toggleCollapse: dismissPanel,
      width,
      layerProps,
      panelLocation: customLocation ?? panelLocation ?? PanelLocation.Right,
    };
  }, [customPanelLocations, currentPanelMode, collapsed, dismissPanel, panelLocation, width]);

  const onRenderFooterContent = useMemo(
    () => (currentPanelMode === 'WorkflowParameters' ? () => <WorkflowParametersPanelFooter /> : undefined),
    [currentPanelMode]
  );

  const nonBlockingPanels = useMemo(() => ['Connection'], []);

  const isLoadingPanel = useIsLoadingPanel();

  const LoadingComponent = () => (
    <div className="msla-loading-container">
      <Spinner size={'large'} />
    </div>
  );

  return (!isLoadingPanel && isUndefined(currentPanelMode)) || currentPanelMode === 'Operation' ? (
    <NodeDetailsPanel {...commonPanelProps} />
  ) : (
    <Panel
      className={`msla-panel-root-${currentPanelMode}`}
      isLightDismiss
      isBlocking={!isLoadingPanel && !nonBlockingPanels.includes(currentPanelMode ?? '')}
      type={commonPanelProps.panelLocation === PanelLocation.Right ? PanelType.medium : PanelType.customNear}
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
    >
      {
        isLoadingPanel ? (
          <LoadingComponent />
        ) : currentPanelMode === 'WorkflowParameters' ? (
          <WorkflowParametersPanel {...commonPanelProps} />
        ) : currentPanelMode === 'Discovery' ? (
          <RecommendationPanelContext {...commonPanelProps} displayRuntimeInfo={displayRuntimeInfo} />
        ) : currentPanelMode === 'NodeSearch' ? (
          <NodeSearchPanel {...commonPanelProps} displayRuntimeInfo={displayRuntimeInfo} />
        ) : currentPanelMode === 'Connection' ? (
          <ConnectionPanel {...commonPanelProps} />
        ) : currentPanelMode === 'Error' ? (
          <ErrorPanel {...commonPanelProps} />
        ) : currentPanelMode === 'Assertions' ? (
          <AssertionsPanel {...commonPanelProps} />
        ) : null // Caught above
      }
    </Panel>
  );
};
