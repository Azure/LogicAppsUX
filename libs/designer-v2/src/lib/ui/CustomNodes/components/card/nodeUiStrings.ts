import { joinNodeSubtitle, type ActionNodeCardStrings, type NodeRunStatus, type ToolItemCardProps } from '@microsoft/designer-ui-v2';
import type { IntlShape } from 'react-intl';
import { defineMessages } from 'react-intl';
import { getOperationNodeVisualKind } from './operationNodeGlyphs';

const typeMessages = defineMessages({
  compose: { defaultMessage: 'Compose', id: 'YbWOeB', description: 'Compose operation type on a shared node card' },
  request: { defaultMessage: 'Request', id: 'VOk0Eh', description: 'Trigger belongs to Request category' },
  recurrence: { defaultMessage: 'Recurrence', id: 'CdyJ6f', description: 'Trigger belongs to Recurrence category' },
  http: { defaultMessage: 'Http', id: '+AUDeS', description: 'HTTP operation type on a shared node card' },
  response: { defaultMessage: 'Response', id: '2Y8w3K', description: 'Response operation type on a shared node card' },
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

export function mapActionNodeStrings(intl: IntlShape): ActionNodeCardStrings {
  return {
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
  switch (status?.toLowerCase()) {
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
    default:
      return 'pending';
  }
};
