/* eslint-disable react/display-name */
import type { CardProps } from './index';
import { getHeaderStyle } from './utils';
import type { IIconProps } from '@fluentui/react';
import { css, Icon } from '@fluentui/react';
import { Tooltip } from '@fluentui/react-components';
import { memo, useMemo } from 'react';
import { useIntl } from 'react-intl';

export type CardFooterProps = Pick<
  CardProps,
  'commentBox' | 'connectionDisplayName' | 'connectionRequired' | 'staticResultsEnabled' | 'isSecureInputsOutputs' | 'nodeIndex'
>;

interface CardBadgeBarProps {
  badges: CardBadgeProps[];
  brandColor?: string;
  tabIndex?: number;
}

interface CardBadgeProps {
  active: boolean;
  content: string;
  darkBackground?: boolean;
  iconProps: IIconProps;
  title: string;
  tabIndex?: number;
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
  ({ commentBox, connectionDisplayName, connectionRequired, staticResultsEnabled, isSecureInputsOutputs, nodeIndex }) => {
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
          defaultMessage: 'Comment',
          id: 'VXBWrq',
          description: 'This is for a label for a badge, it is used for screen readers and not shown on the screen.',
        }),
        SECURE_INPUTS_OUTPUTS_TITLE: intl.formatMessage({
          defaultMessage: 'Secure inputs or outputs enabled.',
          id: '0F6jmK',
          description: 'Secure inputs or outputs enabled.',
        }),
        SECURE_INPUTS_OUTPUTS_TOOLTIP: intl.formatMessage({
          defaultMessage: 'This operation has secure inputs or outputs enabled.',
          id: 'byRkj+',
          description: 'This operation has secure inputs or outputs enabled.',
        }),
      }),
      [intl]
    );

    const connectionTitle = useMemo(
      () => (connectionDisplayName ? strings.CONNECTION_NAME_DISPLAY : strings.CONNECTION_CONTAINER_CONNECTION_REQUIRED),
      [connectionDisplayName, strings]
    );

    const badges: CardBadgeProps[] = useMemo(
      () => [
        ...(staticResultsEnabled
          ? [
              {
                active: true,
                content: strings.MENU_STATIC_RESULT_ICON_TOOLTIP,
                iconProps: staticResultIconProps,
                title: strings.PANEL_STATIC_RESULT_TITLE,
              },
            ]
          : []),
        ...(commentBox && commentBox.comment
          ? [
              {
                active: true,
                content: commentBox.comment,
                iconProps: commentIconProps,
                title: strings.COMMENT,
              },
            ]
          : []),
        ...(connectionRequired || connectionDisplayName
          ? [
              {
                active: !!connectionDisplayName,
                content: connectionDisplayName || connectionTitle,
                iconProps: connectionIconProps,
                title: connectionTitle,
              },
            ]
          : []),
        ...(isSecureInputsOutputs
          ? [
              {
                active: true,
                content: strings.SECURE_INPUTS_OUTPUTS_TOOLTIP,
                iconProps: lockIconProps,
                title: strings.SECURE_INPUTS_OUTPUTS_TITLE,
              },
            ]
          : []),
      ],
      [commentBox, connectionDisplayName, connectionRequired, connectionTitle, isSecureInputsOutputs, staticResultsEnabled, strings]
    );

    if (!badges.length) {
      return null;
    }

    return (
      <div className="msla-card-v2-footer">
        <CardBadgeBar badges={badges} tabIndex={nodeIndex} />
      </div>
    );
  }
);

const CardBadgeBar: React.FC<CardBadgeBarProps> = ({ badges, brandColor, tabIndex }) => {
  return (
    <div className="msla-badges" style={getHeaderStyle(brandColor)}>
      {badges.map(({ active, content, darkBackground, iconProps, title }) => (
        <CardBadge
          key={title}
          title={title}
          content={content}
          darkBackground={darkBackground}
          iconProps={iconProps}
          active={active}
          tabIndex={tabIndex}
        />
      ))}
    </div>
  );
};

const CardBadge: React.FC<CardBadgeProps> = ({ active, content, darkBackground = false, iconProps, title, tabIndex }) => {
  if (!content) {
    return null;
  }
  if (active) {
    return (
      <Tooltip relationship={'label'} withArrow={true} content={content}>
        <div>
          <Icon
            className={css('panel-card-v2-badge', 'active', darkBackground && 'darkBackground')}
            {...iconProps}
            ariaLabel={`${title}: ${content}`}
            tabIndex={tabIndex}
          />
        </div>
      </Tooltip>
    );
  }
  return <Icon className="panel-card-v2-badge inactive" {...iconProps} ariaLabel={title} tabIndex={0} />;
};
