import type { CardProps } from './index';
import { getHeaderStyle } from './utils';
import type { IIconProps } from '@fluentui/react';
import { css, Icon, TooltipHost } from '@fluentui/react';
import { useIntl } from 'react-intl';

export type CardFooterProps = Pick<CardProps, 'commentBox' | 'connectionDisplayName' | 'connectionRequired' | 'staticResultsEnabled'>;

interface CardBadgeBarProps {
  badges: CardBadgeProps[];
  brandColor?: string;
}

interface CardBadgeProps {
  active: boolean;
  content: string;
  darkBackground?: boolean;
  iconProps: IIconProps;
  title: string;
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

export const CardFooter: React.FC<CardFooterProps> = ({ commentBox, connectionDisplayName, connectionRequired, staticResultsEnabled }) => {
  const intl = useIntl();

  const CONNECTION_NAME_DISPLAY = intl.formatMessage({
    defaultMessage: 'Connection name',
    description: 'This is for a label for a badge, it is used for screen readers and not shown on the screen.',
  });
  const CONNECTION_CONTAINER_CONNECTION_REQUIRED = intl.formatMessage({
    defaultMessage: 'Connection required',
    description: 'This is for a label for a badge, it is used for screen readers and not shown on the screen.',
  });
  const PANEL_STATIC_RESULT_TITLE = intl.formatMessage({
    defaultMessage: 'Testing',
    description: 'Title for a tab panel',
  });
  const MENU_STATIC_RESULT_ICON_TOOLTIP = intl.formatMessage({
    defaultMessage: 'This Action has testing configured.',
    description: "This is a tooltip for the Status results badge shown on a card. It's shown when the baged is hovered over.",
  });
  const COMMENT = intl.formatMessage({
    defaultMessage: 'Comment',
    description: 'This is for a label for a badge, it is used for screen readers and not shown on the screen.',
  });

  const connectionTitle = connectionDisplayName ? CONNECTION_NAME_DISPLAY : CONNECTION_CONTAINER_CONNECTION_REQUIRED;

  const staticResultsBadge = {
    active: true,
    content: MENU_STATIC_RESULT_ICON_TOOLTIP,
    iconProps: staticResultIconProps,
    title: PANEL_STATIC_RESULT_TITLE,
  };

  const badges: CardBadgeProps[] = [
    ...(staticResultsEnabled ? [staticResultsBadge] : []),
    ...(commentBox && commentBox.comment
      ? [
          {
            active: true,
            content: commentBox.comment,
            iconProps: commentIconProps,
            title: COMMENT,
          },
        ]
      : []),
    ...(connectionRequired || connectionDisplayName
      ? [
          {
            active: true,
            content: connectionDisplayName || connectionTitle,
            iconProps: connectionIconProps,
            title: connectionTitle,
          },
        ]
      : []),
  ];

  return (
    <div className="msla-card-v2-footer">
      <CardBadgeBar badges={badges} />
    </div>
  );
};

const CardBadgeBar: React.FC<CardBadgeBarProps> = ({ badges, brandColor }) => {
  return (
    <div className="msla-badges" style={getHeaderStyle(brandColor)}>
      {badges.map(({ active, content, darkBackground, iconProps, title }) => (
        <CardBadge key={title} title={title} content={content} darkBackground={darkBackground} iconProps={iconProps} active={active} />
      ))}
    </div>
  );
};

const CardBadge: React.FC<CardBadgeProps> = ({ active, content, darkBackground = false, iconProps, title }) => {
  if (!content) {
    return null;
  } else if (active) {
    return (
      <TooltipHost content={content}>
        <Icon
          className={css('panel-card-v2-badge', 'active', darkBackground && 'darkBackground')}
          {...iconProps}
          ariaLabel={`${title}: ${content}`}
          tabIndex={0}
        />
      </TooltipHost>
    );
  } else {
    return <Icon className="panel-card-v2-badge inactive" {...iconProps} ariaLabel={title} tabIndex={0} />;
  }
};
