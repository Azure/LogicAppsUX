import { checkerboardBackgroundImage } from '../../constants/ReactFlowConstants';
import type { ButtonContainerProps } from './ButtonContainer';
import { ButtonContainer } from './ButtonContainer';
import { tokens } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import {
  CubeTree20Filled,
  CubeTree20Regular,
  Map20Filled,
  Map20Regular,
  MathFormula20Filled,
  MathFormula20Regular,
  PageFit20Filled,
  PageFit20Regular,
  ZoomIn20Filled,
  ZoomIn20Regular,
  ZoomOut20Filled,
  ZoomOut20Regular,
} from '@fluentui/react-icons';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import ReactFlow, { MiniMap, ReactFlowProvider, useReactFlow } from 'react-flow-renderer';

export default {
  component: ButtonContainer,
  title: 'Data Mapper Components/Floaties/Button Container',
} as ComponentMeta<typeof ButtonContainer>;

export const Standard: ComponentStory<typeof ButtonContainer> = (args: ButtonContainerProps) => <ButtonContainer {...args} />;
Standard.args = {
  buttons: [
    {
      tooltip: 'Toolbox',
      regularIcon: CubeTree20Regular,
      filledIcon: CubeTree20Filled,
      onClick: () => {
        // Empty
      },
    },
    {
      tooltip: 'Function',
      regularIcon: MathFormula20Regular,
      filledIcon: MathFormula20Filled,
      onClick: () => {
        // Empty
      },
    },
  ],
  horizontal: true,
  xPos: '16px',
  yPos: '16px',
};

export const CanvasControl: ComponentStory<typeof ButtonContainer> = () => {
  return (
    <ReactFlowProvider>
      <ReactFlowComponent />
    </ReactFlowProvider>
  );
};

const ReactFlowComponent = (): JSX.Element => {
  const { fitView, zoomIn, zoomOut } = useReactFlow();
  const [displayMiniMap, { toggle: toggleDisplayMiniMap }] = useBoolean(false);

  const args = {
    buttons: [
      {
        tooltip: 'Zoom out',
        regularIcon: ZoomOut20Regular,
        filledIcon: ZoomOut20Filled,
        onClick: zoomOut,
      },
      {
        tooltip: 'Zoom in',
        regularIcon: ZoomIn20Regular,
        filledIcon: ZoomIn20Filled,
        onClick: zoomIn,
      },
      {
        tooltip: 'Fit view',
        regularIcon: PageFit20Regular,
        filledIcon: PageFit20Filled,
        onClick: fitView,
      },
      {
        tooltip: 'Display minimap',
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
  };

  return (
    <div style={{ height: '500px', width: '500px', border: '5px solid black' }}>
      <ReactFlow
        proOptions={{
          account: 'paid-sponsor',
          hideAttribution: true,
        }}
        style={{
          backgroundImage: checkerboardBackgroundImage,
          backgroundPosition: '0 0, 11px 11px',
          backgroundSize: '22px 22px',
          borderRadius: tokens.borderRadiusMedium,
        }}
      >
        <ButtonContainer {...args} />

        {displayMiniMap && <MiniMap />}
      </ReactFlow>
    </div>
  );
};
