import { HTMLChangePlugin } from '../HTMLChangePlugin';
import { test } from 'vitest';

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
