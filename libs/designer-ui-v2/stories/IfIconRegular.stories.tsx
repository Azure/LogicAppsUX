import type { Meta, StoryObj } from '@storybook/react';
import { IfIconRegular, IfIconFilled, NODE_GLYPHS, getNodeGlyph } from '@microsoft/designer-ui-v2';
import type { NodeVisualKind } from '@microsoft/designer-ui-v2';
import { Example } from './storyFixtures';

const meta = {
  title: 'Icons/IfIconRegular',
  component: IfIconRegular,
  parameters: {
    controls: { disable: true },
    docs: {
      description: {
        component:
          'Regular condition glyph. No props are declared; size/color come from surrounding typography. Give standalone meaningful icons a host label, or hide decorative artwork.',
      },
    },
  },
} satisfies Meta<typeof IfIconRegular>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Regular: Story = {
  render: () => (
    <span className="sb-glyph" role="img" aria-label="If condition">
      <IfIconRegular />
    </span>
  ),
};
export const PairedWithFilled: Story = {
  render: () => (
    <div className="sb-grid">
      <Example label="Regular">
        <span className="sb-glyph" aria-hidden="true">
          <IfIconRegular />
        </span>
      </Example>
      <Example label="Filled">
        <span className="sb-glyph" aria-hidden="true">
          <IfIconFilled />
        </span>
      </Example>
    </div>
  ),
};
export const VisualKindVocabulary: Story = {
  render: () => (
    <div className="sb-grid">
      {(Object.keys(NODE_GLYPHS) as NodeVisualKind[]).map((kind) => {
        const glyph = getNodeGlyph(kind);
        return (
          <Example key={kind} label={kind}>
            <span className="sb-glyph" aria-hidden="true">
              <glyph.regular />
              <glyph.filled />
            </span>
          </Example>
        );
      })}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'The 14 finite NODE_GLYPHS/getNodeGlyph regular/filled pairs are existing artwork, not a connector registry, metadata loader or branding API.',
      },
    },
  },
};
