import { fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { describe, expect, it } from 'vitest';
import type { Workflow } from '../../../../common/models/workflow';
import { buildWorkflowExtractionPlan } from '../../../../core/utils/workflowExtraction';
import { PreviewOperationCard } from '../SharedExtractionPreviewNode';
import {
  getSharedWorkflowExtractionPreview,
  getWorkflowExtractionPreview,
  type SharedExtractionPreviewNode,
} from '../workflowExtractionPreview';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';

const invocation = (name: string, body: Record<string, unknown>, runAfter: LogicAppsV2.RunAfter) => ({
  type: 'Workflow',
  inputs: { host: { workflow: { id: name } }, body },
  runAfter,
});
const workflowFor = (operation: LogicAppsV2.ActionDefinition): Workflow => ({
  kind: 'Stateful',
  connectionReferences: {},
  definition: {
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
  { operation: { type: 'If', expression: true, actions: {}, else: { actions: {} } }, card: 'if' },
  { operation: { type: 'Switch', expression: 'value', cases: {}, default: { actions: {} } }, card: 'switch' },
  { operation: { type: 'Foreach', foreach: '@createArray(1)', actions: {} }, card: 'foreach' },
  { operation: { type: 'Until', expression: true, actions: {}, limit: { count: 1 } }, card: 'foreach' },
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
