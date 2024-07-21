import { useTheme } from '@fluentui/react';
import { mergeClasses, ToolbarButton } from '@fluentui/react-components';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';
import type { LexicalEditor } from 'lexical';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { sanitizeUrl } from '../helper/functions';
import linkDark from '../icons/dark/link.svg';
import linkLight from '../icons/light/link.svg';

interface FormatLinkButtonProps {
  activeEditor: LexicalEditor;
  isToggledOn: boolean;
  readonly: boolean;
}

export const FormatLinkButton: React.FC<FormatLinkButtonProps> = (props) => {
  const { activeEditor, isToggledOn, readonly } = props;

  const { isInverted } = useTheme();
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
    <ToolbarButton
      onMouseDown={(e) => e.preventDefault()}
      disabled={readonly}
      onClick={insertLink}
      className={mergeClasses('toolbar-item', 'spaced', isToggledOn && 'active')}
      aria-label={insertLinkLabel}
      title={insertLinkLabel}
      icon={<img className={'format'} src={isInverted ? linkDark : linkLight} alt={'link icon'} />}
    />
  );
};
