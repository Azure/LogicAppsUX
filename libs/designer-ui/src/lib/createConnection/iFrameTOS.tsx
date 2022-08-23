import * as React from 'react';
import { useIntl } from 'react-intl';

export interface IFrameTermsOfServiceProps {
  url?: string;
}

export const IFrameTermsOfService = (props: IFrameTermsOfServiceProps) => {
  const { url } = props;

  const intl = useIntl();
  const title = intl.formatMessage({
    defaultMessage: 'Terms of Service',
    description: 'Title for terms of service iframe.',
  });

  if (url && url.toUpperCase().indexOf('HTTPS://') === 0) {
    return (
      <div className="msla-iframe-terms-of-service">
        <iframe title={title} src={url} sandbox="allow-popups"></iframe>
      </div>
    );
  } else {
    return null;
  }
};
