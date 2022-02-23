import { Link } from '@fluentui/react';
import { useIntl } from 'react-intl';
import { RawValue } from './raw';
import type { ValueProps } from './types';
import { isContentLink } from './utils';

export const BodyLinkValue: React.FC<ValueProps> = (props) => {
  const { displayName, value, visible = true } = props;
  const intl = useIntl();
  const Resources = {
    DOWNLOAD_PROMPT_ARIA_LABEL: intl.formatMessage(
      {
        defaultMessage: "Alt/Option + click to download '{displayName}'",
        description: 'ARIA label text for the download link',
      },
      { displayName }
    ),
    DOWNLOAD_PROMPT_MESSAGE: intl.formatMessage({
      defaultMessage: 'Download (Alt/Option + click)',
      description: 'Link text for the prompt to download large inputs or outputs',
    }),
  };

  if (!visible) {
    return null;
  } else if (!isContentLink(value)) {
    return <RawValue {...props} />;
  }

  return (
    <section className="msla-trace-value-label">
      <label className="msla-trace-value-display-name">{displayName}</label>
      <div className="msla-trace-value-text">
        <Link aria-label={Resources.DOWNLOAD_PROMPT_ARIA_LABEL} href={value.uri} rel="noopener" target="_blank">
          {Resources.DOWNLOAD_PROMPT_MESSAGE}
        </Link>
      </div>
    </section>
  );
};
