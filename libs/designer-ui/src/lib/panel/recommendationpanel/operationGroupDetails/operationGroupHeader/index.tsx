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

  const imgSrc = useMemo(() => {
    const fallbackUrl =
      'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iTGF5ZXJfMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayIgeD0iMHB4IiB5PSIwcHgiDQoJIHdpZHRoPSIzMnB4IiBoZWlnaHQ9IjMycHgiIHZpZXdCb3g9IjAgMCAzMiAzMiIgc3R5bGU9ImVuYWJsZS1iYWNrZ3JvdW5kOm5ldyAwIDAgMzIgMzI7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+DQoJLnN0MHtmaWxsOiM0RTRGNEY7fQ0KCS5zdDF7ZmlsbDojRkZGRkZGO30NCjwvc3R5bGU+DQo8ZyBpZD0iWE1MSURfMzM4XyI+DQoJPHJlY3QgeD0iMCIgeT0iMCIgY2xhc3M9InN0MCIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIi8+DQo8L2c+DQo8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMTEuODgsNXY1LjVIOS4xM3Y0LjEzYzAsMy41NiwyLjcyLDYuNDksNi4xOSw2Ljg0VjI3aDEuMzd2LTUuNTNjMy40Ny0wLjM1LDYuMTktMy4yOCw2LjE5LTYuODRWMTAuNWgtMi43NVY1DQoJaC0xLjM4djUuNWgtNS41VjVIMTEuODh6IE0yMS41LDE0LjYzYzAsMy4wMy0yLjQ3LDUuNS01LjUsNS41cy01LjUtMi40Ny01LjUtNS41di0yLjc1aDExVjE0LjYzeiIvPg0KPC9zdmc+DQo=';
    return iconUrl?.includes('/Content/retail/assets/default-connection-icon') ? fallbackUrl : iconUrl ?? fallbackUrl;
  }, [iconUrl]);

  return (
    <div id={id} className="msla-op-group-header">
      <Image className="msla-op-group-image" alt={title} src={imgSrc} imageFit={ImageFit.contain} />
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
