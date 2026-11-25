import type { ReactNode } from 'react';
import { getNodeGlyph, IfIconRegular, IfIconFilled, type NodeIconTone, type NodeVisualKind } from '@microsoft/designer-ui-v2';
import { isBuiltInOperation } from '@microsoft/logic-apps-shared';
import {
  AgentsFilled,
  AgentsRegular,
  ArrowRepeatAllFilled,
  ArrowRepeatAllRegular,
  ArrowTurnRightFilled,
  ArrowTurnRightRegular,
  BoxMultipleRegular,
} from '@fluentui/react-icons';

export const scopeNodeIcon = <BoxMultipleRegular />;
/** Agent headers render the card's own Agent glyph, so adapters pass this family tone directly. */
export const agentNodeTone: NodeIconTone = 'pink';

export interface OperationNodeGlyph {
  icon: ReactNode;
  selectedIcon: ReactNode;
  /** Family color for the fallback glyph; only applied when no connector art is shown. */
  tone?: NodeIconTone;
}

const loopGlyph = { icon: <ArrowRepeatAllRegular />, selectedIcon: <ArrowRepeatAllFilled /> };
const controlGlyphs = new Map<string, OperationNodeGlyph>([
  ['if', { icon: <IfIconRegular />, selectedIcon: <IfIconFilled /> }],
  ['switch', { icon: <ArrowTurnRightRegular />, selectedIcon: <ArrowTurnRightFilled /> }],
  ['foreach', loopGlyph],
  ['until', loopGlyph],
  ['scope', { icon: scopeNodeIcon, selectedIcon: scopeNodeIcon }],
]);

export const getControlOperationGlyph = (type: string) => controlGlyphs.get(type.toLowerCase());

// Tones mirror the legacy designer's brand colors per family (Request teal, HTTP green, variables purple,
// data operations violet, Terminate red) so built-ins stay recognizable without per-operation artwork.
const groups: { types: readonly string[]; visualKind: NodeVisualKind; tone: NodeIconTone }[] = [
  { types: ['request'], visualKind: 'http', tone: 'teal' },
  { types: ['http', 'httpwithswagger', 'httpwebhook'], visualKind: 'http', tone: 'green' },
  { types: ['response'], visualKind: 'response', tone: 'teal' },
  { types: ['recurrence', 'slidingwindow'], visualKind: 'schedule', tone: 'blue' },
  { types: ['wait', 'delay', 'delayuntil'], visualKind: 'delay', tone: 'blue' },
  { types: ['compose'], visualKind: 'compose', tone: 'violet' },
  { types: ['parsejson'], visualKind: 'parseJson', tone: 'violet' },
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
    tone: 'purple',
  },
  { types: ['table', 'select'], visualKind: 'table', tone: 'violet' },
  { types: ['query'], visualKind: 'filterArray', tone: 'violet' },
  { types: ['join'], visualKind: 'join', tone: 'violet' },
  {
    types: ['currenttime', 'addtotime', 'subtractfromtime', 'getfuturetime', 'getpasttime', 'converttimezone'],
    visualKind: 'dateTime',
    tone: 'blue',
  },
  {
    types: [
      'javascriptcode',
      'inlinejavascript',
      'pythoncode',
      'executepythoncode',
      'inlinepython',
      'powershellcode',
      'csharpscriptcode',
      'csharpcode',
    ],
    visualKind: 'inlineCode',
    tone: 'blue',
  },
  { types: ['terminate'], visualKind: 'terminate', tone: 'red' },
  { types: ['workflow'], visualKind: 'invokeWorkflow', tone: 'blue' },
];

const byIdentity = new Map(groups.flatMap((group) => group.types.map((type) => [type, group] as const)));
const agentIdentity = new Set(['agent', 'nestedagent']);

const getIdentity = (type: string, kind?: string) => (type.toLowerCase() === 'expression' && kind ? kind : type).toLowerCase();

/** Raw workflow identity stays host-owned; null suppresses built-in branding, undefined preserves connector branding. */
export function getOperationNodeVisualKind(type: string, kind?: string): NodeVisualKind | null | undefined {
  const mapped = byIdentity.get(getIdentity(type, kind))?.visualKind;
  return mapped ?? (isBuiltInOperation({ type, kind }) ? null : undefined);
}

/**
 * Classifies from the operation definition, not from whether a glyph or art exists: built-in runtime operations
 * (including agents and unmapped built-ins) are 'builtIn'; everything else is a connector, even while its
 * metadata is loading or after it failed to load.
 */
export function isBuiltInOperationNode(type: string, kind?: string): boolean {
  return agentIdentity.has(getIdentity(type, kind)) || getOperationNodeVisualKind(type, kind) !== undefined;
}

export function getOperationNodeGlyph(type: string, kind?: string): OperationNodeGlyph | null | undefined {
  const identity = getIdentity(type, kind);
  if (agentIdentity.has(identity)) {
    // NestedAgent intentionally reuses the canonical Agent glyph without extending the shared visual-kind union.
    return { icon: <AgentsRegular />, selectedIcon: <AgentsFilled />, tone: agentNodeTone };
  }
  const visualKind = getOperationNodeVisualKind(type, kind);
  if (visualKind == null) {
    return visualKind;
  }
  const { regular: Regular, filled: Filled } = getNodeGlyph(visualKind);
  return { icon: <Regular />, selectedIcon: <Filled />, tone: byIdentity.get(identity)?.tone };
}
