import type { Meta, StoryObj } from '@storybook/react';
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
