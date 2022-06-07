import type { BadgeProps } from '../card';
import { BaseEditor, ValueSegmentType } from '../editor/base';
import { DocumentationItem } from '../recommendation/documentationItem';
import type { ILabelStyles } from '@fluentui/react/lib/Label';
import { Label } from '@fluentui/react/lib/Label';
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

  const documentationURLDescription = intl.formatMessage({
    defaultMessage: 'Learn more',
    description: 'Link text to open URL',
  });

  const notAvailable = intl.formatMessage({
    defaultMessage: 'Not available',
    description: 'Display text for when About content is not available',
  });

  const noTags = intl.formatMessage({
    defaultMessage: 'None',
    description: 'Display text for when About Panel has no Tags',
  });

  const connectorMsg = intl.formatMessage({
    defaultMessage: 'Connector',
    description: 'Label For Connector Name in About Panel',
  });

  const operationNoteMsg = intl.formatMessage({
    defaultMessage: 'Operation note',
    description: 'Label For Operation Description in About Panel',
  });

  const tagsMessage = intl.formatMessage({
    defaultMessage: 'Tags',
    description: 'Label For Tags in About Panel',
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
      <div className="msla-panel-about-tags">
        <Label className="msla-panel-tags-label" styles={labelStyles}>
          {tagsMessage}
        </Label>
        <div className="msla-panel-tags">{headerIcons && headerIcons.length > 0 ? badgeHeaderIcons(headerIcons) : noTags}</div>
      </div>
      <BaseEditor
        className="msla-string-editor-container-plugin"
        placeholder="Play around with some cool plugins here"
        BasePlugins={{ autoFocus: true, autoLink: true, clearEditor: true, history: true, treeView: true, tokens: true }}
        initialValue={[
          { type: ValueSegmentType.LITERAL, value: 'test\ntest' },
          { type: ValueSegmentType.LITERAL, value: ' another test\nwhheeeee' },
          {
            type: ValueSegmentType.TOKEN,
            token: {
              description: 'defaultTrigger()',
              title: 'Body',
              brandColor: '#007c89',
              icon: 'url("data:image/svg+xml;base64,PHN2ZyBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAzMiAzMiIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHBhdGggZD0ibTAgMGgzMnYzMmgtMzJ6IiBmaWxsPSIjMDA5ZGE1Ii8+DQogPGcgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Im0xMy45IDIxLjE2NGg0LjIxOHYxLjg5MWgtNC4yMTh6Ii8+DQogIDxwYXRoIGQ9Im0xOC40MDkgMjEuNjczaDEuNTI3djEuMzgyaC0xLjUyN3oiLz4NCiAgPHBhdGggZD0ibTEyLjAwOSAyMS42NzNoMS41Mjd2MS4zODJoLTEuNTI3eiIvPg0KICA8cGF0aCBkPSJNMTUuMjgyIDIzLjQxOGgxLjM4MnYuNTgyaC0xLjM4MnoiLz4NCiAgPHBhdGggZD0iTTI0Ljg4MiAxOC4xMDlsLTEuNjczLTEuNTI3aC0xLjAxOGwxLjIzNiAxLjE2NGgtMy43MDl2LjhoMy43MDlsLTEuMTY0IDEuMjM2aC45NDV6Ii8+DQogIDxwYXRoIGQ9Ik0xNS4yODIgMjAuODczaDEuMzgydi0xLjAxOGMuOC0uMDczIDEuNTI3LS4zNjQgMi4yNTUtLjcyN3YtMS4zODJjLS40MzYuMzY0LTEuMDE4LjY1NS0xLjYuOC4zNjQtLjU4Mi42NTUtMS40NTUuOC0yLjQuODczLS4xNDUgMS43NDUtLjI5MSAyLjMyNy0uNTgyLS4yMTguNTgyLS41MDkgMS4wMTgtLjg3MyAxLjQ1NWgxLjQ1NWMuNTgyLS44NzMuODczLTEuOTY0Ljg3My0zLjEyNyAwLTEuMDkxLS4yOTEtMi4xMDktLjgtMi45ODItMS4wMTgtMS43NDUtMi45MDktMi45MDktNS4wOTEtMi45MDktMi4xODIgMC00LjA3MyAxLjE2NC01LjA5MSAyLjkwOS0uNTA5Ljg3My0uOCAxLjg5MS0uOCAyLjk4MiAwIDMuMDU1IDIuMzI3IDUuNTI3IDUuMjM2IDUuODkxdjEuMDkxem0yLjQ3My01LjE2NGMtLjUwOS4wNzMtMS4wOTEuMDczLTEuNzQ1LjA3My0uNjU1IDAtMS4yMzYgMC0xLjc0NS0uMDczLS4wNzMtLjU4Mi0uMTQ1LTEuMTY0LS4xNDUtMS43NDUgMC0uNDM2IDAtLjg3My4wNzMtMS4zMDkuNTgyLjA3MyAxLjE2NC4xNDUgMS44MTguMTQ1LjY1NSAwIDEuMjM2LS4wNzMgMS44MTgtLjE0NS4wNzMuNDM2LjA3My44LjA3MyAxLjMwOSAwIC42NTUtLjA3MyAxLjIzNi0uMTQ1IDEuNzQ1em0yLjYxOC0zLjc4MmMuMjkxLjU4Mi40MzYgMS4zMDkuNDM2IDIuMDM2bC0uMDczIDEuMDE4Yy0uNTA5LjI5MS0xLjMwOS41ODItMi40NzMuNzI3LjA3My0uNTA5LjA3My0xLjA5MS4wNzMtMS43NDUgMC0uNDM2IDAtLjk0NS0uMDczLTEuMzgyLjgtLjE0NSAxLjUyNy0uMzY0IDIuMTA5LS42NTV6bS0uMjE4LS4zNjRjLS40MzYuMjE4LTEuMDkxLjQzNi0xLjg5MS41ODItLjE0NS0xLjE2NC0uNDM2LTIuMTA5LS44NzMtMi43NjQgMS4xNjQuMzY0IDIuMTA5IDEuMDkxIDIuNzY0IDIuMTgyem0tNC4xNDUtMi40Yy4yMTggMCAuNDM2IDAgLjY1NS4wNzMuNDM2LjUwOS44NzMgMS42IDEuMDkxIDIuOTgyLS41MDkuMDczLTEuMDkxLjE0NS0xLjc0NS4xNDUtLjY1NSAwLTEuMjM2LS4wNzMtMS43NDUtLjE0NS4yMTgtMS4zODIuNTgyLTIuNDczIDEuMDkxLTIuOTgyLjE0NS0uMDczLjQzNi0uMDczLjY1NS0uMDczem0tMS4zODIuMjE4Yy0uMzY0LjY1NS0uNzI3IDEuNi0uODczIDIuNzY0LS44LS4xNDUtMS40NTUtLjM2NC0xLjg5MS0uNTgyLjU4Mi0xLjA5MSAxLjYtMS44MTggMi43NjQtMi4xODJ6bS0zLjQxOCA0LjU4MmMwLS43MjcuMTQ1LTEuMzgyLjQzNi0yLjAzNi41MDkuMjkxIDEuMjM2LjUwOSAyLjEwOS42NTUtLjA3My40MzYtLjA3My44NzMtLjA3MyAxLjM4MmwuMDczIDEuNzQ1Yy0xLjE2NC0uMTQ1LTEuOTY0LS40MzYtMi40NzMtLjcyN2wtLjA3My0xLjAxOHptLjI5MSAxLjZjLjU4Mi4yOTEgMS40NTUuNDM2IDIuMzI3LjU4Mi4xNDUuOTQ1LjQzNiAxLjgxOC44IDIuNC0xLjQ1NS0uNDM2LTIuNjE4LTEuNTI3LTMuMTI3LTIuOTgyem0yLjgzNi42NTVjLjU4Mi4wNzMgMS4wOTEuMDczIDEuNjczLjA3My41ODIgMCAxLjA5MSAwIDEuNjczLS4wNzMtLjIxOCAxLjE2NC0uNTgyIDIuMDM2LS45NDUgMi40NzNsLS42NTUuMDczYy0uMjE4IDAtLjQzNiAwLS42NTUtLjA3My0uNTA5LS41MDktLjg3My0xLjMwOS0xLjA5MS0yLjQ3M3oiLz4NCiA8L2c+DQo8L3N2Zz4NCg==")',
            },
          },
        ]}
      />
    </div>
  );
};
