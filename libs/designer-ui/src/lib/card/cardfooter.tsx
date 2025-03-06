/* eslint-disable react/display-name */
import type { CardProps } from './index';
import { getHeaderStyle } from './utils';
import type { IIconProps } from '@fluentui/react';
import { Icon } from '@fluentui/react';
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
  iconProps?: IIconProps;
  badgeContent?: any;
  title: string;
  tabIndex?: number;
  cardTitle?: string;
}

const commentIconProps: IIconProps = {
  iconName: 'Comment',
};

const connectionIconProps: IIconProps = {
  iconName: 'Link',
};

const staticResultIconProps: IIconProps = {
  iconName: 'TestBeaker',
};

const lockIconProps: IIconProps = {
  iconName: 'Lock',
};

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
          id: 'ms5cece7ff72ec',
          description: 'This is for a label for a badge, it is used for screen readers and not shown on the screen.',
        }),
        CONNECTION_CONTAINER_CONNECTION_REQUIRED: intl.formatMessage({
          defaultMessage: 'Connection required',
          id: 'ms086efbd8c85f',
          description: 'This is for a label for a badge, it is used for screen readers and not shown on the screen.',
        }),
        PANEL_STATIC_RESULT_TITLE: intl.formatMessage({
          defaultMessage: 'Testing',
          id: 'ms9bb63a41f426',
          description: 'Title for a tab panel',
        }),
        MENU_STATIC_RESULT_ICON_TOOLTIP: intl.formatMessage({
          defaultMessage: 'This action has testing configured.',
          id: 'ms5b172666b970',
          description: "This is a tooltip for the Status results badge shown on a card. It's shown when the baged is hovered over.",
        }),
        COMMENT: intl.formatMessage({
          defaultMessage: 'Comment',
          id: 'ms557056aea4c1',
          description: 'This is for a label for a badge, it is used for screen readers and not shown on the screen.',
        }),
        SECURE_INPUTS_OUTPUTS_TITLE: intl.formatMessage({
          defaultMessage: 'Secure inputs or outputs enabled',
          id: 'ms78637c1a5b40',
          description: 'Secure inputs or outputs enabled',
        }),
        SECURE_INPUTS_OUTPUTS_TOOLTIP: intl.formatMessage({
          defaultMessage: 'This operation has secure inputs or outputs enabled.',
          id: 'ms6f24648fef72',
          description: 'This operation has secure inputs or outputs enabled.',
        }),
        LOADING_DYNAMIC_DATA: intl.formatMessage({
          defaultMessage: 'Loading dynamic data',
          id: 'msa8c169347365',
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
            iconProps: staticResultIconProps,
            title: strings.PANEL_STATIC_RESULT_TITLE,
          },
          {
            enabled: !!commentBox?.comment,
            active: true,
            content: commentBox?.comment,
            iconProps: commentIconProps,
            title: strings.COMMENT,
          },
          {
            enabled: !!(connectionRequired || connectionDisplayName),
            active: !!connectionDisplayName,
            content: connectionDisplayName || connectionTitle,
            iconProps: connectionIconProps,
            title: connectionTitle,
          },
          {
            enabled: isSecureInputsOutputs,
            active: true,
            content: strings.SECURE_INPUTS_OUTPUTS_TOOLTIP,
            iconProps: lockIconProps,
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
      {badges.map(({ enabled, active, content, badgeContent, iconProps, title }) => (
        <CardBadge
          key={title}
          title={title}
          cardTitle={cardTitle}
          content={content}
          badgeContent={badgeContent}
          iconProps={iconProps}
          enabled={enabled}
          active={active}
          tabIndex={tabIndex}
        />
      ))}
    </div>
  );
};

const CardBadge: React.FC<CardBadgeProps> = ({ enabled, active, content, badgeContent, iconProps, title, cardTitle, tabIndex }) => {
  if (!enabled || !content) {
    return null;
  }

  return active ? (
    <Tooltip relationship={'label'} withArrow={true} content={`${cardTitle ?? ''} ${title}: ${content}`}>
      {badgeContent ?? (
        <div>
          <Icon role="button" className={'panel-card-v2-badge active'} {...iconProps} tabIndex={tabIndex} />
        </div>
      )}
    </Tooltip>
  ) : (
    (badgeContent ?? <Icon className="panel-card-v2-badge inactive" {...iconProps} aria-label={title} tabIndex={0} />)
  );
};
