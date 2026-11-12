import type { ReactNode } from 'react';
import { getNodeGlyph, type NodeVisualKind } from '@microsoft/designer-ui-v2';
import { isBuiltInOperation } from '@microsoft/logic-apps-shared';
import { BoxMultipleRegular } from '@fluentui/react-icons';

export const scopeNodeIcon = <BoxMultipleRegular />;

interface OperationNodeGlyph {
  icon: ReactNode;
  selectedIcon: ReactNode;
}

const groups: { types: readonly string[]; visualKind: NodeVisualKind }[] = [
  { types: ['request', 'http', 'httpwithswagger', 'httpwebhook'], visualKind: 'http' },
  { types: ['response'], visualKind: 'response' },
  { types: ['recurrence'], visualKind: 'schedule' },
  { types: ['wait', 'delay', 'delayuntil'], visualKind: 'delay' },
  { types: ['compose'], visualKind: 'compose' },
  { types: ['parsejson'], visualKind: 'parseJson' },
  {
    types: [
      'initializevariable',
      'setvariable',
      'incrementvariable',
      'decrementvariable',
      'appendtoarrayvariable',
      'appendtostringvariable',
    ],
    visualKind: 'variables',
  },
  { types: ['table', 'select'], visualKind: 'table' },
  { types: ['query'], visualKind: 'filterArray' },
  { types: ['join'], visualKind: 'join' },
  {
    types: ['currenttime', 'addtotime', 'subtractfromtime', 'getfuturetime', 'getpasttime', 'converttimezone'],
    visualKind: 'dateTime',
  },
  { types: ['javascriptcode', 'inlinejavascript', 'pythoncode', 'executepythoncode', 'inlinepython'], visualKind: 'inlineCode' },
  { types: ['terminate'], visualKind: 'terminate' },
  { types: ['workflow'], visualKind: 'invokeWorkflow' },
];

const visualKinds = new Map(groups.flatMap((group) => group.types.map((type) => [type, group.visualKind] as const)));

/** Raw workflow identity stays host-owned; null suppresses built-in branding, undefined preserves connector branding. */
export function getOperationNodeVisualKind(type: string, kind?: string): NodeVisualKind | null | undefined {
  const identity = type.toLowerCase() === 'expression' && kind ? kind : type;
  const mapped = visualKinds.get(identity.toLowerCase());
  return mapped ?? (isBuiltInOperation({ type, kind }) ? null : undefined);
}

export function getOperationNodeGlyph(type: string, kind?: string): OperationNodeGlyph | null | undefined {
  const visualKind = getOperationNodeVisualKind(type, kind);
  if (visualKind == null) {
    return visualKind;
  }
  const { regular: Regular, filled: Filled } = getNodeGlyph(visualKind);
  return { icon: <Regular />, selectedIcon: <Filled /> };
}
