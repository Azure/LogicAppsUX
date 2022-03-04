import type { IButtonStyles, IIconProps } from '@fluentui/react';
import { ActionButton } from '@fluentui/react';

export interface ValueLinkProps {
  linkText: string;
  visible?: boolean;
  onLinkClick?(): void;
}

const iconProps: IIconProps = {
  iconName: 'ChevronRightSmall',
};

const styles: Partial<IButtonStyles> = {
  flexContainer: {
    flexDirection: 'row-reverse',
  },
  root: {
    border: 'none',
  },
  rootHovered: {
    border: 'none',
  },
};

export const ValueLink: React.FC<ValueLinkProps> = ({ linkText, visible = false, onLinkClick }) => {
  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.preventDefault();

    if (onLinkClick) {
      onLinkClick();
    }
  };

  if (!visible) {
    return null;
  }

  return <ActionButton className="msla-show-raw-button" iconProps={iconProps} styles={styles} text={linkText} onClick={handleClick} />;
};
