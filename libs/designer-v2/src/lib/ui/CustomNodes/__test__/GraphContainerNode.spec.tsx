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
import { NodeFrame, NodeMergePoint } from '@microsoft/designer-ui-v2';
import { GraphContainer } from '@microsoft/designer-ui';
import { DefaultHandle } from '../components/handles/DefaultHandle';

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

  it('should not render DropZone when showLeafComponents is false', () => {
    const tree = renderer.create(<GraphContainerNode {...defaultProps} />).toJSON();
    const dropZone = tree.children.find((child) => child.props.className.includes('edge-drop-zone-container'));

    expect(dropZone).toBeFalsy();
    expect(tree).toMatchSnapshot();
  });
});
