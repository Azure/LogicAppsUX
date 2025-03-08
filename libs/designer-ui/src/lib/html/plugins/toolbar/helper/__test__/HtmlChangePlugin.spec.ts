import { ValueSegment } from '../../../../../editor/models/parameter';
import { canReplaceSpanWithId, HTMLChangePlugin } from '../HTMLChangePlugin';
import { expect, it, test } from 'vitest';

test('HTMLChangePlugin can be used', () => {
  const mockProps = {
    isValuePlaintext: false,
    setIsSwitchFromPlaintextBlocked: () => {},
    setIsValuePlaintext: () => {},
    setValue: () => {},
  };

  try {
    HTMLChangePlugin(mockProps);
  } catch (e) {
    throw new Error(`HTMLChangePlugin could not be used: ${e}`);
  }
});

const getTestToken = (): ValueSegment => ({
  id: 'test id',
  type: 'token',
  value: 'test value',
});

it('canReplaceSpanWithId returns true', () => {
  let idValue = 't\n\n\re\nstK\re\r\ryM\nat\r\rch';
  const nodeMap = new Map<string, ValueSegment>();
  nodeMap.set(`\rte\nst\n\rKey\nMatch\r\n`, { ...getTestToken() });

  expect(canReplaceSpanWithId(idValue, nodeMap)).toBe(true);
});

it('canReplaceSpanWithId returns false', () => {
  let idValue = 't\n\n\re\nstK\re\rNo\ryM\nat\r\rch';
  const nodeMap = new Map<string, ValueSegment>();
  nodeMap.set(`\rte\nst\n\rKey\nMatch\r\n`, { ...getTestToken() });

  expect(canReplaceSpanWithId(idValue, nodeMap)).toBe(false);
});
