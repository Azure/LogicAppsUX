import { css, Image, ImageFit } from '@fluentui/react';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

export interface OperationGroupHeaderProps {
  id: string;
  title: string;
  description?: string;
  iconUrl: string;
}

export const OperationGroupHeader = (props: OperationGroupHeaderProps) => {
  const intl = useIntl();
  const { id, title, description, iconUrl } = props;

  const [descriptionExpanded, setDescriptionExpanded] = useState(false);

  const readMoreText = intl.formatMessage({
    defaultMessage: 'Read more',
    description: 'Text for read more button',
  });
  const ReadMoreButton = () => (
    <div className="msla-read-more-container">
      {'... '}
      <span className="msla-read-button" onClick={() => setDescriptionExpanded(true)}>
        {readMoreText}
      </span>
    </div>
  );

  const readLessText = intl.formatMessage({
    defaultMessage: 'Read less',
    description: 'Text for read less button',
  });
  const ReadLessButton = () => (
    <span className="msla-read-button" onClick={() => setDescriptionExpanded(false)}>
      {readLessText}
    </span>
  );

  const el = document.getElementById('msla-op-description');
  console.log('height', el?.offsetHeight ?? 0);
  console.log('lines', (el?.offsetHeight ?? 0) / 20);
  const longDescription = useMemo(() => (el?.offsetHeight ?? 0) / 20 > 2, [el]);

  return (
    <div id={id} className="msla-op-group-header">
      <Image className="msla-op-group-image" alt={title} src={iconUrl} imageFit={ImageFit.contain} />
      <div className={css(`msla-op-group-info`, !descriptionExpanded && 'limited')}>
        <span className="msla-op-group-title">{title}</span>
        <span id="msla-op-description" className="msla-op-group-subtitle">
          {description}
          {longDescription && descriptionExpanded ? <ReadLessButton /> : null}
        </span>
        {longDescription && !descriptionExpanded ? <ReadMoreButton /> : null}
      </div>
    </div>
  );
};
