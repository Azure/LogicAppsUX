import { getNodeGlyph } from '@microsoft/designer-ui-v2';
import { createIntl } from 'react-intl';
import { describe, expect, it } from 'vitest';
import * as dateTimeOperations from '../../../../../../../../logic-apps-shared/src/designer-client-services/lib/base/operations/datetime';
import {
  csvTableOperation,
  htmlTableOperation,
} from '../../../../../../../../logic-apps-shared/src/designer-client-services/lib/base/operations/dataoperations';
import { inlinePythonCodeOperation } from '../../../../../../../../logic-apps-shared/src/designer-client-services/lib/base/operations/inlinecode';
import { inlineCodeOperation } from '../../../../../../../../logic-apps-shared/src/designer-client-services/lib/consumption/operations/inlineCode';
import { getOperationNodeGlyph, getOperationNodeVisualKind } from '../operationNodeGlyphs';
import { getOperationNodeSubtitle } from '../nodeUiStrings';

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
});
