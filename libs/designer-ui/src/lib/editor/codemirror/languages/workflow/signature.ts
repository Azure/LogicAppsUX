import { FunctionGroupDefinitions, type FunctionDefinition } from '../../../../workflow/languageservice/templatefunctions';
import { getPropertyValue, map } from '@microsoft/logic-apps-shared';

const templateFunctions = map(
  FunctionGroupDefinitions.flatMap((group) => group.functions),
  'name'
);

export interface SignatureInfo {
  functionName: string;
  activeParameter: number;
  definition: FunctionDefinition;
}

export const getSignatureAtPosition = (text: string, position: number): SignatureInfo | null => {
  const textBeforeCursor = text.slice(0, position);

  // Track function call stack
  const callStack: Array<{ name: string; argCount: number }> = [];

  let i = 0;
  let currentIdentifier = '';

  while (i < textBeforeCursor.length) {
    const char = textBeforeCursor[i];

    // Build identifier
    if (/[a-zA-Z_]/.test(char)) {
      currentIdentifier += char;
    } else if (/[0-9]/.test(char) && currentIdentifier) {
      currentIdentifier += char;
    } else if (char === '(') {
      if (currentIdentifier) {
        callStack.push({ name: currentIdentifier, argCount: 0 });
      }
      currentIdentifier = '';
    } else if (char === ')') {
      callStack.pop();
      currentIdentifier = '';
    } else if (char === ',') {
      if (callStack.length > 0) {
        callStack[callStack.length - 1].argCount++;
      }
      currentIdentifier = '';
    } else if (char === "'") {
      // Skip string literals
      i++;
      while (i < textBeforeCursor.length && textBeforeCursor[i] !== "'") {
        if (textBeforeCursor[i] === '\\') {
          i++;
        }
        i++;
      }
      currentIdentifier = '';
    } else {
      currentIdentifier = '';
    }
    i++;
  }

  if (callStack.length === 0) {
    return null;
  }

  const currentCall = callStack[callStack.length - 1];
  const definition = getPropertyValue(templateFunctions, currentCall.name);

  if (!definition) {
    return null;
  }

  return {
    functionName: currentCall.name,
    activeParameter: currentCall.argCount,
    definition,
  };
};
