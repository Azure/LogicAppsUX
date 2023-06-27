import { Link } from '@fluentui/react';
import { useIntl } from 'react-intl';

export interface ValueDownloadProps {
  href: string;
}

export const ValueDownload: React.FC<ValueDownloadProps> = ({ href }) => {
  const intl = useIntl();

  const Resources = {
    DOWNLOAD_PROMPT_MESSAGE: intl.formatMessage({
      defaultMessage: 'Download (Alt or Option + select)',
      description: 'Link text for the prompt to download large inputs or outputs',
    }),
  };

  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.stopPropagation();
  };

  return (
    <div className="msla-trace-values">
      <div className="msla-trace-download-link">
        <Link aria-label={Resources.DOWNLOAD_PROMPT_MESSAGE} download href={href} rel="noopener" target="_blank" onClick={handleClick}>
          {Resources.DOWNLOAD_PROMPT_MESSAGE}
        </Link>
      </div>
    </div>
  );
};
