import { Value } from '../values';
import type { RequestHistoryResponse } from './types';
import { useIntl } from 'react-intl';

export interface ResponseProps {
  response: RequestHistoryResponse | undefined;
}

export const Response: React.FC<ResponseProps> = ({ response }) => {
  const intl = useIntl();

  if (!response) {
    return null;
  }

  const Resources = {
    REQUEST_HISTORY_LABEL_BODY_TEXT: intl.formatMessage({
      defaultMessage: 'Body',
      description: 'Label text for request or response body',
    }),
    REQUEST_HISTORY_LABEL_HEADERS_TEXT: intl.formatMessage({
      defaultMessage: 'Headers',
      description: 'Label text for request or response headers',
    }),
    REQUEST_HISTORY_LABEL_RESPONSE_TEXT: intl.formatMessage({
      defaultMessage: 'Response',
      description: 'Header text for response',
    }),
    REQUEST_HISTORY_LABEL_STATUS_CODE_TEXT: intl.formatMessage({
      defaultMessage: 'Status code',
      description: 'Label text for response status code',
    }),
  };

  return (
    <div className="msla-trace-inputs-outputs">
      <div className="msla-trace-inputs-outputs-header">
        <div className="msla-trace-inputs-outputs-header-text">{Resources.REQUEST_HISTORY_LABEL_RESPONSE_TEXT}</div>
      </div>
      <div className="msla-trace-values">
        <Value displayName={Resources.REQUEST_HISTORY_LABEL_STATUS_CODE_TEXT} value={response.statusCode} />
        <Value displayName={Resources.REQUEST_HISTORY_LABEL_HEADERS_TEXT} format="key-value-pairs" value={response.headers || {}} />
        <Value displayName={Resources.REQUEST_HISTORY_LABEL_BODY_TEXT} value={response.body} visible={response.body !== undefined} />
        <Value
          displayName={Resources.REQUEST_HISTORY_LABEL_BODY_TEXT}
          value={response.bodyLink}
          visible={response.body === undefined && response.bodyLink !== undefined}
        />
      </div>
    </div>
  );
};
