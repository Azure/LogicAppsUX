import type { Meta, StoryObj } from '@storybook/react';
import { NodeRunAfterIndicator } from '@microsoft/designer-ui-v2';
import { Example } from './storyFixtures';

const meta = {
  title: 'Monitoring/NodeRunAfterIndicator',
  component: NodeRunAfterIndicator,
  args: { statuses: ['succeeded'] },
  parameters: {
    docs: {
      description: {
        component:
          'Run-after summary for an edge: four dots in fixed order (succeeded, timed out, skipped, failed), filled when included. The accessible name is the full localized summary; hosts pass collapsedCount when there are too many sources to show.',
      },
    },
  },
} satisfies Meta<typeof NodeRunAfterIndicator>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Combinations: Story = {
  render: (args) => (
    <div className="sb-grid">
      {(
        [
          ['succeeded'],
          ['failed'],
          ['succeeded', 'failed'],
          ['skipped', 'timedOut'],
          ['succeeded', 'failed', 'skipped', 'timedOut'],
        ] as const
      ).map((statuses) => (
        <Example key={statuses.join('-')} label={statuses.join(', ')}>
          <NodeRunAfterIndicator {...args} statuses={statuses} />
        </Example>
      ))}
    </div>
  ),
};
export const Collapsed: Story = { args: { collapsedCount: 7 } };
export const Localized: Story = {
  args: {
    statuses: ['succeeded', 'timedOut'],
    strings: {
      status: { succeeded: 'Correcto', timedOut: 'Tiempo agotado', skipped: 'Omitido', failed: 'Error' },
      summary: (labels) => `Se ejecuta después de: ${labels.join(', ')}`,
      collapsed: (count) => `Se ejecuta después de ${count} acciones`,
    },
  },
};
