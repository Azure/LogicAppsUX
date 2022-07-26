import KeyValueMode from '../../card/images/key_value_mode.svg';
import KeyValueModeInverted from '../../card/images/key_value_mode_inverted.svg';
import TextMode from '../../card/images/text_mode.svg';
import TextModeInverted from '../../card/images/text_mode_inverted.svg';
import { isHighContrastBlack } from '../../utils';
import type { ICalloutProps, ITooltipHostStyles } from '@fluentui/react';
import { IconButton, TooltipHost, DirectionalHint } from '@fluentui/react';
import { useIntl } from 'react-intl';

export interface EditorCollapseToggleProps {
  collapsed: boolean;
  disabled?: boolean;
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
  toggleCollapsed,
}): JSX.Element => {
  const intl = useIntl();
  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    toggleCollapsed();
  };

  const isInverted = isHighContrastBlack();

  const PARAMETER_EXPAND_ICON_DESC = intl.formatMessage({
    defaultMessage: 'Switch to detail inputs for array item',
    description: 'Label for switching input to array',
  });

  const PARAMETER_COLLAPSE_ICON_DESC = intl.formatMessage({
    defaultMessage: 'Switch to input entire array',
    description: 'Label for switching input to Text',
  });

  const toggleIcon = collapsed ? (isInverted ? KeyValueModeInverted : KeyValueMode) : isInverted ? TextModeInverted : TextMode;

  const toggleText = collapsed ? PARAMETER_EXPAND_ICON_DESC : PARAMETER_COLLAPSE_ICON_DESC;

  return (
    <TooltipHost calloutProps={calloutProps} content={toggleText} styles={inlineBlockStyle}>
      <IconButton
        aria-label={toggleText}
        className="msla-button msla-editor-toggle-button"
        disabled={disabled}
        iconProps={{ imageProps: { src: toggleIcon } }}
        onClick={handleToggle}
      />
    </TooltipHost>
  );
};
