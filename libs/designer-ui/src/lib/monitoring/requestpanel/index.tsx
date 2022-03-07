import type { PageChangeEventHandler } from '../../pager';
import { Pager } from '../../pager';
import { ErrorSection } from '../errorsection';
import { calculateDuration } from '../utils';
import { Value } from '../values';
import { Request } from './request';
import { Response } from './response';
import { SecureDataSection } from './securedatasection';
import type { RequestHistory } from './types';
import { equals } from '@microsoft-logic-apps/utils';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';

export interface RequestPanelProps {
  requestHistory: RequestHistory[];
  visible?: boolean;
}

export const RequestPanel: React.FC<RequestPanelProps> = ({ requestHistory, visible = true }) => {
  const intl = useIntl();
  const [currentPage, setCurrentPage] = useState(1);
  const [requestHistoryItem, setRequestHistoryItem] = useState(requestHistory[0]);
  const [requestDuration, setRequestDuration] = useState(
    calculateDuration(requestHistoryItem.properties.startTime, requestHistoryItem.properties.endTime)
  );

  if (!visible) {
    return null;
  }

  const Resources = {
    REQUEST_HISTORY_LABEL_DURATION_TEXT: intl.formatMessage({
      defaultMessage: 'Duration',
      description: 'Label text for request duration',
    }),
    REQUEST_HISTORY_LABEL_END_TIME_TEXT: intl.formatMessage({
      defaultMessage: 'End time',
      description: 'Label text for request end time',
    }),
    REQUEST_HISTORY_LABEL_REQUEST_TEXT: intl.formatMessage({
      defaultMessage: 'Request',
      description: 'Header text for request',
    }),
    REQUEST_HISTORY_LABEL_RESPONSE_TEXT: intl.formatMessage({
      defaultMessage: 'Response',
      description: 'Header text for response',
    }),
    REQUEST_HISTORY_LABEL_START_TIME_TEXT: intl.formatMessage({
      defaultMessage: 'Start time',
      description: 'Label text for request start time',
    }),
  };

  const handlePagerChange: PageChangeEventHandler = ({ value: newPage }): void => {
    if (currentPage !== newPage) {
      const newRequestHistory = requestHistory[newPage - 1];
      setCurrentPage(newPage);
      setRequestHistoryItem(newRequestHistory);
      setRequestDuration(calculateDuration(newRequestHistory.properties.startTime, newRequestHistory.properties.endTime));
    }
  };

  const { endTime, error, request, response, secureData, startTime } = requestHistoryItem.properties;

  return (
    <>
      <div className="msla-retrypanel-callout-pager">
        <Pager
          current={currentPage}
          max={requestHistory.length}
          maxLength={2}
          min={1}
          pagerTitleText={Resources.REQUEST_HISTORY_LABEL_REQUEST_TEXT}
          readonlyPagerInput={true}
          onChange={handlePagerChange}
        />
      </div>
      <div className="msla-panel-callout-content">
        <ErrorSection className="msla-request-history-panel-error" error={error} />
        <div className="msla-trace-inputs-outputs">
          <div className="msla-trace-inputs-outputs-header">
            <header>{Resources.REQUEST_HISTORY_LABEL_DURATION_TEXT}</header>
          </div>
          <div className="msla-trace-values">
            <Value displayName={Resources.REQUEST_HISTORY_LABEL_DURATION_TEXT} value={requestDuration} />
            <Value displayName={Resources.REQUEST_HISTORY_LABEL_START_TIME_TEXT} format="date-time" value={startTime} />
            <Value displayName={Resources.REQUEST_HISTORY_LABEL_END_TIME_TEXT} format="date-time" value={endTime} />
          </div>
        </div>
        {secureData?.properties?.some?.((property) => equals(property, 'request')) ? (
          <SecureDataSection headerText={Resources.REQUEST_HISTORY_LABEL_REQUEST_TEXT} />
        ) : (
          <Request request={request} />
        )}
        {secureData?.properties?.some?.((property) => equals(property, 'response')) ? (
          <SecureDataSection headerText={Resources.REQUEST_HISTORY_LABEL_RESPONSE_TEXT} />
        ) : (
          <Response response={response} />
        )}
      </div>
    </>
  );
};
