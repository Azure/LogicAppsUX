import type { BadgeProps } from '../card';
import { DocumentationItem } from '../recommendation/documentationItem';
import { Spinner, SpinnerSize } from '@fluentui/react';
import { Label, mergeClasses } from '@fluentui/react-components';
import type { OpenAPIV2 } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { useAboutStyles } from './about.styles';

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
  const styles = useAboutStyles();
  const styles = useAboutStyles();

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Spinner size={SpinnerSize.large} />
      </div>
    );
  }

  const badgeHeaderIcons = (badges: BadgeProps[]): JSX.Element => {
    return (
      <>
        {badges.map(({ badgeText, title }: BadgeProps) => (
          <div className={styles.tag} key={title} title={title} aria-label={badgeText}>
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
    <div className={styles.container}>
      <div className="msla-panel-about-name">
        <Label className={styles.connectorLabel} size="large">
          {connectorMsg}
        </Label>
        <div className={styles.connectorName}>{connectorDisplayName ? connectorDisplayName : notAvailable}</div>
      </div>
      <div className="msla-panel-about-description">
        <Label className={styles.descriptionLabel} size="large">
          {operationNoteMsg}
        </Label>
        <div className={styles.description}>
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
          <Label className={styles.descriptionLabel} size="large">
            {connectorTypeLabel}
          </Label>
          <div className={styles.description}>{connectorType}</div>
        </div>
      ) : null}
      <div className="msla-panel-about-tags">
        <Label className={styles.tagsLabel} size="large">
          {tagsMessage}
        </Label>
        <div className={styles.tags}>{headerIcons && headerIcons.length > 0 ? badgeHeaderIcons(headerIcons) : noTags}</div>
      </div>
    </div>
  );
};
