import type { AppDispatch } from '../../core';
import { useIsDarkMode } from '../../core/state/designerOptions/designerOptionsSelectors';
import {
  useCurrentPanelMode,
  useIsLoadingPanel,
  useIsPanelCollapsed,
  useFocusReturnElementId,
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

export interface PanelRootProps {
  panelLocation?: PanelLocation;
  customPanelLocations?: CustomPanelLocation[];
  isResizeable?: boolean;
}

const layerProps = {
  hostId: 'msla-layer-host',
  eventBubblingEnabled: true,
};

export const PanelRoot = (props: PanelRootProps): JSX.Element => {
  const { panelLocation = PanelLocation.Right, customPanelLocations, isResizeable } = props;
  const dispatch = useDispatch<AppDispatch>();
  const isDarkMode = useIsDarkMode();

  const collapsed = useIsPanelCollapsed();
  const currentPanelMode = useCurrentPanelMode();
  const focusReturnElementId = useFocusReturnElementId();

  const [width, setWidth] = useState<PanelSize | string>(PanelSize.Auto);

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
      isResizeable,
    };
  }, [customPanelLocations, collapsed, dismissPanel, width, panelLocation, isResizeable, currentPanelMode]);

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
