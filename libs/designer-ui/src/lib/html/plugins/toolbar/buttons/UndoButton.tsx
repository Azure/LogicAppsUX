import { useTheme } from "@fluentui/react";
import { ToolbarButton } from "@fluentui/react-components";
import { isApple } from '@microsoft/logic-apps-shared';
import type { LexicalEditor } from "lexical";
import { UNDO_COMMAND } from "lexical";
import { useIntl } from "react-intl";
import counterClockWiseArrowDark from '../../icons/dark/arrow-counterclockwise.svg';
import counterClockWiseArrowLight from '../../icons/light/arrow-counterclockwise.svg';
import { CLOSE_DROPDOWN_COMMAND } from '../helper/Dropdown';

interface UndoButtonProps {
  activeEditor: LexicalEditor;
  disabled: boolean;
}

export const UndoButton: React.FC<UndoButtonProps> = (props) => {
  const { activeEditor, disabled } = props;
  const { isInverted } = useTheme();
  const intl = useIntl();

  const undoLabel = intl.formatMessage({
    defaultMessage: 'Undo',
    id: 'q5lttG',
    description: 'Label for undoing a change in a text input',
  });

  const undoTitle = `${undoLabel} (${isApple() ? '⌘Z' : 'Ctrl+Z'})`;

  return (
    <ToolbarButton
      disabled={disabled}
      onClick={() => {
        activeEditor.dispatchCommand(CLOSE_DROPDOWN_COMMAND, undefined);
        activeEditor.dispatchCommand(UNDO_COMMAND, undefined);
      }}
      title={undoTitle}
      className="toolbar-item"
      aria-label={undoLabel}
      icon={
        <img
          className={'format'}
          src={isInverted ? counterClockWiseArrowDark : counterClockWiseArrowLight}
          alt={'counter clockwise arrow'}
        />
      }
    />
  );
};
