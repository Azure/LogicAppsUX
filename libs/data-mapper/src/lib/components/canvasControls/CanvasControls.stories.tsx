import { checkerboardBackgroundImage } from '../../constants/ReactFlowConstants';
import { CanvasControls } from './CanvasControls';
import type { CanvasControlsProps } from './CanvasControls';
import { tokens } from '@fluentui/react-components';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
// eslint-disable-next-line import/no-named-as-default
import ReactFlow, { ReactFlowProvider } from 'reactflow';

export default {
  component: CanvasControls,
  title: 'Data Mapper Component/Floaties/Canvas Controls',
} as ComponentMeta<typeof CanvasControls>;

export const Standard: ComponentStory<typeof CanvasControls> = (args: CanvasControlsProps) => (
  <ReactFlowProvider>
    <ReactFlowComponent {...args} />
  </ReactFlowProvider>
);

const ReactFlowComponent = (props: CanvasControlsProps) => {
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
        <CanvasControls {...props} />
      </ReactFlow>
    </div>
  );
};
