import { EmptyTrafficLightDot, TrafficLightDot } from '../images/dynamicsvgs/trafficlightsvgs';
import { Status } from './runafteractiondetails';
import { useTheme } from '@fluentui/react';
import * as React from 'react';

export interface RunAfterTrafficLightsProps {
  statuses: string[];
}

export function RunAfterTrafficLights({ statuses }: RunAfterTrafficLightsProps): JSX.Element {
  const { isInverted } = useTheme();
  const normalizedStatuses = statuses.map((status) => status.toUpperCase());
  const EmptyTrafficLight = <EmptyTrafficLightDot fill={isInverted ? '#323130' : '#fff'} />;
  return (
    <div className="msla-run-after-traffic-lights">
      <div className="msla-run-after-first-light">
        {normalizedStatuses.includes(Status.SUCCEEDED) ? <TrafficLightDot fill={isInverted ? '#92C353' : '#428000'} /> : EmptyTrafficLight}
      </div>
      <div className="msla-run-after-light">
        {normalizedStatuses.includes(Status.TIMEDOUT) ? <TrafficLightDot fill={isInverted ? '#FCE100' : '#DB7500'} /> : EmptyTrafficLight}
      </div>
      <div className="msla-run-after-light">
        {normalizedStatuses.includes(Status.SKIPPED) ? <TrafficLightDot fill={isInverted ? '#A19F9D' : '#605E5C'} /> : EmptyTrafficLight}
      </div>
      <div className="msla-run-after-light">
        {normalizedStatuses.includes(Status.FAILED) ? <TrafficLightDot fill={isInverted ? '#F1707B' : '#A4262C'} /> : EmptyTrafficLight}
      </div>
    </div>
  );
}
