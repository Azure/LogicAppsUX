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
import { getOperationNodeVisualKind } from './operationNodeGlyphs';

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
    : /^apiconnection(?:webhook|notification)?$/i.test(type)
      ? intl.formatMessage({
          defaultMessage: 'Azure',
          id: 'uVsa1i',
          description: 'Azure connector category on a shared node card',
        })
      : intl.formatMessage({ defaultMessage: 'Built-in', id: '+DmIHG', description: 'Label for built-in connectors' });
  return detail === category ? detail : joinNodeSubtitle(category, detail);
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
  // Trim first so whitespace-only service values mean "no status" (no badge) instead of an unknown tone.
  switch (status?.trim().toLowerCase()) {
    case undefined:
    case '':
      return undefined;
    case 'running':
    case 'resuming':
      return 'running';
    case 'succeeded':
      return 'succeeded';
    case 'skipped':
      return 'skipped';
    case 'failed':
    case 'timedout':
      return 'failed';
    case 'cancelled':
    case 'aborted':
      return 'cancelled';
    case 'warning':
    case 'succeededwithwarning':
      return 'warning';
    case 'error':
      return 'error';
    // Only an explicit normalized mock state (Otto) maps here; Standard static results/sample input stay
    // unbadged and use the separate test-data indicator instead of claiming a mock run.
    case 'mock':
      return 'mock';
    default:
      return 'pending';
  }
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

const runStatusLabelKeys: Record<string, keyof typeof runStatusMessages> = {
  timedout: 'timedOut',
  resuming: 'resuming',
  waiting: 'waiting',
  aborted: 'aborted',
  succeededwithwarning: 'succeededWithWarning',
};

const sharedNodeRunStatuses = new Set<string>([
  'succeeded',
  'failed',
  'skipped',
  'running',
  'pending',
  'cancelled',
  'warning',
  'error',
  'mock',
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
  const status = mapSharedRunStatus(trimmed);
  const key = trimmed?.toLowerCase();
  if (!key || !status || sharedNodeRunStatuses.has(key)) {
    return { status };
  }
  const messageKey = runStatusLabelKeys[key];
  return { status, label: messageKey ? intl.formatMessage(runStatusMessages[messageKey]) : trimmed };
};

const runStatusToneByRaw: Record<string, NodeStatusTone> = {
  succeeded: 'success',
  failed: 'danger',
  error: 'danger',
  warning: 'warning',
  succeededwithwarning: 'warning',
  timedout: 'warning',
  cancelled: 'warning',
  aborted: 'warning',
  running: 'running',
  resuming: 'running',
  skipped: 'skipped',
  pending: 'neutral',
  waiting: 'neutral',
  mock: 'neutral',
};

/** Perimeter semantics stay in the host so runtime states can keep truthful labels while sharing one visual contract. */
export const mapSharedRunVisuals = (raw: string | undefined): SharedRunVisuals => {
  const key = raw?.trim().toLowerCase();
  if (!key) {
    return {};
  }
  return {
    statusTone: runStatusToneByRaw[key] ?? 'neutral',
    failedTint: key === 'failed',
  };
};

export const getSharedRunSubtitle = (
  presentation: SharedRunPresentation,
  statusStrings: NodeStatusStrings,
  duration?: string
): string | undefined =>
  presentation.status ? getNodeStatusLabel(presentation.status, statusStrings, duration, presentation.label) : undefined;

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
