import { ButtonContainer } from '../buttonContainer/ButtonContainer';
import type { ButtonContainerProps } from '../buttonContainer/ButtonContainer';
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
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { MiniMap, useReactFlow } from 'reactflow';
import type { Node } from 'reactflow';

const miniMapStyles: React.CSSProperties = {
  left: 16,
  bottom: 56,
  // TODO resize smaller to match the width of the buttons (128px wide)
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
    defaultMessage: 'Page fit',
    description: 'Label to fit the whole canvas in view',
  });

  const displayMiniMapLoc = intl.formatMessage({
    defaultMessage: 'Display mini map',
    description: 'Label to toggle the mini map',
  });

  const mapControlsButtonContainerProps: ButtonContainerProps = useMemo(
    () => ({
      buttons: [
        {
          tooltip: zoomOutLoc,
          regularIcon: ZoomOut20Regular,
          filledIcon: ZoomOut20Filled,
          onClick: zoomOut,
        },
        {
          tooltip: zoomInLoc,
          regularIcon: ZoomIn20Regular,
          filledIcon: ZoomIn20Filled,
          onClick: zoomIn,
        },
        {
          tooltip: fitViewLoc,
          regularIcon: PageFit20Regular,
          filledIcon: PageFit20Filled,
          onClick: fitView,
        },
        {
          tooltip: displayMiniMapLoc,
          regularIcon: Map20Regular,
          filledIcon: Map20Filled,
          filled: displayMiniMap,
          onClick: toggleDisplayMiniMap,
        },
      ],
      horizontal: true,
      xPos: '16px',
      yPos: '16px',
      anchorToBottom: true,
    }),
    [displayMiniMap, toggleDisplayMiniMap, zoomOut, zoomIn, fitView, displayMiniMapLoc, zoomOutLoc, zoomInLoc, fitViewLoc]
  );

  const getNodeColor = (node: Node) => {
    if (node.style?.backgroundColor) {
      return node.style.backgroundColor;
    }

    return '#F3F2F1';
  };

  const getNodeStrokeColor = (node: Node) => {
    if (node.style?.backgroundColor) {
      return node.style.backgroundColor;
    }

    return '#F3F2F1';
  };

  return (
    <>
      <ButtonContainer {...mapControlsButtonContainerProps} />

      {displayMiniMap && <MiniMap nodeColor={getNodeColor} nodeStrokeColor={getNodeStrokeColor} style={miniMapStyles} />}
    </>
  );
};
