import type { AppDispatch } from '../../core';
import { useIsDarkMode } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useCurrentPanelModePanelMode, useIsPanelCollapsed } from '../../core/state/panel/panelSelectors';
import { clearPanel } from '../../core/state/panel/panelSlice';
import { ErrorPanel } from './errorsPanel/errorsPanel';
import { NodeDetailsPanel } from './nodeDetailsPanel/nodeDetailsPanel';
import { usePanelTabs } from './nodeDetailsPanel/tabInitialization';
import { NodeSearchPanel } from './nodeSearchPanel/nodeSearchPanel';
import { RecommendationPanelContext } from './recommendation/recommendationPanelContext';
import { WorkflowParametersPanel } from './workflowParametersPanel/workflowParametersPanel';
import { WorkflowParametersPanelFooter } from './workflowParametersPanel/workflowParametersPanelFooter';
import { Panel, PanelType } from '@fluentui/react';
import { isUndefined } from '@microsoft/applicationinsights-core-js';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { PanelLocation, PanelSize } from '@microsoft/designer-ui';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';

export interface PanelRootProps {
  panelLocation?: PanelLocation;
  displayRuntimeInfo: boolean;
}

const layerProps = {
  hostId: 'msla-layer-host',
  eventBubblingEnabled: true,
};

export const PanelRoot = (props: PanelRootProps): JSX.Element => {
  const { panelLocation, displayRuntimeInfo } = props;
  const dispatch = useDispatch<AppDispatch>();

  const isDarkMode = useIsDarkMode();

  const collapsed = useIsPanelCollapsed();
  const currentPanelMode = useCurrentPanelModePanelMode();

  usePanelTabs(); // This initializes tabs for the node details panel, can't be run twice so it lives here instead of in the panel

  const [width, setWidth] = useState(PanelSize.Auto);

  useEffect(() => {
    setWidth(collapsed ? PanelSize.Auto : PanelSize.Medium);
  }, [collapsed]);

  const dismissPanel = useCallback(() => dispatch(clearPanel()), [dispatch]);

  const commonPanelProps: CommonPanelProps = useMemo(
    () => ({
      isCollapsed: collapsed,
      toggleCollapse: dismissPanel,
      width,
      layerProps,
      panelLocation: panelLocation ?? PanelLocation.Right,
    }),
    [collapsed, dismissPanel, panelLocation, width]
  );

  const onRenderFooterContent = useCallback(
    () =>
      currentPanelMode === 'WorkflowParameters' ? <WorkflowParametersPanelFooter /> : <></>, // Caught above
    [currentPanelMode]
  );

  return isUndefined(currentPanelMode) ? (
    <NodeDetailsPanel {...commonPanelProps} />
  ) : (
    <Panel
      isLightDismiss
      type={commonPanelProps.panelLocation === PanelLocation.Right ? PanelType.medium : PanelType.customNear}
      isOpen={!collapsed}
      onDismiss={dismissPanel}
      hasCloseButton={false}
      overlayProps={{ isDarkThemed: isDarkMode }}
      focusTrapZoneProps={{ disabled: collapsed, forceFocusInsideTrap: true }}
      layerProps={layerProps}
      customWidth={width}
      onRenderFooterContent={onRenderFooterContent}
      isFooterAtBottom={true}
    >
      {
        currentPanelMode === 'WorkflowParameters' ? (
          <WorkflowParametersPanel {...commonPanelProps} />
        ) : currentPanelMode === 'Discovery' ? (
          <RecommendationPanelContext {...commonPanelProps} displayRuntimeInfo={displayRuntimeInfo} />
        ) : currentPanelMode === 'NodeSearch' ? (
          <NodeSearchPanel {...commonPanelProps} displayRuntimeInfo={displayRuntimeInfo} />
        ) : currentPanelMode === 'Error' ? (
          <ErrorPanel {...commonPanelProps} />
        ) : null // Caught above
      }
    </Panel>
  );
};
