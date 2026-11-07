import React from 'react';
import renderer from 'react-test-renderer';
import GraphContainerNode from '../GraphContainerNode';
import { vi, beforeEach, describe, Mock, it, expect } from 'vitest';
import { useMonitoringView, useReadOnly, useSharedNodeUi } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useIsNodeSelectedInOperationPanel } from '../../../core/state/panel/panelSelectors';
import { useNodeMetadata } from '../../../core';
import { useActionMetadata, useIsLeafNode, useParentNodeId, useRunData } from '../../../core/state/workflow/workflowSelectors';
import { useNodeSize, useNodeLeafIndex, SUBGRAPH_TYPES } from '@microsoft/logic-apps-shared';
import { NodeProps } from '@xyflow/react';
import { AgentToolsDecoration, NodeFrame, NodeMergePoint } from '@microsoft/designer-ui-v2';
import { GraphContainer } from '@microsoft/designer-ui';
import { DefaultHandle } from '../components/handles/DefaultHandle';
import { EdgeDrawSourceHandle } from '../components/handles/EdgeDrawSourceHandle';
import { DropZone } from '../../connections/dropzone';

vi.mock('../../../core/state/designerOptions/designerOptionsSelectors', () => ({
  useReadOnly: vi.fn(),
  useMonitoringView: vi.fn(),
  useSharedNodeUi: vi.fn().mockReturnValue(false),
}));

vi.mock('../../../core/state/panel/panelSelectors', () => ({
  useIsNodeSelectedInOperationPanel: vi.fn(),
  useIsNodeInMultiSelection: vi.fn(),
}));

vi.mock('../../../core/state/workflow/workflowSelectors', () => ({
  useActionMetadata: vi.fn(),
  useNodeMetadata: vi.fn(),
  useNodeDisplayName: () => 'Actual graph display name',
  useIsLeafNode: vi.fn(),
  useParentNodeId: vi.fn(),
  useRunData: vi.fn(),
}));

vi.mock(import('@microsoft/logic-apps-shared'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNodeSize: vi.fn(),
    useNodeLeafIndex: vi.fn(),
  };
});

vi.mock(import('../../connections/dropzone'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    DropZone: (({ children, ...props }) => <div {...props}>{'DropZone'}</div>) as any,
  };
});

vi.mock(import('@xyflow/react'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNodeId: () => null,
    useNodesData: () => undefined,
    Handle: (({ children, ...props }) => <div {...props}>{'Handle reactflow'}</div>) as any,
  };
});

describe('GraphContainerNode', () => {
  const defaultProps = {
    id: 'mockId',
  } as NodeProps;

  beforeEach(() => {
    (useSharedNodeUi as Mock).mockReturnValue(false);
    (useReadOnly as Mock).mockReturnValue(false);
    (useIsNodeSelectedInOperationPanel as Mock).mockReturnValue(false);
    (useActionMetadata as Mock).mockReturnValue({});
    (useNodeMetadata as Mock).mockReturnValue({});
    (useIsLeafNode as Mock).mockReturnValue(false);
    (useMonitoringView as Mock).mockReturnValue(false);
    (useParentNodeId as Mock).mockReturnValue(null);
    (useRunData as Mock).mockReturnValue({});
    (useNodeSize as Mock).mockReturnValue({ width: 100, height: 100 });
    (useNodeLeafIndex as Mock).mockReturnValue(0);
  });

  it('should render without crashing', () => {
    const tree = renderer.create(<GraphContainerNode {...defaultProps} />).toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders the accepted shared Scope frame, vertical ports and selection without the legacy frame', () => {
    (useActionMetadata as Mock).mockReturnValue({ type: 'Scope' });
    (useIsNodeSelectedInOperationPanel as Mock).mockReturnValue(true);
    const tree = renderer.create(<GraphContainerNode {...defaultProps} data={{ presentation: { shared: true } }} />);
    expect(tree.root.findByType(NodeFrame).props).toMatchObject({
      kind: 'scope',
      selected: true,
      handleAxis: 'vertical',
      style: { width: '100%', height: '100%' },
    });
    expect(tree.root.findAllByType(GraphContainer)).toHaveLength(0);
    expect(tree.root.findByProps({ className: 'msla-graph-container-wrapper' }).props.style).toMatchObject({ padding: 0 });
  });

  it('keeps the shared Agent structural target on its top boundary rather than centering it in the compound graph', () => {
    (useSharedNodeUi as Mock).mockReturnValue(true);
    (useActionMetadata as Mock).mockReturnValue({ type: 'Agent' });
    (useNodeSize as Mock).mockReturnValue({ width: 1160, height: 741 });
    const tree = renderer.create(
      <GraphContainerNode {...defaultProps} data={{ presentation: { shared: true }, handleAxis: 'vertical' }} />
    );
    const target = tree.root.findAllByType(DefaultHandle).find(({ props }) => props.type === 'target')!;
    expect(target.props.contained).not.toBe(true);
    expect(target.findByType('div').props['data-port-contained']).toBeUndefined();
    expect(target.findByType('div').props.style?.top).not.toBe('50%');
  });

  it.each([
    ['expanded', { x: 16, y: 52, width: 304, height: 300 }],
    ['collapsed', { x: 16, y: 52, width: 280, height: 54 }],
  ])(
    'mounts the shared Agent %s decoration at accepted panel bounds with a stable marker while live shared-option is off',
    (_state, panel) => {
      (useSharedNodeUi as Mock).mockReturnValue(false);
      (useActionMetadata as Mock).mockReturnValue({ type: 'Agent' });
      const tree = renderer.create(
        <GraphContainerNode {...defaultProps} data={{ presentation: { shared: true }, handleAxis: 'vertical', toolsPanel: panel }} />
      );
      const decoration = tree.root.findByType(AgentToolsDecoration);
      expect(decoration.props).toMatchObject({
        'aria-hidden': 'true',
        role: 'presentation',
        'data-agent-tools-decoration': 'mockId',
        style: {
          position: 'absolute',
          left: panel.x,
          top: panel.y,
          width: panel.width,
          height: panel.height,
        },
      });
      const target = tree.root.findAllByType(DefaultHandle).find(({ props }) => props.type === 'target')!;
      expect(target.props.axis).toBe('vertical');
    }
  );

  it('does not mount an Agent decoration when shared presentation is off', () => {
    (useSharedNodeUi as Mock).mockReturnValue(true);
    (useActionMetadata as Mock).mockReturnValue({ type: 'Agent' });
    const tree = renderer.create(
      <GraphContainerNode
        {...defaultProps}
        data={{ presentation: { shared: false }, toolsPanel: { x: 16, y: 52, width: 304, height: 300 } }}
      />
    );
    expect(tree.root.findAllByType(AgentToolsDecoration)).toHaveLength(0);
    tree.unmount();
  });

  it('keeps nested RIGHT agent handles while mounting accepted shared decoration bounds', () => {
    (useSharedNodeUi as Mock).mockReturnValue(true);
    (useActionMetadata as Mock).mockReturnValue({ type: 'Agent' });
    const tree = renderer.create(
      <GraphContainerNode
        {...defaultProps}
        data={{ presentation: { shared: true }, handleAxis: 'horizontal', toolsPanel: { x: 20, y: 60, width: 280, height: 54 } }}
      />
    );
    const source = tree.root.findByType(EdgeDrawSourceHandle);
    expect(source.props.axis).toBe('horizontal');
    expect(source.props.contained).toBeUndefined();
    expect(tree.root.findByType(AgentToolsDecoration).props.style).toMatchObject({ left: 20, top: 60, width: 280, height: 54 });
    tree.unmount();
  });

  it.each(['If', 'Switch'])('renders the shared %s merge point with the real graph label, not a second frame', (type) => {
    (useSharedNodeUi as Mock).mockReturnValue(true);
    (useActionMetadata as Mock).mockReturnValue({ type });
    const tree = renderer.create(<GraphContainerNode {...defaultProps} data={{ presentation: { shared: true } }} />);
    expect(tree.root.findAllByType(NodeFrame)).toHaveLength(0);
    const merge = tree.root.findByType(NodeMergePoint);
    expect(merge.props.label).toBe('Actual graph display name');
    expect(tree.root.findAllByType(DefaultHandle).find(({ props }) => props.type === 'source')?.props).toMatchObject({
      presentation: 'merge',
      label: 'Actual graph display name',
    });
  });

  it('uses the accepted Foreach body rectangle instead of stretching the frame behind its header', () => {
    (useActionMetadata as Mock).mockReturnValue({ type: 'Foreach' });
    const tree = renderer.create(
      <GraphContainerNode {...defaultProps} data={{ presentation: { shared: true }, bodyFrame: { y: 114, height: 220 } }} />
    );
    expect(tree.root.findByType(NodeFrame).props).toMatchObject({
      kind: 'loop',
      handleAxis: 'vertical',
      style: { position: 'absolute', top: 114, width: '100%', height: 220 },
    });
  });

  it('retains the accepted legacy frame while a shared relayout is pending', () => {
    (useSharedNodeUi as Mock).mockReturnValue(true);
    (useActionMetadata as Mock).mockReturnValue({ type: 'Scope' });
    const tree = renderer.create(<GraphContainerNode {...defaultProps} data={{ presentation: { shared: false } }} />);
    expect(tree.root.findAllByType(NodeFrame)).toHaveLength(0);
    expect(tree.root.findAllByType(GraphContainer)).toHaveLength(1);
  });

  it('should render with footer and be a subgraph', () => {
    (useNodeMetadata as Mock).mockReturnValue({ subgraphType: SUBGRAPH_TYPES.UNTIL_DO });
    const tree = renderer.create(<GraphContainerNode {...defaultProps} />).toJSON();
    expect(tree.props.className).includes('has-footer');
    expect(tree.props.className).includes('is-subgraph');

    expect(tree).toMatchSnapshot();
  });

  it('should render graph container as normal when in monitoring view', () => {
    (useMonitoringView as Mock).mockReturnValue(true);
    (useRunData as Mock).mockReturnValue({ status: 'Success' });

    const tree = renderer.create(<GraphContainerNode {...defaultProps} />).toJSON();

    expect(tree).toMatchSnapshot();
  });

  it('should render graph container as inactive when is monitoring view', () => {
    (useMonitoringView as Mock).mockReturnValue(true);
    (useRunData as Mock).mockReturnValue({});

    const tree = renderer.create(<GraphContainerNode {...defaultProps} />).toJSON();

    expect(tree).toMatchSnapshot();
  });

  it('should apply correct styles based on node size', () => {
    const tree = renderer.create(<GraphContainerNode {...defaultProps} />).toJSON();
    expect(tree?.props.style).toEqual({ width: 100, height: 100 });
    expect(tree).toMatchSnapshot();
  });

  it('should render DropZone when showLeafComponents is true', () => {
    (useIsLeafNode as Mock).mockReturnValue(true);
    (useActionMetadata as Mock).mockReturnValue({ type: 'someType' });

    const tree = renderer.create(<GraphContainerNode {...defaultProps} />).toJSON();

    expect(tree.length).toBe(2);
    expect(tree[1].props.className).toBe('edge-drop-zone-container');
    expect(tree).toMatchSnapshot();
  });

  it('places an accepted RIGHT graph terminal after the compound while the live shared option is off', () => {
    (useIsLeafNode as Mock).mockReturnValue(true);
    (useActionMetadata as Mock).mockReturnValue({ type: 'Scope' });
    const tree = renderer.create(
      <GraphContainerNode {...defaultProps} data={{ presentation: { shared: true }, handleAxis: 'horizontal' }} />
    );
    expect(tree.root.findByType(DropZone).props).toMatchObject({ axis: 'horizontal', sharedPresentation: true, isLeaf: true });
    expect(tree.root.findByProps({ className: 'edge-drop-zone-container' }).props.style).toMatchObject({
      position: 'absolute',
      left: '100%',
      top: '50%',
      marginLeft: 8,
      width: 32,
      height: 32,
      transform: 'translateY(-50%)',
    });
    tree.unmount();
  });

  it.each([true, false])('keeps accepted DOWN graph terminal placement while the live option differs (shared=%s)', (shared) => {
    (useIsLeafNode as Mock).mockReturnValue(true);
    (useActionMetadata as Mock).mockReturnValue({ type: 'Scope' });
    (useSharedNodeUi as Mock).mockReturnValue(!shared);
    const tree = renderer.create(<GraphContainerNode {...defaultProps} data={{ presentation: { shared }, handleAxis: 'vertical' }} />);
    expect(tree.root.findByType(DropZone).props).toMatchObject({ axis: 'vertical', sharedPresentation: shared, isLeaf: true });
    expect(tree.root.findByProps({ className: 'edge-drop-zone-container' }).props.style).toBeUndefined();
    tree.unmount();
  });

  it('does not render a terminal on an accepted RIGHT graph in read-only mode', () => {
    (useIsLeafNode as Mock).mockReturnValue(true);
    (useReadOnly as Mock).mockReturnValue(true);
    (useActionMetadata as Mock).mockReturnValue({ type: 'Scope' });
    const tree = renderer.create(
      <GraphContainerNode {...defaultProps} data={{ presentation: { shared: true }, handleAxis: 'horizontal' }} />
    );
    expect(tree.root.findAllByType(DropZone)).toHaveLength(0);
    tree.unmount();
  });

  it('should not render DropZone when showLeafComponents is false', () => {
    const tree = renderer.create(<GraphContainerNode {...defaultProps} />).toJSON();
    const dropZone = tree.children.find((child) => child.props.className.includes('edge-drop-zone-container'));

    expect(dropZone).toBeFalsy();
    expect(tree).toMatchSnapshot();
  });
});
