import { useTheme } from '@fluentui/react';
import { mergeClasses, ToolbarButton } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import codeToggleDark from '../../icons/dark/code-toggle.svg';
import codeToggleLight from '../../icons/light/code-toggle.svg';

interface HtmlViewToggleButtonProps {
  disabled: boolean;
  isPressed: boolean;
  onToggle: () => void;
}

export const HtmlViewToggleButton: React.FC<HtmlViewToggleButtonProps> = (props) => {
  const { disabled, isPressed, onToggle } = props;
  const { isInverted } = useTheme();
  const intl = useIntl();

  const toggleCodeViewMessage = intl.formatMessage({
    defaultMessage: 'Toggle code view',
    id: 'gA1dde',
    description: 'Label used for the toolbar button which switches between raw HTML (code) view and WYSIWIG (rich text) view',
  });

  return (
    <ToolbarButton
      aria-label={toggleCodeViewMessage}
      className={mergeClasses('toolbar-item', isPressed && 'active')}
      disabled={disabled}
      icon={<img className={'format'} src={isInverted ? codeToggleDark : codeToggleLight} alt={'code view'} />}
      onClick={onToggle}
      title={toggleCodeViewMessage}
    />
  );
};
