import { MonitoringPayloadComparison } from '@microsoft/designer-ui-v2';
import type { MonitoringPayloadComparisonProps } from '@microsoft/designer-ui-v2';
import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { useState } from 'react';

function ExampleSection({ title }: { title: string }) {
  return (
    <section
      style={{
        border: '1px solid var(--colorNeutralStroke2)',
        borderRadius: '8px',
        padding: '12px',
        background: 'var(--colorNeutralBackground1)',
      }}
    >
      <header style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginBlockEnd: '8px' }}>
        <strong style={{ flex: '1 1 16ch', minInlineSize: 0 }}>{title}</strong>
        <button type="button">{`Open ${title}`}</button>
      </header>
      <div style={{ maxHeight: '120px', overflow: 'auto' }}>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {`{\n  "message": "Long payload text wraps inside each pane without widening the host layout.",\n  "id": "abc123"\n}`}
        </pre>
      </div>
    </section>
  );
}

const inputsSection = <ExampleSection title="Inputs" />;
const outputsSection = <ExampleSection title="Outputs with a longer localized header title" />;
const propertiesSection = <ExampleSection title="Properties" />;

const meta = {
  title: 'Monitoring/MonitoringPayloadComparison',
  component: MonitoringPayloadComparison,
  args: {
    inputsSection,
    outputsSection,
    propertiesSection,
  },
  parameters: {
    docs: {
      description: {
        component: 'Responsive layout for host-rendered Inputs, Outputs, and Properties. The host owns payload content and controls.',
      },
    },
  },
} satisfies Meta<typeof MonitoringPayloadComparison>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

function ResizableHost(args: MonitoringPayloadComparisonProps) {
  const [width, setWidth] = useState(656);
  return (
    <div style={{ display: 'grid', gap: '12px' }}>
      <label style={{ display: 'grid', gap: '6px', maxWidth: '30rem' }}>
        Comparison content width: {width}px
        <input type="range" min={300} max={900} step={1} value={width} onChange={(event) => setWidth(Number(event.target.value))} />
      </label>
      <div data-testid="monitoring-host" style={{ inlineSize: `${width}px` }}>
        <MonitoringPayloadComparison {...args} />
      </div>
    </div>
  );
}

export const HostWidthFixture: Story = {
  render: (args) => <ResizableHost {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const host = canvas.getByTestId('monitoring-host');
    const grid = host.querySelector('[data-monitoring-payload-grid]');
    if (!grid) {
      throw new Error('Monitoring payload grid did not render');
    }
    const [inputsPane, outputsPane] = Array.from(grid.children);
    const inputTop = () => inputsPane.getBoundingClientRect().top;
    const outputTop = () => outputsPane.getBoundingClientRect().top;
    const inputs = canvas.getByRole('button', { name: 'Open Inputs' });
    const outputs = canvas.getByRole('button', { name: /^Open Outputs/ });
    const properties = canvas.getByRole('button', { name: 'Open Properties' });
    const rootFontSize = Number.parseFloat(getComputedStyle(canvasElement.ownerDocument.documentElement).fontSize);
    const gap = Number.parseFloat(getComputedStyle(grid).columnGap);
    const splitWidth = 40 * rootFontSize + gap;
    const initialWidth = host.style.inlineSize;

    // Resize the host directly so interacting with the slider cannot steal focus.
    host.style.inlineSize = `${splitWidth - 1}px`;
    await userEvent.click(inputs);
    await expect(outputTop()).toBeGreaterThan(inputTop());

    host.style.inlineSize = `${splitWidth}px`;
    await expect(grid.getBoundingClientRect().width).toBeCloseTo(splitWidth);
    await expect(outputTop()).toBe(inputTop());
    await expect(inputs).toHaveFocus();
    await userEvent.tab();
    await expect(outputs).toHaveFocus();

    host.style.inlineSize = `${splitWidth + 1}px`;
    await expect(outputTop()).toBe(inputTop());
    host.style.inlineSize = `${splitWidth - 1}px`;
    await expect(outputTop()).toBeGreaterThan(inputTop());
    await expect(outputs).toHaveFocus();
    await userEvent.tab();
    await expect(properties).toHaveFocus();
    host.style.inlineSize = initialWidth;
  },
};
