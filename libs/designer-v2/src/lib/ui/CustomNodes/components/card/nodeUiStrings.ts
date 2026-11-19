import {
  getNodeStatusLabel,
  joinNodeSubtitle,
  type ActionNodeCardStrings,
  type NodeRunStatus,
  type NodeStatusTone,
  type NodeFrameStrings,
  type NodeStatusStrings,
  type ToolItemCardProps,
} from '@microsoft/designer-ui-v2';
import type { IntlShape } from 'react-intl';
import { defineMessages } from 'react-intl';
import { getOperationNodeVisualKind, isBuiltInOperationNode } from './operationNodeGlyphs';

const typeMessages = defineMessages({
  compose: { defaultMessage: 'Compose', id: 'YbWOeB', description: 'Compose operation type on a shared node card' },
  request: { defaultMessage: 'Request', id: 'VOk0Eh', description: 'Trigger belongs to Request category' },
  recurrence: { defaultMessage: 'Recurrence', id: 'CdyJ6f', description: 'Trigger belongs to Recurrence category' },
  http: { defaultMessage: 'Http', id: '+AUDeS', description: 'HTTP operation type on a shared node card' },
  response: { defaultMessage: 'Response', id: '2Y8w3K', description: 'Response operation type on a shared node card' },
  nestedagent: { defaultMessage: 'Nested agent', id: 'i7iksp', description: 'Nested Agent built-in operation type' },
});

export function getOperationNodeSubtitle(
  intl: IntlShape,
  type: string,
  kind: string | undefined,
  connectorName: string | undefined,
  isTrigger: boolean,
  isLoading: boolean
): string {
  if (isLoading) {
    return intl.formatMessage({ defaultMessage: 'Loading...', id: '06zZif', description: 'Loading connector node metadata' });
  }
  const detail = getOperationNodeDetail(intl, type, kind, connectorName);
  const category = isTrigger
    ? intl.formatMessage({ defaultMessage: 'Trigger', id: 'MGq28G', description: 'Column name for trigger type' })
    : getOperationNodeCategoryLabel(intl, type, kind);
  return detail === category ? detail : joinNodeSubtitle(category, detail);
}

/**
 * Category from the operation definition and connector identity, never from glyph or art availability:
 * runtime built-ins and in-app service providers are 'Built-in', managed API connections are 'Azure', and any
 * other connector (custom/OpenAPI, managed MCP, unknown types whose metadata failed) is a neutral 'Connector'.
 */
export function getOperationNodeCategoryLabel(intl: IntlShape, type: string, kind: string | undefined): string {
  if (isBuiltInOperationNode(type, kind) || type.toLowerCase() === 'serviceprovider') {
    return intl.formatMessage({ defaultMessage: 'Built-in', id: '+DmIHG', description: 'Label for built-in connectors' });
  }
  if (/^apiconnection(?:webhook|notification)?$/i.test(type)) {
    return intl.formatMessage({ defaultMessage: 'Azure', id: 'uVsa1i', description: 'Azure connector category on a shared node card' });
  }
  return intl.formatMessage({
    defaultMessage: 'Connector',
    id: 'id+hZX',
    description: 'Category on a shared node card for a connector that is neither built-in nor an Azure managed connection',
  });
}

export function getOperationNodeDetail(intl: IntlShape, type: string, kind: string | undefined, connectorName: string | undefined): string {
  const builtIn = getOperationNodeVisualKind(type, kind) !== undefined;
  const detail = type.toLowerCase() === 'expression' && kind ? kind : type;
  const message = typeMessages[detail.toLowerCase() as keyof typeof typeMessages];
  return builtIn ? (message ? intl.formatMessage(message) : detail) : (connectorName ?? type);
}

/**
 * Unit-aware counts for collapsed container cards. Reuses the legacy collapsed-scope message IDs so the shared
 * path shows the same localized wording the host `<p>` used to render below the card.
 */
export function mapNodeFrameStrings(intl: IntlShape): NodeFrameStrings {
  const actions = (actionCount: number) =>
    intl.formatMessage(
      {
        defaultMessage: '{actionCount, plural, one {# Action} =0 {0 Actions} other {# Actions}}',
        id: 'B/JzwK',
        description: 'This is the number of actions to be completed in a group',
      },
      { actionCount }
    );
  return {
    actionCount: actions,
    counts: {
      actions,
      cases: (actionCount) =>
        intl.formatMessage(
          {
            defaultMessage: '{actionCount, plural, one {# Case} =0 {0 Cases} other {# Cases}}',
            id: 'KX1poC',
            description: 'This is the number of cases or options the program can take',
          },
          { actionCount }
        ),
      tools: (actionCount) =>
        intl.formatMessage(
          {
            defaultMessage: '{actionCount, plural, one {# Tool} =0 {0 Tools} other {# Tools}}',
            id: 'Fmt/E7',
            description: 'This is the number of tools to be completed in a group',
          },
          { actionCount }
        ),
      hiddenItems: (count) =>
        intl.formatMessage(
          {
            defaultMessage: '{count, plural, one {# hidden item} other {# hidden items}}',
            id: 'v1764Q',
            description: 'Number of collapsed items hidden inside a shared node frame',
          },
          { count }
        ),
    },
  };
}

export function mapActionNodeStrings(intl: IntlShape): ActionNodeCardStrings {
  return {
    frame: mapNodeFrameStrings(intl),
    status: {
      pending: intl.formatMessage({ defaultMessage: 'Pending', id: 'qaoC92', description: 'Pending shared node status' }),
      running: intl.formatMessage({ defaultMessage: 'Running', id: 'QHq/Rc', description: 'Running shared node status' }),
      succeeded: intl.formatMessage({ defaultMessage: 'Succeeded', id: 'ZTbSnL', description: 'Succeeded shared node status' }),
      skipped: intl.formatMessage({ defaultMessage: 'Skipped', id: 'XiiakY', description: 'Skipped shared node status' }),
      failed: intl.formatMessage({ defaultMessage: 'Failed', id: 'l7tUUP', description: 'Failed shared node status' }),
      error: intl.formatMessage({ defaultMessage: 'Error', id: 'xEF/3/', description: 'Shared node error status' }),
      warning: intl.formatMessage({ defaultMessage: 'Warning', id: '+RWscl', description: 'Shared node warning status' }),
      cancelled: intl.formatMessage({ defaultMessage: 'Cancelled', id: '1bu4vj', description: 'Cancelled shared node status' }),
      mock: intl.formatMessage({ defaultMessage: 'Using test data', id: 'qfDtM+', description: 'Shared node test data status' }),
    },
  };
}

export const mapConditionNodeStrings = (intl: IntlShape) => ({
  ...mapActionNodeStrings(intl),
  condition: {
    if: intl.formatMessage({ defaultMessage: 'Condition', id: 'Zo2BOK', description: 'Conditional action title' }),
    switch: intl.formatMessage({ defaultMessage: 'Switch', id: 'JZQ6CL', description: 'Switch action title' }),
  },
});

export const mapLoopNodeStrings = (intl: IntlShape, type?: string) => ({
  ...mapActionNodeStrings(intl),
  loop: {
    foreach:
      type?.toLowerCase() === 'until'
        ? intl.formatMessage({ defaultMessage: 'Until', id: 'V5HIRB', description: 'Until loop' })
        : intl.formatMessage({ defaultMessage: 'For each', id: 'iWNhvg', description: 'For each loop' }),
  },
});

export const mapAgentNodeStrings = (intl: IntlShape) => {
  const tools = intl.formatMessage({ defaultMessage: 'Tools', id: 'viYT+R', description: 'Agent tools heading' });
  const addTool = intl.formatMessage({ defaultMessage: 'Add tool', id: 'yA+1KO', description: 'Add an agent tool' });
  return {
    ...mapActionNodeStrings(intl),
    agent: {
      model: intl.formatMessage({ defaultMessage: 'Configure model', id: 'jAt/EE', description: 'Configure an agent model' }),
      tools,
      addTool,
    },
    tools: { heading: () => tools, addTools: addTool, collapseTools: tools, expandTools: tools, add: addTool },
  };
};

export function mapToolNodeStrings(intl: IntlShape): NonNullable<ToolItemCardProps['strings']> {
  return {
    ...mapActionNodeStrings(intl),
    tool: {
      mcp: intl.formatMessage({ defaultMessage: 'Type · MCP', id: 'QJRYi7', description: 'Canonical MCP tool type subtitle' }),
      subWorkflow: intl.formatMessage({
        defaultMessage: 'Sub-workflow',
        id: 'hkHtET',
        description: 'Canonical sub-workflow tool subtitle',
      }),
    },
  };
}

/** Keep service status semantics in the host, including nonstandard runtime status labels. */
export const mapSharedRunStatus = (status: string | undefined): NodeRunStatus | undefined => {
  const key = status?.trim().toLowerCase();
  if (!key) {
    return undefined;
  }
  return runStatusMappings.get(key)?.status ?? 'pending';
};

const runStatusMessages = defineMessages({
  timedOut: {
    defaultMessage: 'Timed out',
    id: 'eofB85',
    description: 'The status message to show timed out in monitoring view.',
  },
  resuming: { defaultMessage: 'Resuming', id: 'jenxD4', description: 'Indicates that the run is currently resuming' },
  waiting: { defaultMessage: 'Waiting', id: 'd0wgcV', description: 'Indicates that the run is currently waiting' },
  aborted: { defaultMessage: 'Aborted', id: 'x7IYBg', description: 'The status message to show in monitoring view.' },
  succeededWithWarning: {
    defaultMessage: 'Succeeded with warning',
    id: 'rTqphD',
    description: 'The status message to show when a run succeeded with a warning in monitoring view.',
  },
});

interface RawRunStatusMapping {
  status: NodeRunStatus;
  statusTone: NodeStatusTone;
  labelKey?: keyof typeof runStatusMessages;
  failedTint?: boolean;
}

// Raw status lookups use a Map so unknown strings never resolve through inherited object keys.
const runStatusMappings = new Map<string, RawRunStatusMapping>([
  ['succeeded', { status: 'succeeded', statusTone: 'success' }],
  ['failed', { status: 'failed', statusTone: 'danger', failedTint: true }],
  ['error', { status: 'error', statusTone: 'danger' }],
  ['warning', { status: 'warning', statusTone: 'warning' }],
  ['succeededwithwarning', { status: 'warning', statusTone: 'warning', labelKey: 'succeededWithWarning' }],
  ['timedout', { status: 'failed', statusTone: 'warning', labelKey: 'timedOut' }],
  ['cancelled', { status: 'cancelled', statusTone: 'warning' }],
  ['aborted', { status: 'cancelled', statusTone: 'warning', labelKey: 'aborted' }],
  ['running', { status: 'running', statusTone: 'running' }],
  ['resuming', { status: 'running', statusTone: 'running', labelKey: 'resuming' }],
  ['skipped', { status: 'skipped', statusTone: 'skipped' }],
  ['pending', { status: 'pending', statusTone: 'neutral' }],
  ['waiting', { status: 'pending', statusTone: 'neutral', labelKey: 'waiting' }],
  ['mock', { status: 'mock', statusTone: 'neutral' }],
]);

export interface SharedRunPresentation {
  status: NodeRunStatus | undefined;
  /** Visible label override; absent when the shared tone's default label is already truthful. */
  label?: string;
}

export interface SharedRunVisuals {
  statusTone?: NodeStatusTone;
  failedTint?: boolean;
}

/**
 * Single host mapping from a raw service status to the frozen shared tone plus a truthful label.
 * The shared lib only knows nine tones, so service states that collapse onto a tone (TimedOut -> failed,
 * Waiting -> pending, ...) carry their own label instead of cloning the whole status dictionary per card.
 * Unknown runtime states keep the previous host behavior of showing the raw text verbatim.
 */
export const mapSharedRunPresentation = (raw: string | undefined, intl: IntlShape): SharedRunPresentation => {
  const trimmed = raw?.trim();
  const key = trimmed?.toLowerCase();
  if (!key) {
    return { status: undefined };
  }
  const mapping = runStatusMappings.get(key);
  if (!mapping) {
    return { status: 'pending', label: trimmed };
  }
  return {
    status: mapping.status,
    ...(mapping.labelKey ? { label: intl.formatMessage(runStatusMessages[mapping.labelKey]) } : {}),
  };
};

/** Perimeter semantics stay in the host so runtime states can keep truthful labels while sharing one visual contract. */
export const mapSharedRunVisuals = (raw: string | undefined): SharedRunVisuals => {
  const key = raw?.trim().toLowerCase();
  if (!key) {
    return {};
  }
  const mapping = runStatusMappings.get(key);
  return {
    statusTone: mapping?.statusTone ?? 'neutral',
    failedTint: mapping?.failedTint ?? false,
  };
};

/**
 * Accessible name for an interactive shared card that also carries its truthful run status and duration.
 * Cards are role="button" with an explicit aria-label, which hides the badge text from the accessible name,
 * and badges are no longer live regions (one per node floods screen readers). Status only exists in
 * monitoring, so authoring names are unchanged.
 */
export const getSharedCardAccessibleName = (
  intl: IntlShape,
  name: string,
  presentation: SharedRunPresentation,
  statusStrings: NodeStatusStrings,
  duration?: string
): string =>
  presentation.status
    ? intl.formatMessage(
        {
          defaultMessage: '{name}, {status}',
          id: 'iembiG',
          description: 'Accessible name of a workflow node card in monitoring: the node name followed by its run status and duration',
        },
        { name, status: getNodeStatusLabel(presentation.status, statusStrings, duration, presentation.label) }
      )
    : name;
