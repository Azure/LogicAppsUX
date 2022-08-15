import { css, Icon, Image, ImageFit, Link } from '@fluentui/react';
import { useMeasure } from '@react-hookz/web';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

export interface OperationGroupHeaderProps {
  id: string;
  title: string;
  description?: string;
  iconUrl: string;
  docsUrl?: string;
}

export const OperationGroupHeader = (props: OperationGroupHeaderProps) => {
  const intl = useIntl();
  const { id, title, description, iconUrl, docsUrl } = props;

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const readMoreText = intl.formatMessage({
    defaultMessage: 'Read more',
    description: 'Text for read more button',
  });
  const ReadMoreButton = () => (
    <div className="msla-read-more-container">
      {'... '}
      <Link onClick={() => setDescriptionExpanded(true)} style={{ margin: '0px 0px -4px 4px' }}>
        {readMoreText}
      </Link>
    </div>
  );

  const readLessText = intl.formatMessage({
    defaultMessage: 'Read less',
    description: 'Text for read less button',
  });
  const ReadLessButton = () => (
    <Link onClick={() => setDescriptionExpanded(false)} style={{ marginLeft: '8px' }}>
      {readLessText}
    </Link>
  );

  const viewDocsText = intl.formatMessage({
    defaultMessage: 'View Documentation',
    description: 'Text for view docs button',
  });

  const [descriptionMeasurements, descriptionRef] = useMeasure<HTMLDivElement>();
  const longDescription = useMemo(() => {
    return (descriptionMeasurements?.height ?? 0) / 20 > 2;
  }, [descriptionMeasurements]);

  return (
    <div id={id} className="msla-op-group-header">
      <Image className="msla-op-group-image" alt={title} src={iconUrl} imageFit={ImageFit.contain} />
      <div className={css(`msla-op-group-info`, !descriptionExpanded && 'limited')}>
        <div className="msla-op-group-title-row">
          <span className="msla-op-group-title">{title}</span>
          {docsUrl ? (
            <Link href={docsUrl} target="_blank">
              {viewDocsText}
              <Icon iconName={'NavigateExternalInline'} style={{ marginLeft: '4px' }} />
            </Link>
          ) : null}
        </div>
        <span ref={descriptionRef} className="msla-op-group-subtitle">
          {description}
          {longDescription && descriptionExpanded ? <ReadLessButton /> : null}
        </span>
        {longDescription && !descriptionExpanded ? <ReadMoreButton /> : null}
      </div>
    </div>
  );
};
