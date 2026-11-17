import { Divider, Text, Tooltip } from '@fluentui/react-components';
import { NodeRunAfterIndicator, type NodeRunAfterStatus, type NodeRunAfterStrings } from '@microsoft/designer-ui-v2';
import { idDisplayCase, RUN_AFTER_STATUS } from '@microsoft/logic-apps-shared';
import { type CSSProperties, type SyntheticEvent, useMemo } from 'react';
import { type IntlShape, useIntl } from 'react-intl';

/**
 * Workflow definitions store run-after statuses in any case (`Succeeded`, `TIMEDOUT`); the shared
 * primitive accepts only its four camelCase tones. Unknown values are dropped rather than guessed.
 */
const runAfterStatusMap: Record<string, NodeRunAfterStatus> = {
  [RUN_AFTER_STATUS.SUCCEEDED]: 'succeeded',
  [RUN_AFTER_STATUS.FAILED]: 'failed',
  [RUN_AFTER_STATUS.SKIPPED]: 'skipped',
  [RUN_AFTER_STATUS.TIMEDOUT]: 'timedOut',
};

export const toSharedRunAfterStatuses = (statuses: readonly string[]): NodeRunAfterStatus[] => {
  const mapped = statuses
    .map((status) => runAfterStatusMap[status.toUpperCase()])
    .filter((status): status is NodeRunAfterStatus => !!status);
  return Array.from(new Set(mapped));
};

// Status labels reuse the legacy indicator's message ids so both presentations translate identically.
const useSharedRunAfterStrings = (intl: IntlShape): NodeRunAfterStrings =>
  useMemo(
    () => ({
      status: {
        succeeded: intl.formatMessage({ defaultMessage: 'Is successful', id: 'rh5g4p', description: 'Successful run' }),
        timedOut: intl.formatMessage({ defaultMessage: 'Timed out', id: '/2V8bQ', description: 'Timed out run' }),
        skipped: intl.formatMessage({ defaultMessage: 'Is skipped', id: 'I3mifR', description: 'Skipped run' }),
        failed: intl.formatMessage({ defaultMessage: 'Has failed', id: 'O+3Y9f', description: 'Failed run' }),
      },
      summary: (statusLabels) =>
        intl.formatMessage(
          {
            defaultMessage: 'Runs after: {statuses}',
            id: 'kqEQEZ',
            description: 'Accessible summary of the run-after statuses shown on a workflow edge.',
          },
          { statuses: intl.formatList(statusLabels, { type: 'unit', style: 'short' }) as string }
        ),
      collapsed: (count) =>
        intl.formatMessage(
          {
            defaultMessage: 'Runs after {count} actions',
            id: 'WWXVZC',
            description: 'Accessible summary when run-after details for many source actions are collapsed into a count.',
          },
          { count }
        ),
    }),
    [intl]
  );

const runAfterHeaderMessage = {
  defaultMessage: 'Run after {sourceNodeId}',
  id: 'PytMJ0',
  description: 'The text that shows the node after which the target node is run.',
};

interface RunAfterTooltipSectionProps {
  intl: IntlShape;
  sourceNodeId: string;
  statuses: NodeRunAfterStatus[];
  strings: NodeRunAfterStrings;
}

// Same header and per-status text as the legacy tooltip, so sighted users keep the source-action context.
const RunAfterTooltipSection = ({ intl, sourceNodeId, statuses, strings }: RunAfterTooltipSectionProps) => (
  <div className="msla-run-after-tooltip-container">
    <Text style={{ fontWeight: '600' }}>
      {intl.formatMessage(runAfterHeaderMessage, { sourceNodeId: <strong>{idDisplayCase(sourceNodeId)}</strong> })}
    </Text>
    {statuses.map((status) => (
      <Text key={status}>{strings.status[status]}</Text>
    ))}
  </div>
);

const slotStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
};

export interface SharedRunAfterIndicatorProps {
  statuses: string[];
  sourceNodeId: string;
}

// Tooltip triggers are independent edge controls: focusing/clicking their dots must not select or drag the owning edge.
const stopEdgeEvent = (event: SyntheticEvent) => event.stopPropagation();

export function SharedRunAfterIndicator({ statuses, sourceNodeId }: SharedRunAfterIndicatorProps): JSX.Element {
  const intl = useIntl();
  const strings = useSharedRunAfterStrings(intl);
  const sharedStatuses = useMemo(() => toSharedRunAfterStatuses(statuses), [statuses]);
  return (
    <div style={slotStyle}>
      <Tooltip
        relationship="description"
        withArrow
        content={<RunAfterTooltipSection intl={intl} sourceNodeId={sourceNodeId} statuses={sharedStatuses} strings={strings} />}
      >
        <NodeRunAfterIndicator
          statuses={sharedStatuses}
          strings={strings}
          tabIndex={0}
          onClick={stopEdgeEvent}
          onPointerDown={stopEdgeEvent}
        />
      </Tooltip>
    </div>
  );
}

export interface SharedCollapsedRunAfterIndicatorProps {
  filteredRunAfters: Record<string, string[]>;
  runAfterCount: number;
}

export function SharedCollapsedRunAfterIndicator({ filteredRunAfters, runAfterCount }: SharedCollapsedRunAfterIndicatorProps): JSX.Element {
  const intl = useIntl();
  const strings = useSharedRunAfterStrings(intl);
  const entries = Object.entries(filteredRunAfters);
  const content = (
    <div className="msla-run-after-content">
      {entries.map(([source, statuses], index) => (
        <div key={source}>
          <RunAfterTooltipSection intl={intl} sourceNodeId={source} statuses={toSharedRunAfterStatuses(statuses)} strings={strings} />
          {index !== entries.length - 1 ? <Divider /> : null}
        </div>
      ))}
    </div>
  );
  return (
    <div style={slotStyle}>
      <Tooltip relationship="description" withArrow content={content}>
        <NodeRunAfterIndicator
          statuses={[]}
          collapsedCount={runAfterCount}
          strings={strings}
          tabIndex={0}
          onClick={stopEdgeEvent}
          onPointerDown={stopEdgeEvent}
        />
      </Tooltip>
    </div>
  );
}
