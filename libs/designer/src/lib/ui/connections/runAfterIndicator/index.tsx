import { Text, useTheme } from '@fluentui/react';
import { Tooltip } from '@fluentui/react-components';
import { EmptyTrafficLightDot, Failed, Skipped, Succeeded, TimedOut, TrafficLightDot } from '@microsoft/designer-ui';
import { idDisplayCase, RUN_AFTER_COLORS, RUN_AFTER_STATUS } from '@microsoft/utils-logic-apps';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

export interface RunAfterIndicatorProps {
  statuses: string[];
  sourceNodeId: string;
}

export function RunAfterIndicator({ statuses, sourceNodeId }: RunAfterIndicatorProps): JSX.Element {
  const intl = useIntl();
  const { isInverted } = useTheme();
  const themeName = isInverted ? 'dark' : 'light';
  const normalizedStatuses = statuses.map((status) => status.toUpperCase()) as RUN_AFTER_STATUS[];

  const Dot = useCallback(
    (props: { status: RUN_AFTER_STATUS }) => (
      <div className="msla-run-after-dot">
        {normalizedStatuses.includes(props.status) ? (
          <TrafficLightDot fill={RUN_AFTER_COLORS[themeName][props.status]} />
        ) : (
          <EmptyTrafficLightDot fill={RUN_AFTER_COLORS[themeName]['EMPTY']} />
        )}
      </div>
    ),
    [normalizedStatuses, themeName]
  );

  const tooltipHeaderText = intl.formatMessage(
    {
      defaultMessage: 'Run after {sourceNodeId}',
      description: 'The text that shows the node after which the target node is run.',
    },
    {
      sourceNodeId: <strong>{idDisplayCase(sourceNodeId)}</strong>,
    }
  );

  const StatusStrings: Record<string, string> = {
    SUCCEEDED_STATUS: intl.formatMessage({
      defaultMessage: 'Is successful',
      description: 'Successful run',
    }),
    TIMEDOUT_STATUS: intl.formatMessage({
      defaultMessage: 'Timed out',
      description: 'Timed out run',
    }),
    SKIPPED_STATUS: intl.formatMessage({
      defaultMessage: 'Is skipped',
      description: 'Skipped run',
    }),
    FAILED_STATUS: intl.formatMessage({
      defaultMessage: 'Has failed',
      description: 'Failed run',
    }),
  };

  const StatusLabel = ({ text, status }: { text: string; status: RUN_AFTER_STATUS }) => {
    const checkboxLabelBadge: Record<string, JSX.Element> = {
      [RUN_AFTER_STATUS.SUCCEEDED]: <Succeeded />,
      [RUN_AFTER_STATUS.SKIPPED]: <Skipped />,
      [RUN_AFTER_STATUS.FAILED]: <Failed />,
      [RUN_AFTER_STATUS.TIMEDOUT]: <TimedOut />,
    };

    return (
      <div className="msla-run-after-label">
        <div className="msla-run-after-label-badge">{checkboxLabelBadge[status.toUpperCase()]}</div>
        <Text>{text}</Text>
      </div>
    );
  };

  const tooltipContent = (
    <div className="msla-run-after-tooltip-container">
      <Text style={{ fontWeight: '600' }}>{tooltipHeaderText}</Text>
      {normalizedStatuses.map((status) => (
        <StatusLabel key={status} text={StatusStrings[status + '_STATUS']} status={status} />
      ))}
    </div>
  );

  return (
    <Tooltip relationship={'description'} withArrow content={tooltipContent}>
      <div className="msla-run-after-dot-container">
        <Dot status={RUN_AFTER_STATUS.SUCCEEDED} />
        <Dot status={RUN_AFTER_STATUS.TIMEDOUT} />
        <Dot status={RUN_AFTER_STATUS.SKIPPED} />
        <Dot status={RUN_AFTER_STATUS.FAILED} />
      </div>
    </Tooltip>
  );
}
