/* eslint-disable react/display-name */
import type { CardProps } from './index';
import { getHeaderStyle } from './utils';
import type { FluentIcon } from '@fluentui/react-icons';
import { CommentRegular, BeakerRegular, LockClosedRegular, LinkMultipleRegular } from '@fluentui/react-icons';
import { Spinner, Tooltip } from '@fluentui/react-components';
import { memo, useMemo } from 'react';
import { useIntl } from 'react-intl';

export type CardFooterProps = Pick<
  CardProps,
  | 'commentBox'
  | 'connectionDisplayName'
  | 'connectionRequired'
  | 'staticResultsEnabled'
  | 'isSecureInputsOutputs'
  | 'nodeIndex'
  | 'isLoadingDynamicData'
  | 'title'
>;

interface CardBadgeBarProps {
  badges: CardBadgeProps[];
  brandColor?: string;
  tabIndex?: number;
  cardTitle?: string;
}

interface CardBadgeProps {
  enabled?: boolean;
  active: boolean;
  content?: string;
  IconComponent?: FluentIcon;
  badgeContent?: any;
  title: string;
  tabIndex?: number;
  cardTitle?: string;
}

export const CardFooter: React.FC<CardFooterProps> = memo(
  ({
    title: cardTitle,
    commentBox,
    connectionDisplayName,
    connectionRequired,
    staticResultsEnabled,
    isSecureInputsOutputs,
    isLoadingDynamicData,
    nodeIndex,
  }) => {
    const intl = useIntl();
    const strings = useMemo(
      () => ({
        CONNECTION_NAME_DISPLAY: intl.formatMessage({
          defaultMessage: 'Connection name',
          id: 'XOzn/3',
          description: 'This is for a label for a badge, it is used for screen readers and not shown on the screen.',
        }),
        CONNECTION_CONTAINER_CONNECTION_REQUIRED: intl.formatMessage({
          defaultMessage: 'Connection required',
          id: 'CG772M',
          description: 'This is for a label for a badge, it is used for screen readers and not shown on the screen.',
        }),
        PANEL_STATIC_RESULT_TITLE: intl.formatMessage({
          defaultMessage: 'Testing',
          id: 'm7Y6Qf',
          description: 'Title for a tab panel',
        }),
        MENU_STATIC_RESULT_ICON_TOOLTIP: intl.formatMessage({
          defaultMessage: 'This action has testing configured.',
          id: 'WxcmZr',
          description: "This is a tooltip for the Status results badge shown on a card. It's shown when the baged is hovered over.",
        }),
        COMMENT: intl.formatMessage({
          defaultMessage: 'Description',
          id: 'AlPxuK',
          description: 'This is for a label for a badge, it is used for screen readers and not shown on the screen.',
        }),
        SECURE_INPUTS_OUTPUTS_TITLE: intl.formatMessage({
          defaultMessage: 'Secure inputs or outputs enabled',
          id: 'eGN8Gl',
          description: 'Secure inputs or outputs enabled',
        }),
        SECURE_INPUTS_OUTPUTS_TOOLTIP: intl.formatMessage({
          defaultMessage: 'This operation has secure inputs or outputs enabled.',
          id: 'byRkj+',
          description: 'This operation has secure inputs or outputs enabled.',
        }),
        LOADING_DYNAMIC_DATA: intl.formatMessage({
          defaultMessage: 'Loading dynamic data',
          id: 'qMFpNH',
          description: 'Loading dynamic data',
        }),
      }),
      [intl]
    );

    const connectionTitle = useMemo(
      () => (connectionDisplayName ? strings.CONNECTION_NAME_DISPLAY : strings.CONNECTION_CONTAINER_CONNECTION_REQUIRED),
      [connectionDisplayName, strings]
    );

    const badges: CardBadgeProps[] = useMemo(
      () =>
        [
          {
            enabled: isLoadingDynamicData,
            active: true,
            content: strings.LOADING_DYNAMIC_DATA,
            badgeContent: <Spinner className="msla-badge-spinner" size={'extra-tiny'} />,
            title: strings.LOADING_DYNAMIC_DATA,
          },
          {
            enabled: staticResultsEnabled,
            active: true,
            content: strings.MENU_STATIC_RESULT_ICON_TOOLTIP,
            IconComponent: BeakerRegular,
            title: strings.PANEL_STATIC_RESULT_TITLE,
          },
          {
            enabled: !!commentBox?.comment,
            active: true,
            content: commentBox?.comment,
            IconComponent: CommentRegular,
            title: strings.COMMENT,
          },
          {
            enabled: !!(connectionRequired || connectionDisplayName),
            active: !!connectionDisplayName,
            content: connectionDisplayName || connectionTitle,
            IconComponent: LinkMultipleRegular,
            title: connectionTitle,
          },
          {
            enabled: isSecureInputsOutputs,
            active: true,
            content: strings.SECURE_INPUTS_OUTPUTS_TOOLTIP,
            IconComponent: LockClosedRegular,
            title: strings.SECURE_INPUTS_OUTPUTS_TITLE,
          },
        ].filter((badge) => badge.enabled),
      [
        commentBox,
        connectionDisplayName,
        connectionRequired,
        connectionTitle,
        isSecureInputsOutputs,
        staticResultsEnabled,
        strings,
        isLoadingDynamicData,
      ]
    );

    if (!badges.length) {
      return null;
    }

    return (
      <div className="msla-card-v2-footer">
        <CardBadgeBar badges={badges} tabIndex={nodeIndex} cardTitle={cardTitle} />
      </div>
    );
  }
);

const CardBadgeBar: React.FC<CardBadgeBarProps> = ({ badges, brandColor, tabIndex, cardTitle }) => {
  return (
    <div className="msla-badges" style={getHeaderStyle(brandColor)}>
      {badges.map(({ enabled, active, content, badgeContent, IconComponent, title }) => (
        <CardBadge
          key={title}
          title={title}
          cardTitle={cardTitle}
          content={content}
          badgeContent={badgeContent}
          IconComponent={IconComponent}
          enabled={enabled}
          active={active}
          tabIndex={tabIndex}
        />
      ))}
    </div>
  );
};

const CardBadge: React.FC<CardBadgeProps> = ({ enabled, active, content, badgeContent, IconComponent, title, cardTitle, tabIndex }) => {
  if (!enabled || !content) {
    return null;
  }

  return active ? (
    <Tooltip relationship={'label'} withArrow={true} content={`${cardTitle ?? ''} ${title}: ${content}`}>
      {badgeContent ?? (
        <div style={{ display: 'flex' }}>
          {IconComponent && <IconComponent role="button" className={'panel-card-v2-badge active'} tabIndex={tabIndex} />}
        </div>
      )}
    </Tooltip>
  ) : (
    (badgeContent ?? (IconComponent && <IconComponent className="panel-card-v2-badge inactive" aria-label={title} tabIndex={0} />))
  );
};
