import { FORMAT_TEXT_COMMAND, type LexicalEditor } from 'lexical';
import { useIntl } from 'react-intl';
import underlineDark from '../icons/dark/type-underline.svg';
import underlineLight from '../icons/light/type-underline.svg';
import { FormatButton } from './FormatButton';

interface FormatUnderlineButtonProps {
  activeEditor: LexicalEditor;
  isToggledOn: boolean;
  readonly: boolean;
}

export const FormatUnderlineButton: React.FC<FormatUnderlineButtonProps> = (props) => {
  const { activeEditor, isToggledOn, readonly } = props;

  const intl = useIntl();

  const underlineTitleMac = intl.formatMessage({
    defaultMessage: 'Underline (⌘U)',
    id: 'KYX5Do',
    description: 'Command for underline text for Mac users',
  });
  const underlineTitleMacAriaLabel = intl.formatMessage({
    defaultMessage: 'Format text as underline. Shortcut: ⌘U',
    id: 'qBkxGU',
    description: 'label to make underline text for Mac users',
  });
  const underlineTitleNonMac = intl.formatMessage({
    defaultMessage: 'Underline (Ctrl+U)',
    id: 'lwlg2K',
    description: 'Command for underline text for non-mac users',
  });
  const underlineTitleNonMacAriaLabel = intl.formatMessage({
    defaultMessage: 'Format text as underline. Shortcut: Ctrl+U',
    id: 'YJlS8E',
    description: 'label to make underline text for nonMac users',
  });

  return (
    <FormatButton
      icons={{
        dark: underlineDark,
        label: 'underline',
        light: underlineLight,
      }}
      isToggledOn={isToggledOn}
      onClick={() => {
        activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
      }}
      readonly={readonly}
      strings={{
        label: underlineTitleNonMacAriaLabel,
        labelMac: underlineTitleMacAriaLabel,
        title: underlineTitleNonMac,
        titleMac: underlineTitleMac,
      }}
    />
  );
};
