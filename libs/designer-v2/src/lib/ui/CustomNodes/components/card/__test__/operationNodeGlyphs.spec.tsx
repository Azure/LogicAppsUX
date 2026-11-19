import { getNodeGlyph } from '@microsoft/designer-ui-v2';
import { createIntl } from 'react-intl';
import { describe, expect, it } from 'vitest';
import { act, fireEvent, render, renderHook } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { AgentsFilled, AgentsRegular, PlugConnectedFilled, PlugConnectedRegular } from '@fluentui/react-icons';
import * as dateTimeOperations from '../../../../../../../../logic-apps-shared/src/designer-client-services/lib/base/operations/datetime';
import {
  csvTableOperation,
  htmlTableOperation,
} from '../../../../../../../../logic-apps-shared/src/designer-client-services/lib/base/operations/dataoperations';
import { inlinePythonCodeOperation } from '../../../../../../../../logic-apps-shared/src/designer-client-services/lib/base/operations/inlinecode';
import { inlineCodeOperation } from '../../../../../../../../logic-apps-shared/src/designer-client-services/lib/consumption/operations/inlineCode';
import { getOperationNodeGlyph, getOperationNodeVisualKind, isBuiltInOperationNode } from '../operationNodeGlyphs';
import { getOperationNodeCategoryLabel, getOperationNodeSubtitle } from '../nodeUiStrings';
import { useOperationNodeIcon } from '../useOperationNodeIcon';

describe('host operation identity normalization', () => {
  it.each(Object.values(dateTimeOperations))(
    'maps the actual $kind Expression manifest to the shared date-time glyph',
    ({ type, kind }) => {
      expect(type).toBe('Expression');
      expect(getOperationNodeVisualKind(type, kind)).toBe('dateTime');
      expect(getOperationNodeGlyph(type, kind)).toMatchObject({
        icon: { type: getNodeGlyph('dateTime').regular },
        selectedIcon: { type: getNodeGlyph('dateTime').filled },
      });
      expect(getOperationNodeVisualKind(type.toUpperCase(), kind.toUpperCase())).toBe('dateTime');
      const intl = createIntl({ locale: 'en', messages: {} });
      expect(getOperationNodeSubtitle(intl, type, kind, undefined, false, false)).toBe(`Built-in · ${kind}`);
    }
  );

  it('uses the actual PythonCode manifest rather than the canonical host raw type', () => {
    expect(getOperationNodeVisualKind(inlinePythonCodeOperation.type)).toBe('inlineCode');
    expect(getOperationNodeVisualKind(inlineCodeOperation.type)).toBe('inlineCode');
  });

  it.each([csvTableOperation, htmlTableOperation])('keeps the actual $name Table identity independent of its format', ({ type }) => {
    expect(getOperationNodeVisualKind(type)).toBe('table');
  });

  it('keeps missing and unknown Expression kinds built-in without inventing a glyph or branding', () => {
    expect(getOperationNodeVisualKind('Expression')).toBeNull();
    expect(getOperationNodeVisualKind('Expression', 'UnknownExpression')).toBeNull();
    expect(getOperationNodeGlyph('Expression', 'UnknownExpression')).toBeNull();
  });

  it('does not interpret the kind of a connector as a built-in operation identity', () => {
    expect(getOperationNodeVisualKind('ApiConnection', 'CurrentTime')).toBeUndefined();
  });

  it.each(['agent', 'nestedagent'])('maps %s to the existing agent glyph without extending visual-kind contracts', (type) => {
    expect(getOperationNodeVisualKind(type)).toBeNull();
    expect(getOperationNodeGlyph(type)).toMatchObject({
      icon: { type: AgentsRegular },
      selectedIcon: { type: AgentsFilled },
    });
  });
});

describe('family tones for built-in fallback glyphs', () => {
  it.each([
    ['Request', undefined, 'teal'],
    ['Response', undefined, 'teal'],
    ['Http', undefined, 'green'],
    ['HttpWebhook', undefined, 'green'],
    ['InitializeVariable', undefined, 'purple'],
    ['AppendToStringVariable', undefined, 'purple'],
    ['Compose', undefined, 'violet'],
    ['ParseJson', undefined, 'violet'],
    ['Select', undefined, 'violet'],
    ['Query', undefined, 'violet'],
    ['Join', undefined, 'violet'],
    ['Terminate', undefined, 'red'],
    ['Recurrence', undefined, 'blue'],
    ['Expression', 'CurrentTime', 'blue'],
    ['Agent', undefined, 'pink'],
  ])('colors %s %s as %s', (type, kind, tone) => {
    expect(getOperationNodeGlyph(type, kind)?.tone).toBe(tone);
  });

  it('keeps Request distinct from HTTP even though both share the globe glyph', () => {
    expect(getOperationNodeGlyph('Request')?.tone).not.toBe(getOperationNodeGlyph('Http')?.tone);
  });
});

describe('truthful operation classification', () => {
  const intl = createIntl({ locale: 'en', messages: {} });
  const category = (type: string, kind?: string) => getOperationNodeCategoryLabel(intl, type, kind);

  it.each([
    ['Compose', undefined, 'Built-in'],
    ['XmlValidation', undefined, 'Built-in'],
    ['Agent', undefined, 'Built-in'],
    ['McpClientTool', 'BuiltIn', 'Built-in'],
    ['ServiceProvider', undefined, 'Built-in'],
    ['ApiConnection', undefined, 'Azure'],
    ['ApiConnectionWebhook', undefined, 'Azure'],
    ['ApiConnectionNotification', undefined, 'Azure'],
    ['McpClientTool', 'Managed', 'Connector'],
    ['OpenApiConnection', undefined, 'Connector'],
    ['SomethingUnknown', undefined, 'Connector'],
  ])('labels %s (%s) as %s', (type, kind, label) => {
    expect(category(type, kind)).toBe(label);
  });

  it('classifies from the definition rather than from glyph availability', () => {
    // Unmapped built-ins have no shared glyph but are still built-in; connectors stay connectors.
    expect(getOperationNodeGlyph('XmlValidation')).toBeNull();
    expect(isBuiltInOperationNode('XmlValidation')).toBe(true);
    expect(isBuiltInOperationNode('NestedAgent')).toBe(true);
    expect(isBuiltInOperationNode('ApiConnection')).toBe(false);
    expect(isBuiltInOperationNode('McpClientTool', 'Managed')).toBe(false);
  });

  it('never calls an ApiConnection whose metadata failed Built-in', () => {
    expect(getOperationNodeSubtitle(intl, 'ApiConnection', undefined, undefined, false, false)).toBe('Azure · ApiConnection');
    expect(getOperationNodeSubtitle(intl, 'ApiConnection', undefined, undefined, false, true)).toBe('Loading...');
  });
});

describe('art-first icon precedence', () => {
  const iconType = (node: unknown) => (node as { type?: unknown } | undefined)?.type;

  it('keeps the mapped family glyph even when manifest art exists', () => {
    const { result } = renderHook(() => useOperationNodeIcon('Compose', undefined, 'compose.svg'));
    expect(result.current).toMatchObject({ tone: 'violet', artwork: false, connectorLoading: false });
    expect(iconType(result.current.icon)).toBe(getNodeGlyph('compose').regular);
  });

  it.each([
    ['ApiConnection', undefined],
    ['McpClientTool', 'Managed'],
    ['McpClientTool', 'BuiltIn'],
    ['XmlValidation', undefined],
  ])('renders resolved %s %s art untinted', (type, kind) => {
    const { result } = renderHook(() => useOperationNodeIcon(type, kind, 'art.svg'));
    expect(result.current).toMatchObject({ artwork: true, connectorLoading: false });
    expect(result.current.tone).toBeUndefined();
    const { container } = render(<>{result.current.icon}</>);
    expect(container.querySelector('img')).toHaveAttribute('src', 'art.svg');
  });

  it('shows a spinner only while loading without art, then a neutral connector mark', () => {
    const { result, rerender } = renderHook(({ loading }) => useOperationNodeIcon('ApiConnection', undefined, undefined, loading), {
      initialProps: { loading: true },
    });
    expect(result.current.connectorLoading).toBe(true);
    rerender({ loading: false });
    expect(result.current).toMatchObject({ tone: 'neutral', artwork: false, connectorLoading: false });
    expect(iconType(result.current.icon)).toBe(PlugConnectedRegular);
    expect(iconType(result.current.selectedIcon)).toBe(PlugConnectedFilled);
  });

  it('falls back to the neutral connector mark when connector art fails, even while still loading', () => {
    const { result } = renderHook(() => useOperationNodeIcon('ApiConnection', undefined, 'broken.svg', true));
    const { container } = render(<>{result.current.icon}</>);
    act(() => {
      fireEvent.error(container.querySelector('img')!);
    });
    expect(result.current).toMatchObject({ tone: 'neutral', artwork: false, connectorLoading: false });
  });

  it('leaves unmapped built-ins without art to the card default instead of a connector mark', () => {
    const { result } = renderHook(() => useOperationNodeIcon('XmlValidation'));
    expect(result.current).toEqual({ icon: undefined, artwork: false, connectorLoading: false });
  });
});
