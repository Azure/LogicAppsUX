import type { Extension } from '@codemirror/state';
import { showTooltip } from '@codemirror/view';
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

export const workflowSignatureHelp: Extension = showTooltip.compute(['selection', 'doc'], (state) => {
  // Only show when there's a potential function call
  const text = state.doc.toString();
  const pos = state.selection.main.head;
  const textBefore = text.slice(Math.max(0, pos - 100), pos);

  if (!textBefore.includes('(')) {
    return null;
  }

  const signatureInfo = getSignatureAtPosition(text, pos);

  if (!signatureInfo) {
    return null;
  }

  const { definition, activeParameter } = signatureInfo;
  const signature = definition.signatures[0]; // Use first signature

  if (!signature) {
    return null;
  }

  return {
    pos,
    above: true,
    create: () => {
      const dom = document.createElement('div');
      dom.className = 'cm-signature-help';
      dom.style.cssText =
        'padding: 4px 8px; background: var(--colorNeutralBackground1, #f3f3f3); border: 1px solid var(--colorNeutralStroke1, #c8c8c8); border-radius: 3px; font-family: monospace; font-size: 12px; max-width: 400px;';

      // Build signature display
      let html = `<strong>${definition.name}</strong>(`;
      html += signature.parameters
        .map((param, idx) => {
          const paramText = `${param.name}: ${param.type}`;
          return idx === activeParameter ? `<u><strong>${paramText}</strong></u>` : paramText;
        })
        .join(', ');
      html += ')';

      if (signature.documentation) {
        html += `<br/><small>${signature.documentation}</small>`;
      }

      const activeParam = signature.parameters[activeParameter];
      if (activeParam?.documentation) {
        html += `<br/><em>${activeParam.name}: ${activeParam.documentation}</em>`;
      }

      dom.innerHTML = html;
      return { dom };
    },
  };
});
