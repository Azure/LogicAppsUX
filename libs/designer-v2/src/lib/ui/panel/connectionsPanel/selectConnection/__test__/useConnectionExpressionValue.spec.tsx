import { loadConnectionExpressionValue, useConnectionExpressionValue } from '../useConnectionExpressionValue';
import { createConnectionExpressionState, createConnectionExpressionStore } from './connectionExpressionTestState';
import { createLiteralValueSegment, TokenType } from '@microsoft/designer-ui';
import { act, renderHook } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';

const setup = (expression: string) => {
  const store = createConnectionExpressionStore(createConnectionExpressionState(expression));
  const dispatch = vi.spyOn(store, 'dispatch');
  const wrapper = ({ children }: PropsWithChildren) => <Provider store={store}>{children}</Provider>;
  const result = renderHook(({ nodeId, expression }) => useConnectionExpressionValue(nodeId, expression), {
    wrapper,
    initialProps: { nodeId: 'Query', expression },
  });
  return { ...result, store, dispatch };
};

describe('useConnectionExpressionValue', () => {
  it.each([
    ["@parameters('Test_variable_1234')", TokenType.PARAMETER, 'Test_variable_1234'],
    ["@outputs('Previous')", TokenType.OUTPUTS, 'Outputs'],
    ["@body('Previous')?['connectionName']", TokenType.OUTPUTS, 'connectionName'],
    ["@triggerBody()?['connectionName']", TokenType.OUTPUTS, 'connectionName'],
    ["@if(equals(triggerBody()?['Route'], 'A'), outputs('Previous'), parameters('Test_variable_1234'))", TokenType.FX, 'if(...)'],
  ])('hydrates %s with production tokens without changing the saved expression', (expression, tokenType, title) => {
    const { result, store, dispatch, unmount } = setup(expression);
    const originalState = JSON.stringify(store.getState());

    expect(result.current.value).toEqual([
      expect.objectContaining({
        type: 'token',
        value: expression.substring(1),
        token: expect.objectContaining({ tokenType, title }),
      }),
    ]);
    expect(result.current.expression).toBe(expression);
    act(() => result.current.setValue(result.current.value));
    expect(result.current.expression).toBe(expression);
    expect(JSON.stringify(store.getState())).toBe(originalState);
    expect(dispatch).not.toHaveBeenCalled();
    unmount();

    const reopened = setup(expression);
    expect(reopened.result.current.value[0].token?.tokenType).toBe(tokenType);
    expect(reopened.result.current.expression).toBe(expression);
  });

  it.each([
    "@{parameters('Test_variable_1234')}",
    "@  parameters('Test_variable_1234')  ",
    "prefix @@{literal} @{parameters('Test_variable_1234')} suffix",
    "@{parameters('Test_variable_1234')}@{outputs('Previous')}",
    "prefix @@{outputs('Previous')} @{outputs('Previous')}",
    "prefix @@@{escaped} @{concat('it''s', parameters('Test_variable_1234'))}",
    "@parameters('unterminated",
    "@@parameters('escaped')",
    "@{'literal'}",
  ])('retains exact serialization on hydration and unchanged editor callbacks: %s', (expression) => {
    const { result, dispatch } = setup(expression);
    act(() => result.current.setValue(result.current.value.map((segment) => ({ ...segment, id: 'editor-generated-id' }))));
    expect(result.current.expression).toBe(expression);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('preserves escaped literal text when editing another part of an interpolation', () => {
    const expression = "prefix @@{literal} @{parameters('Test_variable_1234')} suffix";
    const { result } = setup(expression);
    expect(
      result.current.value
        .filter((segment) => segment.type === 'literal')
        .map((segment) => segment.value)
        .join('')
    ).toBe('prefix @@{literal}  suffix');
    act(() => result.current.setValue([...result.current.value, createLiteralValueSegment(' edited')]));
    expect(result.current.expression).toBe(`${expression} edited`);
  });

  it('does not mistake a quoted literal for the matching expression that follows it', () => {
    const expression = "prefix @{'@{triggerBody()}'} @{triggerBody()}";
    const { result } = setup(expression);
    expect(result.current.value[0].value).toBe("prefix @{'@{triggerBody()}'} ");
    expect(result.current.value[1].token?.tokenType).toBe(TokenType.OUTPUTS);
    act(() => result.current.setValue([...result.current.value, createLiteralValueSegment('-suffix')]));
    expect(result.current.expression).toBe(`${expression}-suffix`);
  });

  it('updates asynchronous output metadata without losing edits or mutating Redux', () => {
    const expression = "@outputs('Previous')?['connectionName']";
    const { result, store, dispatch } = setup(expression);
    const editorKey = result.current.editorKey;
    act(() => result.current.setValue([createLiteralValueSegment('draft-'), ...result.current.value]));
    expect(result.current.editorKey).toBe(editorKey);
    const draft = result.current.expression;
    expect(result.current.value[1].token?.title).toBe('connectionName');
    const mapping = store.getState().connections.connectionsMapping;
    const graph = store.getState().workflow.graph;
    const undoRedo = store.getState().undoRedo;

    act(() => store.dispatch({ type: 'test/loadConnectionMetadata' }));

    expect(result.current.value[1].token).toMatchObject({
      title: 'Resolved connection',
      icon: 'previous.svg',
      brandColor: '#107c10',
    });
    expect(result.current.expression).toBe(draft);
    expect(result.current.editorKey).not.toBe(editorKey);
    expect(store.getState().connections.connectionsMapping).toBe(mapping);
    expect(store.getState().workflow.graph).toBe(graph);
    expect(store.getState().undoRedo).toBe(undoRedo);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('keeps the editor mounted for unrelated store updates', () => {
    const { result, store } = setup("@parameters('Test_variable_1234')");
    const value = result.current.value;
    const editorKey = result.current.editorKey;
    act(() => store.dispatch({ type: 'test/loadConnectionMetadata' }));
    expect(result.current.value).toBe(value);
    expect(result.current.editorKey).toBe(editorKey);
  });

  it('replaces the draft when the source expression or selected node changes', () => {
    const { result, rerender } = setup("@parameters('Test_variable_1234')");
    act(() => result.current.setValue(loadConnectionExpressionValue("@outputs('Previous')")));
    rerender({ nodeId: 'Other', expression: "@triggerBody()?['connectionName']" });
    expect(result.current.expression).toBe("@triggerBody()?['connectionName']");
    expect(result.current.value[0].token?.tokenType).toBe(TokenType.OUTPUTS);
  });

  it('hydrates explicit loop expressions without inserting loops', () => {
    const { result, store, dispatch } = setup("@items('Existing_loop')?['connectionName']");
    expect(result.current.value[0].type).toBe('token');
    expect(result.current.expression).toBe("@items('Existing_loop')?['connectionName']");
    expect(Object.keys(store.getState().workflow.operations)).toEqual(['Request', 'Previous', 'Query']);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
