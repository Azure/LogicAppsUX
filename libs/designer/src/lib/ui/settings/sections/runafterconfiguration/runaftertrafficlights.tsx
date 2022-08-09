import { useTheme } from '@fluentui/react';
import { RUN_AFTER_COLORS, RUN_AFTER_STATUS } from '@microsoft-logic-apps/utils';
import { EmptyTrafficLightDot, TrafficLightDot } from '@microsoft/designer-ui';
import { useCallback } from 'react';

export interface RunAfterTrafficLightsProps {
  statuses: string[];
}

export function RunAfterTrafficLights({ statuses }: RunAfterTrafficLightsProps): JSX.Element {
  const { isInverted } = useTheme();
  const themeName = isInverted ? 'dark' : 'light';
  const normalizedStatuses = statuses.map((status) => status.toUpperCase());

  const Dot = useCallback(
    (props: { status: RUN_AFTER_STATUS }) => (
      <div className="msla-run-after-light">
        {normalizedStatuses.includes(props.status) ? (
          <TrafficLightDot fill={RUN_AFTER_COLORS[themeName][props.status]} />
        ) : (
          <EmptyTrafficLightDot fill={RUN_AFTER_COLORS[themeName]['EMPTY']} />
        )}
      </div>
    ),
    [normalizedStatuses, themeName]
  );

  return (
    <div className="msla-run-after-traffic-lights">
      <Dot status={RUN_AFTER_STATUS.SUCCEEDED} />
      <Dot status={RUN_AFTER_STATUS.TIMEDOUT} />
      <Dot status={RUN_AFTER_STATUS.SKIPPED} />
      <Dot status={RUN_AFTER_STATUS.FAILED} />
    </div>
  );
}
