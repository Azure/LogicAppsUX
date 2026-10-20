import type { RootState } from '../../../../core/store';
import { isConnectionExpressionValid } from '../../../../core/utils/connectors/connectionExpression';
import {
  loadParameterValueFromString,
  parameterValueToStringWithoutCasting,
  updateTokenMetadataInParameters,
} from '../../../../core/utils/parameters/helper';
import { createLiteralValueSegment, type ParameterInfo, type ValueSegment } from '@microsoft/designer-ui';
import { clone, ExpressionParser, isFunction, isStringInterpolation } from '@microsoft/logic-apps-shared';
import { createSelector } from '@reduxjs/toolkit';
import isEqual from 'lodash.isequal';
import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';

export const loadConnectionExpressionValue = (expression: string): ValueSegment[] => {
  if (!isConnectionExpressionValid(expression)) {
    return [createLiteralValueSegment(expression)];
  }

  const parsed = ExpressionParser.parseTemplateExpression(expression);
  if (isFunction(parsed)) {
    const value = loadParameterValueFromString(expression);
    // Keep whitespace inside the expression; the parameter loader can trim it.
    value[0].value = expression.substring(1);
    return value;
  }
  if (!isStringInterpolation(parsed)) {
    return [createLiteralValueSegment(expression)];
  }

  const value: ValueSegment[] = [];
  let position = 0;
  for (const segment of parsed.segments) {
    if (!isFunction(segment)) {
      continue;
    }
    const template = `@{${segment.expression}}`;
    let start = expression.indexOf(template, position);
    // A complete prefix plus a placeholder expression excludes matches inside quoted literals.
    while (start >= 0 && (expression[start - 1] === '@' || !isConnectionExpressionValid(`${expression.substring(0, start)}@{null}`))) {
      start = expression.indexOf(template, start + template.length);
    }
    if (start < 0) {
      throw new Error('Parsed connection expression segment was not found in its source.');
    }
    // Slice literals from the source, not the decoded AST, to retain @@ escapes.
    value.push(createLiteralValueSegment(expression.substring(position, start)));
    const tokenValue = loadParameterValueFromString(`@${segment.expression}`);
    tokenValue[0].value = segment.expression;
    value.push(...tokenValue);
    position = start + template.length;
  }
  value.push(createLiteralValueSegment(expression.substring(position)));
  return value;
};

interface ConnectionExpressionDraft {
  nodeId: string;
  source: string;
  value: ValueSegment[];
  expression: string;
}

export const useConnectionExpressionValue = (nodeId: string, serializedExpression: string) => {
  const initialValue = useMemo(() => loadConnectionExpressionValue(serializedExpression), [serializedExpression]);
  const interpolateSingleToken = useMemo(
    () =>
      isConnectionExpressionValid(serializedExpression) &&
      isStringInterpolation(ExpressionParser.parseTemplateExpression(serializedExpression)),
    [serializedExpression]
  );
  const [draft, setDraft] = useState<ConnectionExpressionDraft>();
  const currentDraft = draft?.nodeId === nodeId && draft.source === serializedExpression ? draft : undefined;
  const sourceValue = currentDraft?.value ?? initialValue;
  const expression = currentDraft?.expression ?? serializedExpression;

  const selector = useMemo(
    () =>
      createSelector([(state: RootState) => state], (state) => {
        const parameter: ParameterInfo = {
          id: 'connectionName',
          parameterKey: 'connectionName',
          parameterName: 'connectionName',
          label: '',
          type: 'string',
          required: true,
          info: {},
          value: sourceValue.map((segment) => clone(segment)),
        };
        // This annotates detached segments only; it never inserts loops or dispatches.
        updateTokenMetadataInParameters(nodeId, [parameter], state);
        return parameter.value;
      }),
    [nodeId, sourceValue]
  );
  const value = useSelector(selector, isEqual);
  const [editorState, setEditorState] = useState({ sourceValue, value, revision: 0 });
  if (editorState.sourceValue !== sourceValue || editorState.value !== value) {
    setEditorState({
      sourceValue,
      value,
      // StringEditor only reads initialValue on mount. Refresh metadata, not each keystroke.
      revision: editorState.revision + (editorState.sourceValue === sourceValue ? 1 : 0),
    });
  }
  const setValue = useCallback(
    (newValue: ValueSegment[]) => {
      const nextExpression = parameterValueToStringWithoutCasting(newValue, false, interpolateSingleToken);
      const currentExpression = parameterValueToStringWithoutCasting(sourceValue, false, interpolateSingleToken);
      // Lexical can emit an unchanged value on initialization, blur, or metadata updates.
      if (nextExpression !== currentExpression) {
        setDraft({ nodeId, source: serializedExpression, value: newValue, expression: nextExpression });
      }
    },
    [nodeId, serializedExpression, sourceValue, interpolateSingleToken]
  );

  const editorKey = JSON.stringify([nodeId, serializedExpression, editorState.revision]);
  return { value, setValue, expression, editorKey };
};
