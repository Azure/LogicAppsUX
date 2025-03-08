import { useTheme } from '@fluentui/react';
import { mergeClasses, ToolbarButton } from '@fluentui/react-components';
import { isApple } from '@microsoft/logic-apps-shared';

export interface FormatButtonProps {
  icons: {
    dark: string;
    label: string;
    light: string;
  };
  isToggledOn: boolean;
  onClick: () => void;
  readonly: boolean;
  strings: {
    label?: string;
    labelMac?: string;
    title: string;
    titleMac?: string;
  };
}

export const FormatButton: React.FC<FormatButtonProps> = (props) => {
  const {
    icons: { dark: iconDark, label: iconLabel, light: iconLight },
    isToggledOn,
    onClick,
    readonly,
    strings: { label, labelMac, title, titleMac },
  } = props;

  const { isInverted } = useTheme();

  const buttonTitle = isApple() && titleMac ? titleMac : title;
  const buttonLabel = (isApple() && labelMac ? labelMac : label) || buttonTitle;

  return (
    <ToolbarButton
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={mergeClasses('toolbar-item', 'spaced', isToggledOn && 'active')}
      title={buttonTitle}
      aria-label={buttonLabel}
      disabled={readonly}
      icon={<img className="format" src={isInverted ? iconDark : iconLight} alt={`${iconLabel} icon`} />}
    />
  );
};
