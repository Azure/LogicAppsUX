import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { ReactFlow, type Node } from '@xyflow/react';
import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { getPrecomputedHandles } from '../../../../../core/graphlayout/precomputedHandles';
import { EdgeDrawSourceHandle } from '../EdgeDrawSourceHandle';
import { EdgeDrawTargetHandle } from '../EdgeDrawTargetHandle';
import { DefaultHandle } from '../DefaultHandle';
import { NodeHandle } from '@microsoft/designer-ui-v2';

vi.mock('../../../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useSharedNodeUi: () => false,
  useReadOnly: () => false,
}));

const ActualCard = () => (
  <>
    <EdgeDrawTargetHandle />
    <EdgeDrawSourceHandle />
  </>
);
const ActualBranch = () => (
  <NodeHandle variant="success">
    <DefaultHandle type="source" id="real-branch" contained />
  </NodeHandle>
);
const types = { actual: ActualCard, branch: ActualBranch, [WORKFLOW_NODE_TYPES.OPERATION_NODE]: ActualCard };

describe('shared visuals contain actual XYFlow ports', () => {
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
  });
  afterAll(() => vi.unstubAllGlobals());

  it('culls offscreen cards before any ResizeObserver measurement and mounts them when keyboard culling is disabled', () => {
    const nodes: Node[] = [0, 2000].map((x, index) => {
      const node: Node = {
        id: `action-${index}`,
        type: WORKFLOW_NODE_TYPES.OPERATION_NODE,
        position: { x, y: 0 },
        initialWidth: 200,
        initialHeight: 44,
        data: { presentation: { shared: false } },
      };
      return { ...node, handles: getPrecomputedHandles(node, 200, 44) };
    });
    const { container, rerender } = render(
      <ReactFlow width={600} height={400} nodeTypes={types} nodes={nodes} onlyRenderVisibleElements />
    );
    expect(container.querySelectorAll('.react-flow__node')).toHaveLength(1);
    expect(container.querySelector('[data-id="action-1"]')).toBeNull();
    expect(container.querySelector<HTMLElement>('[data-id="action-0"]')?.style.height).toBe('');
    rerender(<ReactFlow width={600} height={400} nodeTypes={types} nodes={nodes} onlyRenderVisibleElements={false} />);
    expect(container.querySelectorAll('.react-flow__node')).toHaveLength(2);
  });

  it('retains the actual source/target hit elements and connection permissions under accepted shared geometry', () => {
    const { container } = render(
      <ReactFlow
        width={600}
        height={400}
        nodeTypes={types}
        nodes={[
          {
            id: 'real-operation',
            type: 'actual',
            position: { x: 0, y: 0 },
            width: 232,
            height: 74,
            data: { presentation: { shared: true } },
          },
        ]}
      />
    );
    const ports = container.querySelectorAll('.react-flow__handle');
    expect(ports).toHaveLength(2);
    expect(container.querySelector('.react-flow__handle.source')).toHaveClass('connectablestart');
    expect(container.querySelector('.react-flow__handle.source')).not.toHaveClass('connectableend');
    expect(container.querySelector('.react-flow__handle.target')).toHaveClass('connectableend');
    expect(container.querySelector('.react-flow__handle.target')).not.toHaveClass('connectablestart');
    expect(container.querySelectorAll('.react-flow__handle [data-handle]')).toHaveLength(2);
    expect(container.querySelectorAll('.react-flow__handle[data-handleid]')).toHaveLength(0);
  });

  it('registers the host-provided branch handle identity inside one canonical slot without making it draw-connectable', () => {
    const { container } = render(
      <ReactFlow
        width={600}
        height={400}
        nodeTypes={types}
        nodes={[
          {
            id: 'real-condition',
            type: 'branch',
            position: { x: 0, y: 0 },
            width: 160,
            height: 74,
            data: { presentation: { shared: true } },
          },
        ]}
      />
    );
    expect(container.querySelectorAll('[data-handle="success"]')).toHaveLength(1);
    const port = container.querySelector('.react-flow__handle');
    expect(port).toHaveAttribute('data-nodeid', 'real-condition');
    expect(port).toHaveAttribute('data-handleid', 'real-branch');
    expect(port).not.toHaveClass('connectable');
    expect(container.querySelector('[data-handle="success"]')).toContainElement(port);
  });
});
