import type { BadgeProps } from '../card';
import { DocumentationItem } from '../recommendation/documentationItem';
import { Spinner, SpinnerSize } from '@fluentui/react';
import type { ILabelStyles } from '@fluentui/react/lib/Label';
import { Label } from '@fluentui/react/lib/Label';
import type { OpenAPIV2 } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

const labelStyles: Partial<ILabelStyles> = {
  root: {
    fontSize: '14px',
  },
};

export interface AboutProps {
  connectorDisplayName?: string;
  description?: string;
  descriptionDocumentation?: OpenAPIV2.ExternalDocumentationObject;
  headerIcons?: BadgeProps[];
  isLoading?: boolean;
  connectorType?: string;
  displayRuntimeInfo: boolean;
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
    id: 'dDYCuU',
    description: 'Link text to open URL',
  });

  const notAvailable = intl.formatMessage({
    defaultMessage: 'Not available',
    id: 'Gmya+V',
    description: 'Display text for when About content is not available',
  });

  const noTags = intl.formatMessage({
    defaultMessage: 'None',
    id: 'YoQara',
    description: 'Display text for when About Panel has no Tags',
  });

  const connectorMsg = intl.formatMessage({
    defaultMessage: 'Connector',
    id: '99vsJy',
    description: 'Label For Connector Name in About Panel',
  });

  const operationNoteMsg = intl.formatMessage({
    defaultMessage: 'Operation note',
    id: 'YHsAKl',
    description: 'Label For Operation Description in About Panel',
  });

  const tagsMessage = intl.formatMessage({
    defaultMessage: 'Tags',
    id: 'TgcgXE',
    description: 'Label For Tags in About Panel',
  });
  const connectorTypeLabel = intl.formatMessage({
    defaultMessage: 'Connector type',
    id: 'unMG8m',
    description: 'Label For Connector Type in About Panel',
  });
  return (
    <div className="msla-panel-about-container">
      <div className="msla-panel-about-name">
        <Label className="msla-panel-connector-label" styles={labelStyles}>
          {connectorMsg}
        </Label>
        <Label className="msla-panel-connector-name">{connectorDisplayName ? connectorDisplayName : notAvailable}</Label>
      </div>
      <div className="msla-panel-about-description">
        <Label className="msla-panel-description-label" styles={labelStyles}>
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
          <Label className="msla-panel-description-label" styles={labelStyles}>
            {connectorTypeLabel}
          </Label>
          <div className="msla-panel-description">{connectorType}</div>
        </div>
      ) : null}
      <div className="msla-panel-about-tags">
        <Label className="msla-panel-tags-label" styles={labelStyles}>
          {tagsMessage}
        </Label>
        <div className="msla-panel-tags">{headerIcons && headerIcons.length > 0 ? badgeHeaderIcons(headerIcons) : noTags}</div>
      </div>
    </div>
  );
};
