import KeyValueMode from '../../../card/images/key_value_mode.svg';
import KeyValueModeInverted from '../../../card/images/key_value_mode_inverted.svg';
import TextMode from '../../../card/images/text_mode.svg';
import TextModeInverted from '../../../card/images/text_mode_inverted.svg';
import type { ICalloutProps, ITooltipHostStyles } from '@fluentui/react';
import { useTheme, IconButton, TooltipHost, DirectionalHint } from '@fluentui/react';
import { mergeClasses } from '@fluentui/react-components';
import { useEditorCollapseToggleStyles } from './editorCollapseToggle.styles';

export interface EditorCollapseToggleProps {
  collapsed: boolean;
  disabled?: boolean;
  label?: string;
  toggleCollapsed: () => void;
}

const calloutProps: ICalloutProps = {
  directionalHint: DirectionalHint.topCenter,
};

const inlineBlockStyle: Partial<ITooltipHostStyles> = {
  root: { display: 'inline-block' },
};

export const EditorCollapseToggle: React.FC<EditorCollapseToggleProps> = ({
  collapsed,
  disabled = false,
  label,
  toggleCollapsed,
}): JSX.Element => {
  const { isInverted } = useTheme();
  const styles = useEditorCollapseToggleStyles();

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    toggleCollapsed();
  };

  const toggleIcon = collapsed ? (isInverted ? KeyValueModeInverted : KeyValueMode) : isInverted ? TextModeInverted : TextMode;

  return (
    <TooltipHost calloutProps={calloutProps} content={label} styles={inlineBlockStyle}>
      <IconButton
        aria-label={label}
        className={mergeClasses('msla-button', styles.toggleButton)}
        disabled={disabled}
        iconProps={{ imageProps: { src: toggleIcon } }}
        onClick={handleToggle}
      />
    </TooltipHost>
  );
};
