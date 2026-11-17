import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, waitFor, within } from '@storybook/test';
import { FluentProvider, webDarkTheme, webLightTheme } from '@fluentui/react-components';
import {
  ActionNodeCard,
  AgentNodeCard,
  DesignerUiScope,
  NodeHoverCard,
  NodeInfoCard,
  useDesignerUiOutlet,
} from '@microsoft/designer-ui-v2';
import { BrowserPreferences, requestIcon } from './storyFixtures';

function OutletStatus() {
  const outlet = useDesignerUiOutlet();
  return (
    <output className="sb-note">
      Scoped popover outlet: {outlet ? 'ready in this document' : 'unavailable (scope disabled or mounting)'}
    </output>
  );
}
const meta = {
  title: 'Foundations/DesignerUiScope',
  component: DesignerUiScope,
  args: { enabled: true },
  argTypes: { mode: { control: 'inline-radio', options: ['light', 'dark'] }, children: { control: false } },
  parameters: {
    designerScope: false,
    docs: {
      description: {
        component:
          'Pairs a local token scope/outlet with the matching Fluent web theme. Inherits host typography. Disabled scope emits no token overrides/outlet context; no outer DesignerUiScope is applied to this demonstration.',
      },
    },
  },
  render: (args, { globals }) => {
    const mode = args.mode ?? (globals.theme === 'dark' ? 'dark' : 'light');
    const direction = globals.direction === 'rtl' ? 'rtl' : 'ltr';
    return (
      <FluentProvider theme={mode === 'dark' ? webDarkTheme : webLightTheme} dir={direction}>
        <DesignerUiScope {...args} mode={mode} dir={direction} className="sb-stack">
          <div className="sb-grid">
            <ActionNodeCard title="Send request" status="running" />
            <AgentNodeCard title="Triage assistant" model="Display label only" />
          </div>
          <NodeHoverCard
            card={(close) => (
              <NodeInfoCard
                title="Scoped information"
                category="action"
                icon={requestIcon}
                description="This popover mounts in the same-document scoped outlet."
                onDismiss={close}
              />
            )}
          >
            <button type="button">Focus or hover to inspect the outlet</button>
          </NodeHoverCard>
          <OutletStatus />
          <BrowserPreferences />
        </DesignerUiScope>
      </FluentProvider>
    );
  },
} satisfies Meta<typeof DesignerUiScope>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Light: Story = { args: { mode: 'light' } };
export const Dark: Story = { args: { mode: 'dark' } };
export const Disabled: Story = { args: { enabled: false } };
export const LocalTokenOverride: Story = {
  args: { tokens: { 'node-surface': 'var(--colorBrandBackground2)', 'node-border-selected': 'var(--colorBrandStroke1)' } },
  parameters: {
    docs: {
      description: {
        story: 'Only this scope changes. Fluent theme/brand remains the provider’s responsibility; this is not a new theme preset.',
      },
    },
  },
};

function CoordinatedHover({ name }: { name: string }) {
  return (
    <NodeHoverCard openDelay={0} closeDelay={0} card={<NodeInfoCard category="action" icon={requestIcon} title={`${name} information`} />}>
      <button type="button">{name}</button>
    </NodeHoverCard>
  );
}
export const ScopedHoverGroups: Story = {
  render: () => (
    <div className="sb-grid">
      {['First', 'Second'].map((scope) => (
        <DesignerUiScope key={scope} className="sb-stack">
          <CoordinatedHover name={`${scope} A`} />
          <CoordinatedHover name={`${scope} B`} />
        </DesignerUiScope>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // Keep keyboard focus in one scope while the pointer exercises the other scope's coordinator.
    canvas.getByRole('button', { name: 'Second B' }).focus();
    await userEvent.tab({ shift: true });
    await canvas.findByText('Second A information');
    await userEvent.hover(canvas.getByRole('button', { name: 'First A' }));
    await canvas.findByText('First A information');
    await userEvent.hover(canvas.getByRole('button', { name: 'First B' }));
    await canvas.findByText('First B information');
    await waitFor(() => expect(canvas.queryByText('First A information')).not.toBeInTheDocument());
    await expect(canvas.getByText('Second A information')).toBeInTheDocument();
  },
};
export const DisabledBoundary: Story = {
  render: () => (
    <DesignerUiScope className="sb-stack">
      <CoordinatedHover name="Parent scope" />
      <button type="button">Keyboard starting point</button>
      <DesignerUiScope enabled={false}>
        <CoordinatedHover name="Disabled boundary" />
      </DesignerUiScope>
    </DesignerUiScope>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole('button', { name: 'Keyboard starting point' }).focus();
    await userEvent.tab({ shift: true });
    await canvas.findByText('Parent scope information');
    await userEvent.hover(canvas.getByRole('button', { name: 'Disabled boundary' }));
    // Disabled scopes use Fluent's native portal, outside this story canvas.
    await within(canvasElement.ownerDocument.body).findByText('Disabled boundary information');
    await expect(canvas.getByText('Parent scope information')).toBeInTheDocument();
  },
};
