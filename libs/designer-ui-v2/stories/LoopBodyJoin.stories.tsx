import { LoopBodyJoin, useLoopBodyHoverClass } from '@microsoft/designer-ui-v2';
import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';

function JoinExample({ active, ...args }: ComponentProps<typeof LoopBodyJoin> & { active?: boolean }) {
  const bodyClass = useLoopBodyHoverClass('body');
  return (
    <div className={bodyClass} data-loop-active={active || undefined} style={{ position: 'relative', width: 100, height: 48 }}>
      <LoopBodyJoin {...args} />
    </div>
  );
}

const meta = {
  title: 'Connections/LoopBodyJoin',
  component: LoopBodyJoin,
  args: { x: 50, y: 4, length: 40 },
  parameters: {
    docs: {
      description: {
        component: 'Draws the decorative, arrowless join between a vertical loop header and body. Hosts provide accepted coordinates.',
      },
    },
  },
} satisfies Meta<typeof LoopBodyJoin>;
export default meta;

export const Default: StoryObj<typeof meta> = { render: (args) => <JoinExample {...args} /> };
export const Highlighted: StoryObj<typeof meta> = { render: (args) => <JoinExample {...args} active /> };
