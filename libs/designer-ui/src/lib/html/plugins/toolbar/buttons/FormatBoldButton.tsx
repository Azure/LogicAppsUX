import { FORMAT_TEXT_COMMAND, type LexicalEditor } from 'lexical';
import { useIntl } from 'react-intl';
import boldDark from '../../icons/dark/type-bold.svg';
import boldLight from '../../icons/light/type-bold.svg';
import { FormatButton } from './FormatButton';

interface FormatBoldButtonProps {
  activeEditor: LexicalEditor;
  isToggledOn: boolean;
  readonly: boolean;
}

export const FormatBoldButton: React.FC<FormatBoldButtonProps> = (props) => {
  const { activeEditor, isToggledOn, readonly } = props;

  const intl = useIntl();

  const boldTitleMac = intl.formatMessage({
    defaultMessage: 'Bold (⌘B)',
    id: 'ms7222e47d458d',
    description: 'Command for bold text for Mac users',
  });
  const boldTitleMacAriaLabel = intl.formatMessage({
    defaultMessage: 'Format text as bold. Shortcut: ⌘B',
    id: 'ms4b5dfcff86f4',
    description: 'label to make bold text for Mac users',
  });
  const boldTitleNonMac = intl.formatMessage({
    defaultMessage: 'Bold (Ctrl+B)',
    id: 'ms2e7aa1ea1a3f',
    description: 'Command for bold text for non-mac users',
  });
  const boldTitleNonMacAriaLabel = intl.formatMessage({
    defaultMessage: 'Format text as bold. Shortcut: Ctrl+B',
    id: 'ms611d6e58437a',
    description: 'label to make bold text for nonMac users',
  });

  return (
    <FormatButton
      icons={{
        dark: boldDark,
        label: 'bold',
        light: boldLight,
      }}
      isToggledOn={isToggledOn}
      onClick={() => {
        activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
      }}
      readonly={readonly}
      strings={{
        label: boldTitleNonMacAriaLabel,
        labelMac: boldTitleMacAriaLabel,
        title: boldTitleNonMac,
        titleMac: boldTitleMac,
      }}
    />
  );
};
