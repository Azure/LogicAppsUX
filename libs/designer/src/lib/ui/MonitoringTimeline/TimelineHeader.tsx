import { useIntl } from 'react-intl';
import { useMonitoringTimelineStyles } from './monitoringTimeline.styles';
import { useMemo } from 'react';
import { ArrowClockwiseFilled, ArrowClockwiseRegular, bundleIcon, TimelineRegular } from '@fluentui/react-icons';
import { Button, Text } from '@fluentui/react-components';

interface TimelineHeaderProps {
  isExpanded: boolean;
  refetchTimelineRepetitions: () => void;
}

const RefreshIcon = bundleIcon(ArrowClockwiseFilled, ArrowClockwiseRegular);

const TimelineHeader = ({ isExpanded, refetchTimelineRepetitions }: TimelineHeaderProps) => {
  const intl = useIntl();
  const styles = useMonitoringTimelineStyles();

  const text = useMemo(
    () => ({
      title: intl.formatMessage({
        defaultMessage: 'Task timeline',
        id: 'JRsTtp',
        description: 'Title for the monitoring timeline component.',
      }),
    }),
    [intl]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: '8px',
        ...(isExpanded ? { minWidth: '200px' } : {}),
      }}
    >
      <TimelineRegular className={styles.timelineIcon} />
      {isExpanded && (
        <Text weight={'semibold'} style={{ flexGrow: 1 }}>
          {text.title}
        </Text>
      )}
      {isExpanded && (
        <Button
          appearance="subtle"
          icon={<RefreshIcon />}
          shape="circular"
          onClick={() => {
            refetchTimelineRepetitions();
            // refetchChatHistory(); // TODO: Refetch the workflow level chat history
          }}
        />
      )}
    </div>
  );
};

export default TimelineHeader;
