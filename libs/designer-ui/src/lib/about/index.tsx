import type { BadgeProps } from '../card';
import { DocumentationItem } from '../recommendation/documentationItem';
import type { ILabelStyles } from '@fluentui/react/lib/Label';
import { Label } from '@fluentui/react/lib/Label';
import * as React from 'react';
import { useIntl } from 'react-intl';

const labelStyles: Partial<ILabelStyles> = {
  root: {
    fontSize: '14px',
  },
};

export interface AboutProps {
  connectorDisplayName?: string;
  description?: string;
  descriptionDocumentation?: Swagger.ExternalDocumentation;
  headerIcons?: BadgeProps[];
}

export const About = ({ connectorDisplayName, description, descriptionDocumentation, headerIcons }: AboutProps): JSX.Element => {
  const intl = useIntl();

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

  const nameLabel = intl.formatMessage({
    defaultMessage: 'Connector',
    description: 'Label For Connector Name in About Panel',
  });

  const operationLabel = intl.formatMessage({
    defaultMessage: 'Operation note',
    description: 'Label For Operation Description in About Panel',
  });

  const documentationURLDescription = intl.formatMessage({
    defaultMessage: 'Learn more',
    description: 'Link text to open URL',
  });

  const tagLabel = intl.formatMessage({
    defaultMessage: 'Tags',
    description: 'Label For Tags in About Panel',
  });

  const notAvailable = intl.formatMessage({
    defaultMessage: 'Not available',
    description: 'Display text for when About content is not available',
  });

  const noTags = intl.formatMessage({
    defaultMessage: 'None',
    description: 'Display text for when About Panel has no Tags',
  });

  return (
    <div className="msla-panel-about-container">
      <div className="msla-panel-about-name">
        <Label className="msla-panel-connector-label" styles={labelStyles}>
          {nameLabel}
        </Label>
        <Label className="msla-panel-connector-name">{connectorDisplayName ? connectorDisplayName : notAvailable}</Label>
      </div>
      <div className="msla-panel-about-description">
        <Label className="msla-panel-description-label" styles={labelStyles}>
          {operationLabel}
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
      <div className="msla-panel-about-tags">
        <Label className="msla-panel-tags-label" styles={labelStyles}>
          {tagLabel}
        </Label>
        <div className="msla-panel-tags">{headerIcons && headerIcons.length > 0 ? badgeHeaderIcons(headerIcons) : noTags}</div>
      </div>
    </div>
  );
};
