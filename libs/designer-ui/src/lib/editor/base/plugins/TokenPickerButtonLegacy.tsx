import { TokenNode } from '../nodes/tokenNode';
import { TooltipHost } from '@fluentui/react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalEditor } from 'lexical';
import type { editor } from 'monaco-editor';
import { useEffect } from 'react';
import { useIntl } from 'react-intl';

export interface ButtonOffSet {
  heightOffset?: number;
  widthOffset?: number;
}

export interface TokenPickerButtonProps {
  buttonClassName?: string;
  buttonOffset?: ButtonOffSet;
  customButton?: boolean;
  setShowTokenPicker?: () => void;
  codeEditor?: editor.IStandaloneCodeEditor | null;
}

interface ButtonProps extends TokenPickerButtonProps {
  showTokenPicker: boolean;
  labelId: string;
}

export default function TokenPickerButtonLegacy({
  showTokenPicker,
  buttonClassName,
  buttonOffset,
  labelId,
  customButton,
  setShowTokenPicker,
  codeEditor,
}: ButtonProps): JSX.Element {
  let editor: LexicalEditor | null;
  try {
    [editor] = useLexicalComposerContext();
  } catch {
    editor = null;
  }

  useEffect(() => {
    if (editor && !editor.hasNodes([TokenNode])) {
      throw new Error('TokenPlugin: Register the TokenNode on editor');
    }
  }, [editor]);

  const intl = useIntl();

  const addContent = intl.formatMessage({
    defaultMessage: 'Add dynamic content',
    description: 'Label for button to open token picker',
  });
  const addContentAltTextShow = intl.formatMessage({
    defaultMessage: 'Button to add dynamic content if Token Picker is shown',
    description: 'Text for if image does not show up',
  });
  const addContentAltTextHide = intl.formatMessage({
    defaultMessage: 'Button to add dynamic content if Token Picker is hidden',
    description: 'Text for if image does not show up',
  });

  const handleClick = () => {
    if (showTokenPicker && codeEditor) {
      codeEditor.focus();
    }
    setShowTokenPicker?.();
    if (editor) {
      editor.focus();
    }
  };

  const dynamicContentButtonText = intl.formatMessage({
    defaultMessage: `Insert data from previous step (You can also add by typing Alt + / in the editor)`,
    description: 'Label for button to open dynamic content token picker',
  });

  return (
    <TooltipHost content={dynamicContentButtonText}>
      <button
        id={labelId}
        className={`msla-tokenpicker-button ${buttonClassName}`}
        onClick={() => {
          handleClick();
        }}
        onMouseDown={(e) => e.preventDefault()}
        style={
          customButton
            ? { bottom: '-1px', right: '-5px' }
            : { top: `${buttonOffset?.heightOffset}px`, right: `${buttonOffset?.widthOffset}px` }
        }
      >
        {customButton ? null : <p className="msla-tokenpicker-button-text">{addContent}</p>}
        {showTokenPicker ? (
          <img
            src="data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxMyI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiMwMDU4YWQ7fTwvc3R5bGU+PC9kZWZzPjx0aXRsZT5jbGlja2VkIHN0YXRlX2R5bmFtaWMgY29udGVudDwvdGl0bGU+PHBhdGggY2xhc3M9ImNscy0xIiBkPSJNMCwxLjV2MTNIMTJWMS41SDBabTksN0g3djJINnYtMkg0di0xSDZ2LTJIN3YySDl2MVoiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgLTEuNSkiLz48cmVjdCBjbGFzcz0iY2xzLTEiIHg9IjEzIiB3aWR0aD0iMyIgaGVpZ2h0PSIxMyIvPjwvc3ZnPg=="
            height="13px"
            alt={addContentAltTextShow}
          />
        ) : (
          <img
            src="data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxMyI+PGRlZnM+PHN0eWxlPi5jbHMtMXtmaWxsOiMwMDU4YWQ7fTwvc3R5bGU+PC9kZWZzPjx0aXRsZT5keW5hbWljIGNvbnRlbnQ8L3RpdGxlPjxwYXRoIGNsYXNzPSJjbHMtMSIgZD0iTTM2LDEuNXYxM0g1MlYxLjVIMzZabTEsMTJWMi41SDQ4djExSDM3Wm0xNCwwSDQ5VjIuNWgydjExWiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoLTM2IC0xLjUpIi8+PHBvbHlnb24gY2xhc3M9ImNscy0xIiBwb2ludHM9IjkgNiA3IDYgNyA0IDYgNCA2IDYgNCA2IDQgNyA2IDcgNiA5IDcgOSA3IDcgOSA3IDkgNiIvPjwvc3ZnPg=="
            height="13"
            alt={addContentAltTextHide}
          />
        )}
      </button>
    </TooltipHost>
  );
}
