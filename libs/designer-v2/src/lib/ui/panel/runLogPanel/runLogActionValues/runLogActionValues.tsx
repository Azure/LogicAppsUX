import { useIntl } from 'react-intl';
import { useRunLogActionValuesStyles } from './runLogActionValues.styles';
import { ValueDownload } from './valuedownload';
import { ValueLink } from './valuelink';
import { ValueList } from './valuelist';
import type { BoundParameters } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { Spinner } from '@fluentui/react-components';

export interface RunLogActionValuesProps {
  linkText?: string;
  isLoading?: boolean;
  showLink?: boolean;
  isDownload?: boolean;
  link?: string;
  showMore: boolean;
  values: BoundParameters;
  error?: any;
  onLinkClick?(): void;
  onMoreClick?(): void;
}

export const RunLogActionValues: React.FC<RunLogActionValuesProps> = ({
  linkText,
  isLoading,
  showLink,
  showMore,
  values,
  onLinkClick,
  onMoreClick,
  link,
  isDownload,
  error,
}) => {
  const intl = useIntl();
  const styles = useRunLogActionValuesStyles();

  if (isLoading) {
    return (
      <Spinner
        label={intl.formatMessage({
          defaultMessage: 'Loading values...',
          id: 'VJEgIk',
          description: 'Loading values spinner label',
        })}
        labelPosition="after"
        size="tiny"
        style={{ padding: '8px' }}
      />
    );
  }

  return (
    <div className={styles.root}>
      {linkText ? <ValueLink linkText={linkText} visible={showLink} onLinkClick={onLinkClick} /> : null}
      {isDownload && link ? (
        <ValueDownload href={link} />
      ) : (
        <ValueList error={error} showMore={showMore} values={values} onMoreClick={onMoreClick} />
      )}
    </div>
  );
};
