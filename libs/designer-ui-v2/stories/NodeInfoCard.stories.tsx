import { useState } from 'react';
import { Button } from '@fluentui/react-components';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, fn, userEvent, within } from '@storybook/test';
import { NodeInfoCard } from '@microsoft/designer-ui-v2';
import type { NodeInfoCardProps } from '@microsoft/designer-ui-v2';
import { categoryControl, Example, requestIcon } from './storyFixtures';

const meta = {
  title: 'Information/NodeInfoCard',
  component: NodeInfoCard,
  args: {
    category: 'action',
    icon: requestIcon,
    title: 'Send request',
    subtitle: 'Built-in · HTTP',
    configured: true,
    description: 'Sends an HTTP request with the configuration supplied by the host.',
  },
  argTypes: { category: categoryControl, icon: { control: false }, actions: { control: false }, description: { control: 'text' } },
  parameters: {
    docs: {
      description: {
        component:
          'Information-only surface. Absolute HTTP(S) links open a new tab with noopener/noreferrer; malformed, relative and non-HTTP links are suppressed.',
      },
    },
  },
} satisfies Meta<typeof NodeInfoCard>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Minimal: Story = { args: { subtitle: undefined, configured: false, description: undefined } };
export const Categories: Story = {
  render: (args) => (
    <div className="sb-grid">
      {(['trigger', 'action', 'control', 'agent'] as const).map((category) => (
        <Example key={category} label={category}>
          <NodeInfoCard {...args} category={category} icon={null} />
        </Example>
      ))}
    </div>
  ),
};
export const SafeLinks: Story = {
  render: (args) => (
    <div className="sb-grid">
      {[
        'https://learn.microsoft.com/azure/logic-apps/',
        'http://example.com/documentation',
        'mailto:example@example.com',
        '/relative',
        'not a URL',
      ].map((learnMoreHref) => (
        <Example key={learnMoreHref} label={learnMoreHref}>
          <NodeInfoCard {...args} learnMoreHref={learnMoreHref} />
        </Example>
      ))}
    </div>
  ),
};
function Dismissible(args: NodeInfoCardProps) {
  const [visible, setVisible] = useState(true);
  const [inspected, setInspected] = useState(false);
  return (
    <div className="sb-stack">
      {visible ? (
        <NodeInfoCard
          {...args}
          onDismiss={() => {
            args.onDismiss?.();
            setVisible(false);
          }}
          actions={
            <Button size="small" onClick={() => setInspected(true)}>
              Inspect
            </Button>
          }
        />
      ) : (
        <Button onClick={() => setVisible(true)}>Restore information</Button>
      )}
      <output data-testid="info-state">
        {visible ? 'Information visible' : 'Information dismissed'}; {inspected ? 'inspected' : 'not inspected'}
      </output>
    </div>
  );
}
export const DismissAndRestore: Story = {
  args: { onDismiss: fn() },
  render: (args) => <Dismissible {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole('button', { name: 'Close' }).focus();
    await userEvent.keyboard('{Enter}');
    await expect(canvas.getByTestId('info-state')).toHaveTextContent('Information dismissed');
    await userEvent.click(canvas.getByRole('button', { name: 'Restore information' }));
    await expect(canvas.getByRole('button', { name: 'Close' })).toBeVisible();
  },
};
