import { Link } from '@fluentui/react';
import { useId } from '@fluentui/react-hooks';
import { useIntl } from 'react-intl';
import { RawValue } from './raw';
import type { ValueProps } from './types';
import { isContentLink } from './utils';

export const BodyLinkValue: React.FC<ValueProps> = (props) => {
  const id = useId('msla-body-link');
  const intl = useIntl();
  const Resources = {
    DOWNLOAD_PROMPT_MESSAGE: intl.formatMessage({
      defaultMessage: 'Download (Alt/Option + click)',
      description: 'Link text for the prompt to download large inputs or outputs',
    }),
  };

  const { displayName, value, visible = true } = props;
  if (!visible) {
    return null;
  } else if (!isContentLink(value)) {
    return <RawValue {...props} />;
  }

  return (
    <section className="msla-trace-value-label">
      <label className="msla-trace-value-display-name" id={id}>
        {displayName}
      </label>
      <div className="msla-trace-value-text">
        <Link aria-labelledby={id} href={value.uri} rel="noopener" target="_blank">
          {Resources.DOWNLOAD_PROMPT_MESSAGE}
        </Link>
      </div>
    </section>
  );
};
