import { useState } from 'react';
import { useIntl } from 'react-intl';
import { PageChangeEventHandler, Pager } from '../../pager';
import { ErrorSection } from '../errorsection';
import { calculateDuration } from '../utils';
import { Value } from '../values';
import { RetryHistory } from './types';

export interface RetryPanelProps {
  retryHistories: RetryHistory[];
  visible?: boolean;
}

export const RetryPanel: React.FC<RetryPanelProps> = ({ retryHistories, visible = true }) => {
  const intl = useIntl();
  const [currentPage, setCurrentPage] = useState(1);
  const [retryHistory, setRetryHistory] = useState(retryHistories[0]);
  const [retryDuration, setRetryDuration] = useState(calculateDuration(retryHistory.startTime, retryHistory.endTime));

  if (!visible) {
    return null;
  }

  const Resources = {
    RETRY_HISTORY_CLIENT_REQUEST_ID: intl.formatMessage({
      defaultMessage: 'Client request ID',
      description: 'Label text for retry client request ID',
    }),
    RETRY_HISTORY_DURATION: intl.formatMessage({
      defaultMessage: 'Duration',
      description: 'Label text for retry duration',
    }),
    RETRY_HISTORY_END_TIME: intl.formatMessage({
      defaultMessage: 'End time',
      description: 'Label text for retry end time',
    }),
    RETRY_HISTORY_SERVICE_REQUEST_ID: intl.formatMessage({
      defaultMessage: 'Service request ID',
      description: 'Label text for retry service request ID',
    }),
    RETRY_HISTORY_START_TIME: intl.formatMessage({
      defaultMessage: 'Start time',
      description: 'Label text for retry start time',
    }),
    RETRY_HISTORY_STATUS: intl.formatMessage({
      defaultMessage: 'Status',
      description: 'Label text for retry status',
    }),
    RETRY_PAGER_TITLE: intl.formatMessage({
      defaultMessage: 'Retry',
      description: 'Header text for retry history',
    }),
  };

  const handlePagerChange: PageChangeEventHandler = ({ value }): void => {
    if (currentPage !== value) {
      const newRetryHistory = retryHistories[value - 1];
      setCurrentPage(value);
      setRetryHistory(newRetryHistory);
      setRetryDuration(calculateDuration(newRetryHistory.startTime, newRetryHistory.endTime));
    }
  };

  const { clientRequestId, code, endTime, error, serviceRequestId, startTime } = retryHistory;

  return (
    <>
      <div className="msla-retrypanel-callout-pager">
        <Pager
          current={currentPage}
          max={retryHistories.length}
          maxLength={2}
          min={1}
          pagerTitleText={Resources.RETRY_PAGER_TITLE}
          readonlyPagerInput={true}
          onChange={handlePagerChange}
        />
      </div>
      <div className="msla-panel-callout-content">
        <ErrorSection className="msla-request-history-panel-error" error={error} />
        <div className="msla-trace-inputs-outputs">
          <div className="msla-trace-inputs-outputs-header">
            <header>{Resources.RETRY_PAGER_TITLE}</header>
          </div>
          <div className="msla-trace-values">
            <Value displayName={Resources.RETRY_HISTORY_DURATION} value={retryDuration} />
            <Value displayName={Resources.RETRY_HISTORY_START_TIME} format="date-time" value={startTime} />
            <Value displayName={Resources.RETRY_HISTORY_END_TIME} format="date-time" value={endTime} visible={endTime !== undefined} />
            <Value displayName={Resources.RETRY_HISTORY_STATUS} value={code} />
            <Value displayName={Resources.RETRY_HISTORY_CLIENT_REQUEST_ID} value={clientRequestId} />
            <Value
              displayName={Resources.RETRY_HISTORY_SERVICE_REQUEST_ID}
              value={serviceRequestId}
              visible={serviceRequestId !== undefined}
            />
          </div>
        </div>
      </div>
    </>
  );
};
