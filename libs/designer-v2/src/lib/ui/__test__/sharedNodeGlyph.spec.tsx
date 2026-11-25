import { getPickerOperationGlyph } from '../sharedNodeGlyph';
import { getOperationCardDataFromOperation } from '../panel/recommendation/helpers';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import {
  composeOperation,
  csvTableOperation,
  currentTimeOperation,
  delayUntilOperation,
  htmlTableOperation,
  httpSwaggerActionOperation,
  httpSwaggerTriggerOperation,
  ifOperation,
  recurrenceOperation,
  requestOperation,
  scopeOperation,
} from '@microsoft/logic-apps-shared';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('sharedNodeGlyph', () => {
  it.each([
    { operation: composeOperation, glyph: 'BracesRegular', tone: 'violet' },
    { operation: currentTimeOperation, glyph: 'CalendarClockRegular', tone: 'blue' },
    { operation: csvTableOperation, glyph: 'TableRegular', tone: 'violet' },
    { operation: htmlTableOperation, glyph: 'TableRegular', tone: 'violet' },
    { operation: delayUntilOperation, glyph: 'TimerRegular', tone: 'blue' },
    { operation: httpSwaggerActionOperation, glyph: 'GlobeRegular', tone: 'green' },
    { operation: httpSwaggerTriggerOperation, glyph: 'GlobeRegular', tone: 'green' },
    { operation: recurrenceOperation, glyph: 'ClockRegular', tone: 'blue' },
    { operation: requestOperation, glyph: 'GlobeRegular', tone: 'teal' },
  ])('renders the canonical $glyph with $tone tone for an exact operation regardless of its label', ({ operation, glyph, tone }) => {
    const renamed = { ...operation, name: 'Renamed action', properties: { ...operation.properties, summary: 'Renamed action' } };
    const tile = getPickerOperationGlyph(renamed);
    const { container } = render(<FluentProvider theme={webLightTheme}>{tile}</FluentProvider>);

    const icon = container.querySelector(`[data-tone="${tone}"] [data-icon-name="${glyph}"]`);
    expect(icon).toBeInTheDocument();
    expect(icon?.closest('[aria-hidden]')).toHaveAttribute('aria-hidden', 'true');
  });

  it.each([
    {
      reason: 'a different provider reuses a known ID, label, and type',
      operation: {
        ...composeOperation,
        properties: {
          ...composeOperation.properties,
          api: { ...composeOperation.properties.api, id: 'connectionProviders/unrelated' },
        },
      },
    },
    {
      reason: 'the provider matches but the operation ID is unknown',
      operation: { ...composeOperation, id: 'unknown-compose' },
    },
    {
      reason: 'raw type conflicts with the known operation metadata',
      operation: { ...composeOperation, type: 'ParseJson' },
    },
    {
      reason: 'an Expression has no kind',
      operation: { ...currentTimeOperation, kind: undefined, properties: { ...currentTimeOperation.properties, operationKind: undefined } },
    },
    {
      reason: 'the Expression kind conflicts with the known operation metadata',
      operation: { ...currentTimeOperation, kind: 'GetFutureTime' },
    },
  ])('preserves existing artwork when $reason', ({ operation }) => {
    expect(getPickerOperationGlyph(operation)).toBeUndefined();
  });

  it('reuses the condition glyph for an exact built-in If operation', () => {
    const tile = getPickerOperationGlyph(ifOperation);
    const { container } = render(<FluentProvider theme={webLightTheme}>{tile}</FluentProvider>);

    expect(container.querySelector('[data-node-glyph] [data-icon-name="BranchForkRegular"]')).toBeInTheDocument();
  });

  it('keeps Scope in the same tile category as its canvas action card', () => {
    const { container } = render(<FluentProvider theme={webLightTheme}>{getPickerOperationGlyph(scopeOperation)}</FluentProvider>);
    expect(container.querySelector('[data-category="action"] [data-icon-name="BoxMultipleRegular"]')).toBeInTheDocument();
  });

  it.each([
    {
      label: 'Standard CSharpCode',
      operation: {
        id: 'cSharpCode',
        name: 'cSharpCode',
        type: 'cSharpCode',
        properties: {
          api: { id: 'connectionProviders/inlineCode', name: 'inlineCode', displayName: 'Inline Code' },
          summary: 'Execute C Sharp Code',
          operationType: 'CSharpCode',
        },
      },
      selector: '[data-tone="blue"] [data-icon-name="CodeRegular"]',
    },
    {
      label: 'Standard invokeNestedAgent',
      operation: {
        id: 'invokenestedagent',
        name: 'invokeNestedAgent',
        type: 'nestedagent',
        properties: {
          api: { id: 'connectionProviders/workflow', name: 'connectionProviders/workflow', displayName: 'Azure Logic Apps' },
          summary: 'Choose a Logic Apps workflow',
          operationType: 'NestedAgent',
        },
      },
      selector: '[data-tone="pink"] [data-icon-name="AgentsRegular"]',
    },
    {
      label: 'Consumption invokeWorkflowOperation',
      operation: {
        id: 'invokeworkflow',
        name: 'invokeworkflow',
        type: 'invokeworkflow',
        properties: {
          api: { id: '/connectionProviders/workflow', name: 'connectionProviders/workflow', displayName: 'Azure Logic Apps' },
          summary: 'Choose a Logic Apps workflow',
          operationType: 'Workflow',
        },
      },
      selector: '[data-tone="blue"] [data-icon-name="FlowRegular"]',
    },
    {
      label: 'Consumption a2aRequestOperation',
      operation: {
        id: 'a2aRequest',
        name: 'a2aRequest',
        type: 'Request',
        kind: 'Agent',
        properties: {
          api: { id: 'connectionProviders/a2aconsumption', name: 'a2aRequest', displayName: 'Agent Request' },
          summary: 'When a new chat session started',
          operationType: 'Request',
          operationKind: 'Agent',
          trigger: 'single',
        },
      },
      selector: '[data-tone="teal"] [data-icon-name="GlobeRegular"]',
    },
  ])('matches real $label discovery payload', ({ operation, selector }) => {
    const tile = getPickerOperationGlyph(operation as any);
    const { container } = render(<FluentProvider theme={webLightTheme}>{tile}</FluentProvider>);
    expect(container.querySelector(selector)).toBeInTheDocument();
  });

  it('populates icon in getOperationCardDataFromOperation only when sharedNodeUi is enabled', () => {
    expect(getOperationCardDataFromOperation(composeOperation, false).icon).toBeUndefined();
    expect(getOperationCardDataFromOperation(composeOperation, true).icon).toBeDefined();
  });
});
