import { ToolbarButton } from "@fluentui/react-components";
import { isApple } from '@microsoft/logic-apps-shared';
import type { LexicalEditor} from "lexical";
import { REDO_COMMAND } from "lexical";
import clockWiseArrowDark from '../../icons/dark/arrow-clockwise.svg';
import clockWiseArrowLight from '../../icons/light/arrow-clockwise.svg';
import { CLOSE_DROPDOWN_COMMAND } from '../helper/Dropdown';
import { useTheme } from "@fluentui/react";
import { useIntl } from "react-intl";

interface RedoButtonProps {
  activeEditor: LexicalEditor;
  disabled: boolean;
}

export const RedoButton: React.FC<RedoButtonProps> = (props) => {
  const { activeEditor, disabled } = props;
  const { isInverted } = useTheme();
  const intl = useIntl();

  const redoLabel = intl.formatMessage({
    defaultMessage: 'Redo',
    id: 'Cy4+KL',
    description: 'Label for redoing a change which was undone in a text input',
  });

  const redoTitle = `${redoLabel} (${isApple() ? '⌘Z' : 'Ctrl+Z'})`;

  return (
    <ToolbarButton
      disabled={disabled}
      onClick={() => {
        activeEditor.dispatchCommand(CLOSE_DROPDOWN_COMMAND, undefined);
        activeEditor.dispatchCommand(REDO_COMMAND, undefined);
      }}
      title={redoTitle}
      className="toolbar-item"
      aria-label={redoLabel}
      icon={<img className={'format'} src={isInverted ? clockWiseArrowDark : clockWiseArrowLight} alt={'clockwise arrow'} />}
    />
  );
};
