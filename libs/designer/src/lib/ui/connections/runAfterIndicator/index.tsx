import { useTheme } from '@fluentui/react';
import { EmptyTrafficLightDot, TrafficLightDot } from '@microsoft/designer-ui';
import * as React from 'react';

export enum RUN_AFTER_STATUS {
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
  TIMEDOUT = 'TIMEDOUT',
}

export interface RunAfterIndicatorProps {
  statuses: string[];
}

export function RunAfterIndicator({ statuses }: RunAfterIndicatorProps): JSX.Element {
  const { isInverted } = useTheme();
  const normalizedStatuses = statuses.map((status) => status.toUpperCase());
  const EmptyTrafficLight = <EmptyTrafficLightDot fill={isInverted ? '#323130' : '#fff'} />;
  return (
    <div className="msla-run-after-dot-container">
      <div className="msla-run-after-dot">
        {normalizedStatuses.includes(RUN_AFTER_STATUS.SUCCEEDED) ? (
          <TrafficLightDot fill={isInverted ? '#92C353' : '#428000'} />
        ) : (
          EmptyTrafficLight
        )}
      </div>
      <div className="msla-run-after-dot">
        {normalizedStatuses.includes(RUN_AFTER_STATUS.TIMEDOUT) ? (
          <TrafficLightDot fill={isInverted ? '#FCE100' : '#DB7500'} />
        ) : (
          EmptyTrafficLight
        )}
      </div>
      <div className="msla-run-after-dot">
        {normalizedStatuses.includes(RUN_AFTER_STATUS.SKIPPED) ? (
          <TrafficLightDot fill={isInverted ? '#A19F9D' : '#605E5C'} />
        ) : (
          EmptyTrafficLight
        )}
      </div>
      <div className="msla-run-after-dot">
        {normalizedStatuses.includes(RUN_AFTER_STATUS.FAILED) ? (
          <TrafficLightDot fill={isInverted ? '#F1707B' : '#A4262C'} />
        ) : (
          EmptyTrafficLight
        )}
      </div>
    </div>
  );
}
