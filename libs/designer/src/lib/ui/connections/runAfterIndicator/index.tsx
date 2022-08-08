import { convertActionIDToTitleCase } from '../../../common/utilities/Utils';
import { Text, TooltipHost, useTheme } from '@fluentui/react';
import { EmptyTrafficLightDot, Failed, Skipped, Succeeded, TimedOut, TrafficLightDot } from '@microsoft/designer-ui';
import { useIntl } from 'react-intl';

export enum RUN_AFTER_STATUS {
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  TIMEDOUT = 'TIMEDOUT',
}

export interface RunAfterIndicatorProps {
  afterNodeName: string;
  statuses: string[];
}

interface DotProps {
  enabled: boolean;
  fill: string;
}

export function RunAfterIndicator({ statuses, afterNodeName }: RunAfterIndicatorProps): JSX.Element {
  const intl = useIntl();
  const { isInverted } = useTheme();
  const normalizedStatuses = statuses.map((status) => status.toUpperCase()) as RUN_AFTER_STATUS[];
  const EmptyTrafficLight = <EmptyTrafficLightDot fill={isInverted ? '#323130' : '#fff'} />;

  const Dot = (props: DotProps) => (
    <div className="msla-run-after-dot">{props.enabled ? <TrafficLightDot fill={props.fill} /> : EmptyTrafficLight}</div>
  );

  const tooltipHeaderText = intl.formatMessage(
    {
      defaultMessage: 'Run after {afterNodeName}',
      description: 'Text to show which node the target node is run after',
    },
    {
      afterNodeName: <strong>{convertActionIDToTitleCase(afterNodeName)}</strong>,
    }
  );

  const StatusStrings: Record<string, string> = {
    SUCCEEDED_STATUS: intl.formatMessage({
      defaultMessage: 'is successful',
      description: 'successful run',
    }),
    TIMEDOUT_STATUS: intl.formatMessage({
      defaultMessage: 'timed out',
      description: 'timed out run',
    }),
    SKIPPED_STATUS: intl.formatMessage({
      defaultMessage: 'is skipped',
      description: 'skipped run',
    }),
    FAILED_STATUS: intl.formatMessage({
      defaultMessage: 'has failed',
      description: 'failed run',
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
    <TooltipHost content={tooltipContent}>
      <div className="msla-run-after-dot-container">
        <Dot enabled={normalizedStatuses.includes(RUN_AFTER_STATUS.SUCCEEDED)} fill={isInverted ? '#92C353' : '#428000'} />
        <Dot enabled={normalizedStatuses.includes(RUN_AFTER_STATUS.TIMEDOUT)} fill={isInverted ? '#FCE100' : '#DB7500'} />
        <Dot enabled={normalizedStatuses.includes(RUN_AFTER_STATUS.SKIPPED)} fill={isInverted ? '#A19F9D' : '#605E5C'} />
        <Dot enabled={normalizedStatuses.includes(RUN_AFTER_STATUS.FAILED)} fill={isInverted ? '#F1707B' : '#A4262C'} />
      </div>
    </TooltipHost>
  );
}
