import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it, vi } from 'vitest';
import type { Workflow } from '../../../../common/models/workflow';
import { buildWorkflowExtractionPlan } from '../../../../core/utils/workflowExtraction';
import { PreviewOperationCard, SharedExtractionPreviewCard, type SharedPreviewFlowNode } from '../SharedExtractionPreviewNode';
import type { NodeProps } from '@xyflow/react';
import { useConnectorName } from '../../../../core/state/selectors/actionMetadataSelector';
import { initialWorkflowState } from '../../../../core/state/workflow/workflowSlice';
import {
  getSharedWorkflowExtractionPreview,
  getWorkflowExtractionPreview,
  type SharedExtractionPreviewNode,
} from '../workflowExtractionPreview';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';

vi.mock('../../../../core/state/selectors/actionMetadataSelector', () => ({ useConnectorName: vi.fn() }));
vi.mock('@xyflow/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@xyflow/react')>()),
  Handle: ({ type, isConnectable }: { type: string; isConnectable: boolean }) => (
    <span data-preview-handle={type} data-connectable={isConnectable} />
  ),
}));

const invocation = (name: string, body: Record<string, unknown>, runAfter?: LogicAppsV2.RunAfter) => ({
  type: 'Workflow',
  inputs: { host: { workflow: { id: name } }, body },
  runAfter,
});
const workflowFor = (operation: LogicAppsV2.ActionDefinition): Workflow => ({
  kind: 'Stateful',
  connectionReferences: {},
  definition: {
    ...initialWorkflowState.originalDefinition,
    triggers: { Original_request: { type: 'Request', kind: 'Http', inputs: {} } },
    actions: {
      Request: { ...operation, runAfter: {} },
      Response: { type: 'Compose', inputs: 'after', runAfter: { Request: ['Succeeded'] } },
    },
  },
});

const cases: { operation: LogicAppsV2.ActionDefinition; card: string }[] = [
  { operation: { type: 'Compose', inputs: 'value' }, card: 'action' },
  { operation: { type: 'ApiConnection', inputs: {} }, card: 'action' },
  { operation: { type: 'Scope', actions: { Nested: { type: 'Compose', inputs: 'inside' } } }, card: 'action' },
  { operation: { type: 'If', expression: '@equals(1,1)', actions: {}, else: { actions: {} } }, card: 'if' },
  { operation: { type: 'Switch', expression: 'value', cases: {}, default: { actions: {} } }, card: 'switch' },
  { operation: { type: 'Foreach', foreach: '@createArray(1)', actions: {} }, card: 'foreach' },
  { operation: { type: 'Until', expression: '@equals(1,1)', actions: {}, limit: { count: 1 } }, card: 'foreach' },
  { operation: { type: 'Agent', inputs: { parameters: { deploymentId: 'actual-deployment' } }, tools: {} }, card: 'agent' },
];

describe('shared extraction projection and canonical opaque families', () => {
  it.each(cases)('uses the real planner and child $operation.type definition without expanding nested content', ({ operation, card }) => {
    const plan = buildWorkflowExtractionPlan(workflowFor(operation), ['Request', 'Response'], 'Child', invocation);
    const original = JSON.stringify(plan);
    const graph = getWorkflowExtractionPreview(plan);
    const projected = getSharedWorkflowExtractionPreview(plan, graph);
    expect(projected.nodes.map(({ id }) => id)).toEqual(graph.nodes.map(({ id }) => id));
    expect(projected.edges).toBe(graph.edges);
    expect(projected.nodes[0]).toMatchObject({ id: 'Request_2', isTrigger: true, operation: { type: 'Request' } });
    expect(projected.nodes[1].operation).toEqual(plan.child.definition.actions?.Request);
    expect(projected.nodes.some(({ id }) => id === 'Nested')).toBe(false);
    const { container } = render(
      <IntlProvider locale="en">
        <PreviewOperationCard node={projected.nodes[1]} domId="preview-instance-Request" />
      </IntlProvider>
    );
    expect(container.querySelector(`[data-node-card="${card}"]`)).not.toBeNull();
    expect(container.querySelector('[data-handle], [data-tool-connector], [role="button"], [tabindex]')).toBeNull();
    expect(container.querySelector('[data-node-id="Request"]')).toHaveAttribute('id', 'preview-instance-Request');
    expect(container.querySelector('[id^="msla-node-"]')).toBeNull();
    if (card === 'agent') {
      expect(screen.getByText('actual-deployment')).toBeInTheDocument();
    }
    expect(JSON.stringify(plan)).toBe(original);
  });

  it('uses remapped selected metadata only, never source metadata with a generated-looking ID', () => {
    const plan = buildWorkflowExtractionPlan(
      workflowFor({ type: 'Compose', inputs: 'value' }),
      ['Request', 'Response'],
      'Child',
      invocation
    );
    const operationInfo = { type: 'ApiConnection', connectorId: '/managedApis/office365', operationId: 'SendEmail' };
    const visuals = {
      Request: { iconUri: 'actual.svg', brandColor: '#123456', operationInfo },
      Request_2: { iconUri: 'wrong.svg', brandColor: '#000000', operationInfo },
    };
    const graph = getWorkflowExtractionPreview(plan, visuals);
    const projected = getSharedWorkflowExtractionPreview(plan, graph, visuals);
    expect(projected.nodes[1]).toMatchObject({
      iconUri: 'actual.svg',
      operationInfo: { ...operationInfo, type: 'Compose' },
    });
    expect(projected.nodes[0].operationInfo).toBeUndefined();
    expect(projected.nodes[0].iconUri).not.toBe('wrong.svg');
    expect(visuals.Request.operationInfo.type).toBe('ApiConnection');
  });
});

const node = (type: string, kind?: string, iconUri?: string): SharedExtractionPreviewNode => ({
  id: 'Actual_operation',
  label: 'Renamed operation',
  position: { x: 0, y: 0 },
  operation: { type, kind },
  iconUri,
  isTrigger: false,
});
const renderCard = (data: SharedExtractionPreviewNode) =>
  render(
    <IntlProvider locale="en">
      <PreviewOperationCard node={data} domId="preview-card" />
    </IntlProvider>
  );

describe('preview presentation reuses the main metadata policy', () => {
  const renderConnectedCard = (data: SharedExtractionPreviewNode) => {
    const props: NodeProps<SharedPreviewFlowNode> = {
      id: data.id,
      data: { node: data, domId: 'preview-card' },
      type: 'sharedWorkflowPreview',
      selected: false,
      dragging: false,
      draggable: false,
      selectable: false,
      deletable: false,
      isConnectable: false,
      zIndex: 0,
      positionAbsoluteX: 0,
      positionAbsoluteY: 0,
    };
    return render(
      <IntlProvider locale="en">
        <SharedExtractionPreviewCard {...props} />
      </IntlProvider>
    );
  };

  it('keeps a generated trigger independent of connector metadata with noninteractive preview ports', () => {
    vi.mocked(useConnectorName).mockClear();
    const { container } = renderConnectedCard({ ...node('Request', 'Http'), isTrigger: true });
    expect(container.querySelector('[data-node-card="trigger"]')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-preview-handle]')).toHaveLength(2);
    expect(container.querySelector('[data-preview-handle="target"]')).toHaveAttribute('data-connectable', 'false');
    expect(container.querySelector('[data-preview-handle="source"]')).toHaveAttribute('data-connectable', 'false');
    expect(useConnectorName).not.toHaveBeenCalled();
  });

  it.each(['Actual connector', undefined])('uses resolved connector metadata only when it is a string: %s', (connectorName) => {
    vi.mocked(useConnectorName).mockReturnValue({ result: connectorName, isLoading: false });
    const operationInfo = { type: 'ApiConnection', connectorId: '/managedApis/example', operationId: 'Send' };
    const { container } = renderConnectedCard({ ...node('ApiConnection'), operationInfo });
    expect(useConnectorName).toHaveBeenCalledWith(operationInfo);
    expect(container.querySelector('[data-preview-operation-id="Actual_operation"]')).toBeInTheDocument();
    expect(container.querySelector('[data-node-card="action"]')).toBeInTheDocument();
    if (connectorName) {
      expect(screen.getByText(`Azure · ${connectorName}`)).toBeInTheDocument();
    }
    expect(container.querySelector('button, [role="button"], [tabindex]')).toBeNull();
  });
  it('keeps canonical builtin glyphs after rename and ignores manifest branding', () => {
    const { container, rerender } = renderCard(node('Compose', undefined, 'brand.svg'));
    expect(container.querySelector('[data-icon-name="BracesRegular"]')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
    rerender(
      <IntlProvider locale="en">
        <PreviewOperationCard node={{ ...node('Compose'), label: 'HTTP looking name' }} domId="preview-card" />
      </IntlProvider>
    );
    expect(container.querySelector('[data-icon-name="BracesRegular"]')).not.toBeNull();
    expect(screen.getByText('HTTP looking name')).toBeInTheDocument();
  });

  it('normalizes Expression kind but does not brand an unknown builtin', () => {
    const { container, rerender } = renderCard(node('Expression', 'CurrentTime', 'brand.svg'));
    expect(container.querySelector('[data-icon-name="CalendarClockRegular"]')).not.toBeNull();
    rerender(
      <IntlProvider locale="en">
        <PreviewOperationCard node={node('Expression', 'UnknownExpression', 'brand.svg')} domId="preview-card" />
      </IntlProvider>
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-icon-name="FlashRegular"]')).not.toBeNull();
  });

  it('uses a real connector image, falls back on failure, and accepts a new URI without fake loading', () => {
    const { container, rerender } = renderCard(node('ApiConnection', undefined, 'actual.svg'));
    const image = container.querySelector('img')!;
    expect(image).toHaveAttribute('src', 'actual.svg');
    fireEvent.error(image);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-icon-name="FlashRegular"]')).not.toBeNull();
    rerender(
      <IntlProvider locale="en">
        <PreviewOperationCard node={node('ApiConnection', undefined, 'replacement.svg')} domId="preview-card" />
      </IntlProvider>
    );
    expect(container.querySelector('img')).toHaveAttribute('src', 'replacement.svg');
    rerender(
      <IntlProvider locale="en">
        <PreviewOperationCard node={node('ApiConnection')} domId="preview-card" />
      </IntlProvider>
    );
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    expect(container.querySelector('[data-icon-name="FlashRegular"]')).not.toBeNull();
  });
});
