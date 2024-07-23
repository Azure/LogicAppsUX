import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import type { LexicalEditor } from 'lexical';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import linkDark from '../../icons/dark/link.svg';
import linkLight from '../../icons/light/link.svg';
import { sanitizeUrl } from '../helper/functions';
import { FormatButton } from './FormatButton';

interface FormatLinkButtonProps {
  activeEditor: LexicalEditor;
  isToggledOn: boolean;
  readonly: boolean;
}

export const FormatLinkButton: React.FC<FormatLinkButtonProps> = (props) => {
  const { activeEditor, isToggledOn, readonly } = props;

  const intl = useIntl();

  const insertLink = useCallback(() => {
    if (isToggledOn) {
      activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    } else {
      activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, sanitizeUrl('https://'));
    }
  }, [activeEditor, isToggledOn]);

  const insertLinkLabel = intl.formatMessage({
    defaultMessage: 'Insert Link',
    id: 'tUCptx',
    description: 'label to insert link',
  });

  return (
    <FormatButton
      icons={{
        dark: linkDark,
        label: 'link',
        light: linkLight,
      }}
      isToggledOn={isToggledOn}
      onClick={insertLink}
      readonly={readonly}
      strings={{
        title: insertLinkLabel,
      }}
    />
  );
};
