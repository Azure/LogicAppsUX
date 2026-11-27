import { $createParagraphNode, $createTextNode, $getRoot, createEditor } from 'lexical';
import { describe, expect, it, vi } from 'vitest';
import { serializeDictionary } from '../serializecollapseddictionary';
import { convertSegmentsToString } from '../../../editor/base/utils/parsesegments';
import { convertKeyValueItemToSegments } from '../../../editor/base/utils/keyvalueitem';
import { ValueSegmentType } from '../../../editor/models/parameter';

const readItems = (text: string, valueType?: string) => {
  const editor = createEditor({
    onError: (e) => {
      throw e;
    },
  });
  editor.update(
    () => {
      const paragraph = $createParagraphNode();
      paragraph.append($createTextNode(text));
      $getRoot().clear().append(paragraph);
    },
    { discrete: true }
  );
  const setItems = vi.fn();
  const setIsValid = vi.fn();
  serializeDictionary(editor, setItems, setIsValid, 'string', valueType);
  return { setItems, setIsValid };
};

describe('serializeDictionary', () => {
  it('keeps a quoted string value unescaped when the value type is any, so collapse -> expand -> collapse is stable', () => {
    const literal = (value: string) => ({ id: 'v', type: ValueSegmentType.LITERAL, value });
    const items = [{ id: '1', key: [literal('X-Say')], value: [literal('say "hello"')] }];

    const collapsed = convertSegmentsToString(convertKeyValueItemToSegments(items, 'string', 'any'));
    const { setItems, setIsValid } = readItems(collapsed, 'any');

    expect(setIsValid).toHaveBeenCalledWith(true);
    const expanded = setItems.mock.calls[0][0];
    expect(convertSegmentsToString(expanded[0].value)).toBe('say "hello"');

    const recollapsed = convertSegmentsToString(convertKeyValueItemToSegments(expanded, 'string', 'any'));
    expect(recollapsed).toBe(collapsed);
  });

  it('still serializes non-string values with JSON.stringify when the value type is any', () => {
    const { setItems } = readItems('{"a": 5, "b": {"c": 1}}', 'any');
    const expanded = setItems.mock.calls[0][0];
    expect(convertSegmentsToString(expanded[0].value)).toBe('5');
    expect(convertSegmentsToString(expanded[1].value)).toBe('{"c":1}');
  });
});
