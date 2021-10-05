import { Icon, IIconProps } from '@fluentui/react/lib/Icon';
import { ILinkStyles, Link } from '@fluentui/react/lib/Link';
import { FontSizes } from '@fluentui/react/lib/Styling';
import * as React from 'react';
import { useIntl } from 'react-intl';
import { isObject } from '../../common/utilities/Utils';

export interface UserVoiceProps {
  disabled?: boolean;
  headerText?: string;
  iconProps?: IIconProps;
  openWindow?(url: string): Promise<boolean>;
  segments: UserVoiceSegmentProps[];
}

export interface UserVoiceSegmentProps {
  disabled?: boolean;
  href?: string;
  openWindow?(url: string): Promise<boolean>;
  text: string;
}

const linkStyles: Partial<ILinkStyles> = {
  root: {
    fontSize: FontSizes.small,
  },
};

export const UserVoice: React.FC<UserVoiceProps> = (props) => {
  const intl = useIntl();
  if (props.segments.length === 0) {
    return null;
  }

  const defaultHeaderText = intl.formatMessage({
    description: 'A label on a link to take users to a place where they can suggest features.',
    defaultMessage: "Don't see what you need?",
    id: 'EGXrx5',
  });
  const {
    disabled = false,
    headerText = defaultHeaderText,
    iconProps = {
      className: 'msla-uservoice-icon',
      iconName: 'Emoji2',
    },
    openWindow,
    segments,
  } = props;

  return (
    <section className="msla-uservoice">
      {headerText ? <header>{headerText}</header> : null}
      <div className="msla-uservoice-link">
        <Icon {...iconProps} />
        {segments.map((segment, index) => (
          <UserVoiceSegment disabled={disabled} key={String(index)} openWindow={openWindow} {...segment} />
        ))}
      </div>
    </section>
  );
};

export const UserVoiceSegment: React.FC<UserVoiceSegmentProps> = (props) => {
  const { disabled = false, href, text, openWindow } = props;
  const handleClick = React.useCallback(async (): Promise<void> => {
    if (openWindow) {
      await openWindow(href ?? '');
    }
  }, [href, openWindow]);
  if (disabled || !href) {
    return <span>{text}</span>;
  }

  return (
    <Link href={href} rel="noopener" styles={linkStyles} target="_blank" onClick={handleClick}>
      {text}
    </Link>
  );
};

export const isUserVoiceProps = (value: any): value is UserVoiceProps => {
  return isObject(value) && (value.disabled === undefined || typeof value.disabled === 'boolean') && Array.isArray(value.segments);
};
