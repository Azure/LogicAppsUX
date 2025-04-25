import { css, Icon, Image, ImageFit, Link } from '@fluentui/react';
import { fallbackConnectorIconUrl } from '@microsoft/logic-apps-shared';
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

export const OperationGroupHeader = ({ id, title, description, iconUrl, docsUrl }: OperationGroupHeaderProps) => {
  const intl = useIntl();
  const [isExpanded, setIsExpanded] = useState(false);
  const [measurements, ref] = useMeasure<HTMLDivElement>();

  const imgSrc = useMemo(() => fallbackConnectorIconUrl(iconUrl), [iconUrl]);

  const readMoreText = intl.formatMessage({
    defaultMessage: 'Read more',
    id: 'ZbCS4a',
    description: 'Text for read more button',
  });

  const readLessText = intl.formatMessage({
    defaultMessage: 'Read less',
    id: 'SyFXM3',
    description: 'Text for read less button',
  });

  const viewDocsText = intl.formatMessage({
    defaultMessage: 'View documentation',
    id: 'UWF/WI',
    description: 'Text for view docs button',
  });

  const isLongDescription = useMemo(() => (measurements?.height ?? 0) / 20 > 2, [measurements]);

  return (
    <div id={id} className="msla-op-group-header">
      <Image className="msla-op-group-image" alt={title} src={imgSrc} imageFit={ImageFit.contain} />

      <div className={css('msla-op-group-info', !isExpanded && 'limited')}>
        <div className="msla-op-group-title-row">
          <span className="msla-op-group-title">{title}</span>
          {docsUrl ? (
            <Link href={docsUrl} target="_blank">
              {viewDocsText}
              <Icon iconName="NavigateExternalInline" style={{ marginLeft: 4 }} />
            </Link>
          ) : null}
        </div>

        <span ref={ref} className="msla-op-group-subtitle">
          {description}
          {isLongDescription &&
            (isExpanded ? (
              <Link onClick={() => setIsExpanded(false)} className="msla-read-toggle" style={{ marginLeft: 8 }}>
                {readLessText}
              </Link>
            ) : (
              <span className="msla-read-more-container">
                {'... '}
                <Link onClick={() => setIsExpanded(true)} className="msla-read-toggle" style={{ margin: '0 0 -4px 4px' }}>
                  {readMoreText}
                </Link>
              </span>
            ))}
        </span>
      </div>
    </div>
  );
};
