import type { ButtonContainerProps } from './ButtonContainer';
import { ButtonContainer } from './ButtonContainer';
// import { CubeTree20Filled, CubeTree20Regular, MathFormula20Filled, MathFormula20Regular } from '@fluentui/react-icons';
import {
  ZoomOut20Regular,
  ZoomOut20Filled,
  ZoomIn20Regular,
  ZoomIn20Filled,
  PageFit20Regular,
  PageFit20Filled,
  Map20Regular,
  Map20Filled,
} from '@fluentui/react-icons';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: ButtonContainer,
  title: 'Data Mapper Components/Floaties',
} as ComponentMeta<typeof ButtonContainer>;

export const CanvasControls: ComponentStory<typeof ButtonContainer> = (args: ButtonContainerProps) => <ButtonContainer {...args} />;
CanvasControls.args = {
  buttons: [
    // {
    //   tooltip: 'Zoom in',
    //   regularIcon: CubeTree20Regular,
    //   filledIcon: CubeTree20Filled,
    //   onClick: () => {
    //     // Empty
    //   },
    // },
    // {
    //   tooltip: 'Function',
    //   regularIcon: MathFormula20Regular,
    //   filledIcon: MathFormula20Filled,
    //   onClick: () => {
    //     // Empty
    //   },
    // },
    {
      tooltip: 'Zoom out',
      regularIcon: ZoomOut20Regular,
      filledIcon: ZoomOut20Filled,
      onClick: () => {
        // Empty
      },
    },
    {
      tooltip: 'Zoom in',
      regularIcon: ZoomIn20Regular,
      filledIcon: ZoomIn20Filled,
      onClick: () => {
        // Empty
      },
    },
    {
      tooltip: 'Page fit',
      regularIcon: PageFit20Regular,
      filledIcon: PageFit20Filled,
      onClick: () => {
        // Empty
      },
    },
    {
      tooltip: 'Show Mini map',
      regularIcon: Map20Regular,
      filledIcon: Map20Filled,
      // filled: displayMiniMap,
      // onClick: toggleDisplayMiniMap,
      onClick: () => {
        // Empty
      },
    },
  ],
  horizontal: true,
  xPos: '16px',
  yPos: '16px',
};

// export const Vertical: ComponentStory<typeof ButtonContainer> = (args: ButtonContainerProps) => <ButtonContainer {...args} />;
// Vertical.args = {
//   buttons: [
//     {
//       tooltip: 'Toolbox',
//       regularIcon: CubeTree20Regular,
//       filledIcon: CubeTree20Filled,
//       onClick: () => {
//         // Empty
//       },
//     },
//     {
//       tooltip: 'Function',
//       regularIcon: MathFormula20Regular,
//       filledIcon: MathFormula20Filled,
//       onClick: () => {
//         // Empty
//       },
//     },
//   ],
//   horizontal: false,
//   xPos: '16px',
//   yPos: '16px',
// };
