import { useTheme } from '@fluentui/react';
import { Divider, Tooltip, Text } from '@fluentui/react-components';
import { EmptyTrafficLightDot, Failed, Skipped, Succeeded, TimedOut, TrafficLightDot } from '@microsoft/designer-ui';
import { idDisplayCase, RUN_AFTER_COLORS, RUN_AFTER_STATUS } from '@microsoft/logic-apps-shared';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

export interface RunAfterIndicatorProps {
  statuses: string[];
  sourceNodeId: string;
}

export interface CollapsedRunAfterIndicatorProps {
  filteredRunAfters: Record<string, string[]>;
  runAfterCount: number;
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
      id: 'PytMJ0',
      description: 'The text that shows the node after which the target node is run.',
    },
    {
      sourceNodeId: <strong>{idDisplayCase(sourceNodeId)}</strong>,
    }
  );

  const StatusStrings: Record<string, string> = {
    SUCCEEDED_STATUS: intl.formatMessage({
      defaultMessage: 'Is successful',
      id: 'rh5g4p',
      description: 'Successful run',
    }),
    TIMEDOUT_STATUS: intl.formatMessage({
      defaultMessage: 'Timed out',
      id: '/2V8bQ',
      description: 'Timed out run',
    }),
    SKIPPED_STATUS: intl.formatMessage({
      defaultMessage: 'Is skipped',
      id: 'I3mifR',
      description: 'Skipped run',
    }),
    FAILED_STATUS: intl.formatMessage({
      defaultMessage: 'Has failed',
      id: 'O+3Y9f',
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
        <StatusLabel key={status} text={StatusStrings[`${status}_STATUS`]} status={status} />
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

export function CollapsedRunAfterIndicator({ filteredRunAfters, runAfterCount }: CollapsedRunAfterIndicatorProps): JSX.Element {
  const intl = useIntl();

  const StatusStrings: Record<string, string> = {
    SUCCEEDED_STATUS: intl.formatMessage({
      defaultMessage: 'Is successful',
      id: 'rh5g4p',
      description: 'Successful run',
    }),
    TIMEDOUT_STATUS: intl.formatMessage({
      defaultMessage: 'Timed out',
      id: '/2V8bQ',
      description: 'Timed out run',
    }),
    SKIPPED_STATUS: intl.formatMessage({
      defaultMessage: 'Is skipped',
      id: 'I3mifR',
      description: 'Skipped run',
    }),
    FAILED_STATUS: intl.formatMessage({
      defaultMessage: 'Has failed',
      id: 'O+3Y9f',
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

  const defaultMessage = {
    defaultMessage: 'Run after {sourceNodeId}',
    id: 'PytMJ0',
    description: 'The text that shows the node after which the target node is run.',
  };

  const tooltipContents: JSX.Element[] = [];

  Object.entries(filteredRunAfters).forEach(([source, statuses], index) => {
    const normalizedStatuses = statuses.map((status) => status.toUpperCase()) as RUN_AFTER_STATUS[];

    const tooltipHeaderText = intl.formatMessage(defaultMessage, {
      sourceNodeId: <strong>{idDisplayCase(source)}</strong>,
    });

    const tooltipContent = (
      <div className="msla-run-after-tooltip-container">
        <Text style={{ fontWeight: '600' }}>{tooltipHeaderText}</Text>
        {normalizedStatuses.map((status) => (
          <StatusLabel key={status} text={StatusStrings[`${status}_STATUS`]} status={status} />
        ))}
        {index !== runAfterCount - 1 && <Divider />}
      </div>
    );

    tooltipContents.push(tooltipContent);
  });

  return (
    <Tooltip relationship={'description'} withArrow content={<div className="msla-run-after-content">{tooltipContents}</div>}>
      <span className="msla-run-after-overflow">&times;{runAfterCount}</span>
    </Tooltip>
  );
}
