import { reactFlowFitViewOptions, ReactFlowNodeType } from '../../constants/ReactFlowConstants';
import { customTokens } from '../../core';
import type { ButtonContainerProps } from '../buttonContainer/ButtonContainer';
import { ButtonContainer } from '../buttonContainer/ButtonContainer';
import { tokens } from '@fluentui/react-components';
import {
  Map20Filled,
  Map20Regular,
  PageFit20Filled,
  PageFit20Regular,
  ZoomIn20Filled,
  ZoomIn20Regular,
  ZoomOut20Filled,
  ZoomOut20Regular,
} from '@fluentui/react-icons';
import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import type { Node, ZoomInOut } from 'reactflow';
import { MiniMap, useReactFlow } from 'reactflow';

const miniMapStyles: React.CSSProperties = {
  backgroundColor: tokens.colorNeutralBackground1,
  borderRadius: tokens.borderRadiusMedium,
  height: 77,
  width: 128,
  left: 0,
  bottom: 40,
};

export interface CanvasControlsProps {
  displayMiniMap: boolean;
  toggleDisplayMiniMap: () => void;
}

export const CanvasControls = ({ displayMiniMap, toggleDisplayMiniMap }: CanvasControlsProps) => {
  const intl = useIntl();
  const { fitView, zoomIn, zoomOut } = useReactFlow();

  const zoomOutLoc = intl.formatMessage({
    defaultMessage: 'Zoom out',
    description: 'Label to zoom the canvas out',
  });

  const zoomInLoc = intl.formatMessage({
    defaultMessage: 'Zoom in',
    description: 'Label to zoom the canvas in',
  });

  const fitViewLoc = intl.formatMessage({
    defaultMessage: 'Zoom to fit',
    description: 'Label to fit the whole canvas in view',
  });

  const showMiniMapLoc = intl.formatMessage({
    defaultMessage: 'Show mini-map',
    description: 'Label to show the mini-map',
  });

  const hideMiniMapLoc = intl.formatMessage({
    defaultMessage: 'Hide mini-map',
    description: 'Label to hide the mini-map',
  });

  const onZoomInClick = useCallback<ZoomInOut>(() => {
    // TODO Log telemetry
    return zoomIn();
  }, [zoomIn]);

  const onZoomOutClick = useCallback<ZoomInOut>(() => {
    // TODO Log telemetry
    return zoomOut();
  }, [zoomOut]);

  const onFitWindowClick = useCallback<ZoomInOut>(() => {
    // TODO Log telemetry
    return fitView(reactFlowFitViewOptions);
  }, [fitView]);

  const onToggleMiniMapClick = useCallback<ZoomInOut>(() => {
    // TODO Log telemetry
    return toggleDisplayMiniMap();
  }, [toggleDisplayMiniMap]);

  const mapControlsButtonContainerProps: ButtonContainerProps = useMemo(
    () => ({
      buttons: [
        {
          tooltip: zoomOutLoc,
          regularIcon: ZoomOut20Regular,
          filledIcon: ZoomOut20Filled,
          onClick: onZoomOutClick,
        },
        {
          tooltip: zoomInLoc,
          regularIcon: ZoomIn20Regular,
          filledIcon: ZoomIn20Filled,
          onClick: onZoomInClick,
        },
        {
          tooltip: fitViewLoc,
          regularIcon: PageFit20Regular,
          filledIcon: PageFit20Filled,
          onClick: onFitWindowClick,
        },
        {
          tooltip: displayMiniMap ? hideMiniMapLoc : showMiniMapLoc,
          regularIcon: Map20Regular,
          filledIcon: Map20Filled,
          filled: displayMiniMap,
          onClick: onToggleMiniMapClick,
        },
      ],
      horizontal: true,
      xPos: '16px',
      yPos: '16px',
      anchorToBottom: true,
    }),
    [
      displayMiniMap,
      fitViewLoc,
      hideMiniMapLoc,
      onFitWindowClick,
      onToggleMiniMapClick,
      onZoomInClick,
      onZoomOutClick,
      showMiniMapLoc,
      zoomInLoc,
      zoomOutLoc,
    ]
  );

  const getNodeColor = (node: Node) => {
    switch (node.type) {
      case ReactFlowNodeType.SchemaNode:
        return tokens.colorNeutralBackground4;
      case ReactFlowNodeType.FunctionNode:
        return customTokens[node.data.functionBranding.colorTokenName];
      default:
        return tokens.colorNeutralBackground4;
    }
  };

  return (
    <>
      <ButtonContainer {...mapControlsButtonContainerProps} />

      {displayMiniMap && <MiniMap nodeColor={getNodeColor} nodeStrokeColor={getNodeColor} style={miniMapStyles} />}
    </>
  );
};
