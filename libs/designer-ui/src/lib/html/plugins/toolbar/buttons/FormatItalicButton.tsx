import { FORMAT_TEXT_COMMAND, type LexicalEditor } from 'lexical';
import { useIntl } from 'react-intl';
import italicDark from '../icons/dark/type-italic.svg';
import italicLight from '../icons/light/type-italic.svg';
import { FormatButton } from './FormatButton';

interface FormatItalicButtonProps {
  activeEditor: LexicalEditor;
  isToggledOn: boolean;
  readonly: boolean;
}

export const FormatItalicButton: React.FC<FormatItalicButtonProps> = (props) => {
  const { activeEditor, isToggledOn, readonly } = props;

  const intl = useIntl();

  const italicTitleMac = intl.formatMessage({
    defaultMessage: 'Italic (⌘I)',
    id: 'elD6+N',
    description: 'Command for italic text for Mac users',
  });
  const italicTitleMacAriaLabel = intl.formatMessage({
    defaultMessage: 'Format text as italic. Shortcut: ⌘I',
    id: 'YdQw4/',
    description: 'label to make italic text for Mac users',
  });
  const italicTitleNonMac = intl.formatMessage({
    defaultMessage: 'Italic (Ctrl+I)',
    id: 'dfmH55',
    description: 'Command for italic text for non-mac users',
  });
  const italicTitleNonMacAriaLabel = intl.formatMessage({
    defaultMessage: 'Format text as italic. Shortcut: Ctrl+I',
    id: 'gIx5ys',
    description: 'label to make italic text for nonMac users',
  });

  return (
    <FormatButton
      icons={{
        dark: italicDark,
        label: 'italic',
        light: italicLight,
      }}
      isToggledOn={isToggledOn}
      onClick={() => {
        activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
      }}
      readonly={readonly}
      strings={{
        label: italicTitleNonMacAriaLabel,
        labelMac: italicTitleMacAriaLabel,
        title: italicTitleNonMac,
        titleMac: italicTitleMac,
      }}
    />
  );
};
