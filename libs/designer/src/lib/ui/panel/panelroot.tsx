import type { AppDispatch } from '../../core';
import { useIsDarkMode } from '../../core/state/designerOptions/designerOptionsSelectors';
import { useCurrentPanelModePanelMode, useIsPanelCollapsed } from '../../core/state/panel/panelSelectors';
import { clearPanel } from '../../core/state/panel/panelSlice';
import { ErrorPanel } from './errorsPanel/errorsPanel';
import { NodeDetailsPanel } from './nodeDetailsPanel/nodeDetailsPanel';
import { NodeSearchPanel } from './nodeSearchPanel/nodeSearchPanel';
import { RecommendationPanelContext } from './recommendation/recommendationPanelContext';
import { WorkflowParametersPanel } from './workflowParametersPanel/workflowParametersPanel';
import { Panel, PanelType } from '@fluentui/react';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { PanelLocation, PanelSize } from '@microsoft/designer-ui';
import { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';

export interface PanelRootProps {
  panelLocation?: PanelLocation;
  displayRuntimeInfo: boolean;
}

export const PanelRoot = (props: PanelRootProps): JSX.Element => {
  const { panelLocation, displayRuntimeInfo } = props;
  const dispatch = useDispatch<AppDispatch>();

  const isDarkMode = useIsDarkMode();

  const collapsed = useIsPanelCollapsed();
  const currentPanelMode = useCurrentPanelModePanelMode();

  const [width, setWidth] = useState(PanelSize.Auto);

  useEffect(() => {
    collapsed ? setWidth(PanelSize.Auto) : setWidth(PanelSize.Medium);
  }, [collapsed]);

  const dismissPanel = () => dispatch(clearPanel());

  const layerProps = {
    hostId: 'msla-layer-host',
    eventBubblingEnabled: true,
  };

  const commonPanelProps: CommonPanelProps = {
    isCollapsed: collapsed,
    toggleCollapse: dismissPanel,
    width,
    layerProps,
    panelLocation: panelLocation ?? PanelLocation.Right,
  };

  return !currentPanelMode ? (
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
    >
      {currentPanelMode === 'WorkflowParameters' ? (
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
