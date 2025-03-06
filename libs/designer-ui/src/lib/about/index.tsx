import type { BadgeProps } from '../card';
import { DocumentationItem } from '../recommendation/documentationItem';
import { Spinner, SpinnerSize } from '@fluentui/react';
import { Label } from '@fluentui/react-components';
import type { OpenAPIV2 } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

export interface AboutProps {
  connectorDisplayName?: string;
  description?: string;
  descriptionDocumentation?: OpenAPIV2.ExternalDocumentationObject;
  headerIcons?: BadgeProps[];
  isLoading?: boolean;
  connectorType?: string;
  displayRuntimeInfo?: boolean;
}

export const About = ({
  connectorDisplayName,
  description,
  descriptionDocumentation,
  headerIcons,
  isLoading,
  connectorType,
  displayRuntimeInfo,
}: AboutProps): JSX.Element => {
  const intl = useIntl();

  if (isLoading) {
    return (
      <div className="msla-panel-about-container">
        <Spinner size={SpinnerSize.large} />
      </div>
    );
  }

  const badgeHeaderIcons = (badges: BadgeProps[]): JSX.Element => {
    return (
      <>
        {badges.map(({ badgeText, title }: BadgeProps) => (
          <div className="msla-panel-tag" key={title} title={title} aria-label={badgeText}>
            {badgeText}
          </div>
        ))}
      </>
    );
  };

  const documentationURLDescription = intl.formatMessage({
    defaultMessage: 'Learn more',
    id: 'ms743602b94f3e',
    description: 'Link text to open URL',
  });

  const notAvailable = intl.formatMessage({
    defaultMessage: 'Not available',
    id: 'ms1a6c9af95a01',
    description: 'Display text for when About content is not available',
  });

  const noTags = intl.formatMessage({
    defaultMessage: 'None',
    id: 'ms62841aada65a',
    description: 'Display text for when About Panel has no Tags',
  });

  const connectorMsg = intl.formatMessage({
    defaultMessage: 'Connector',
    id: 'msf7dbec272ab5',
    description: 'Label For Connector Name in About Panel',
  });

  const operationNoteMsg = intl.formatMessage({
    defaultMessage: 'Operation note',
    id: 'ms607b002a5781',
    description: 'Label For Operation Description in About Panel',
  });

  const tagsMessage = intl.formatMessage({
    defaultMessage: 'Tags',
    id: 'ms4e07205c4471',
    description: 'Label For Tags in About Panel',
  });
  const connectorTypeLabel = intl.formatMessage({
    defaultMessage: 'Connector type',
    id: 'msba7306f26e28',
    description: 'Label For Connector Type in About Panel',
  });
  return (
    <div className="msla-panel-about-container">
      <div className="msla-panel-about-name">
        <Label className="msla-panel-connector-label" size="large">
          {connectorMsg}
        </Label>
        <div className="msla-panel-connector-name">{connectorDisplayName ? connectorDisplayName : notAvailable}</div>
      </div>
      <div className="msla-panel-about-description">
        <Label className="msla-panel-description-label" size="large">
          {operationNoteMsg}
        </Label>
        <div className="msla-panel-description">
          <DocumentationItem
            description={description}
            link={
              descriptionDocumentation?.url ? { url: descriptionDocumentation.url, urlDescription: documentationURLDescription } : undefined
            }
          />
        </div>
      </div>
      {displayRuntimeInfo ? (
        <div className="msla-panel-about-description">
          <Label className="msla-panel-description-label" size="large">
            {connectorTypeLabel}
          </Label>
          <div className="msla-panel-description">{connectorType}</div>
        </div>
      ) : null}
      <div className="msla-panel-about-tags">
        <Label className="msla-panel-tags-label" size="large">
          {tagsMessage}
        </Label>
        <div className="msla-panel-tags">{headerIcons && headerIcons.length > 0 ? badgeHeaderIcons(headerIcons) : noTags}</div>
      </div>
    </div>
  );
};
