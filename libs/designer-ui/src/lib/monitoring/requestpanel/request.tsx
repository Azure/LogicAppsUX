import { Value } from '../values';
import type { RequestHistoryRequest } from './types';
import { useIntl } from 'react-intl';

export interface RequestProps {
  request: RequestHistoryRequest | undefined;
}

export const Request: React.FC<RequestProps> = ({ request }) => {
  const intl = useIntl();

  if (!request) {
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
    REQUEST_HISTORY_LABEL_METHOD_TEXT: intl.formatMessage({
      defaultMessage: 'Method',
      description: 'Label text for request method',
    }),
    REQUEST_HISTORY_LABEL_REQUEST_TEXT: intl.formatMessage({
      defaultMessage: 'Request',
      description: 'Header text for request',
    }),
    REQUEST_HISTORY_LABEL_URI_TEXT: intl.formatMessage({
      defaultMessage: 'URI',
      description: 'Label text for request URI (uniform resource identifier)',
    }),
  };

  return (
    <div className="msla-trace-inputs-outputs">
      <div className="msla-trace-inputs-outputs-header">
        <header>{Resources.REQUEST_HISTORY_LABEL_REQUEST_TEXT}</header>
      </div>
      <div className="msla-trace-values">
        <Value displayName={Resources.REQUEST_HISTORY_LABEL_METHOD_TEXT} value={request.method} />
        <Value displayName={Resources.REQUEST_HISTORY_LABEL_URI_TEXT} value={request.uri} />
        <Value displayName={Resources.REQUEST_HISTORY_LABEL_HEADERS_TEXT} format="key-value-pairs" value={request.headers || {}} />
        <Value displayName={Resources.REQUEST_HISTORY_LABEL_BODY_TEXT} value={request.body} visible={request.body !== undefined} />
        <Value
          displayName={Resources.REQUEST_HISTORY_LABEL_BODY_TEXT}
          value={request.bodyLink}
          visible={request.body === undefined && request.bodyLink !== undefined}
        />
      </div>
    </div>
  );
};
