import type { TokenPickerButtonProps } from '..';
import { TokenNode } from '../nodes/tokenNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect } from 'react';
import { useIntl } from 'react-intl';

interface ButtonProps extends TokenPickerButtonProps {
  showTokenPicker: boolean;
  labelId: string;
}
export default function TokenPickerButton({
  showTokenPicker,
  buttonClassName,
  buttonHeight,
  labelId,
  toggleTokenPicker,
}: ButtonProps): JSX.Element {
  const [editor] = useLexicalComposerContext();

  const intl = useIntl();
  useEffect(() => {
    if (!editor.hasNodes([TokenNode])) {
      throw new Error('TokenPlugin: Register the TokenNode on editor');
    }
  }, [editor]);

  const addContent = intl.formatMessage({
    defaultMessage: 'Add dynamic content',
    description: 'Label for button to open token picker',
  });
  const addContentAltTextShow = intl.formatMessage({
    defaultMessage: 'Button to add dynamic content if TokenPicker is shown',
    description: 'Text for if image does not show up',
  });
  const addContentAltTextHide = intl.formatMessage({
    defaultMessage: 'Button to add dynamic content if TokenPicker is hidden',
    description: 'Text for if image does not show up',
  });

  return (
    <button
      id={labelId}
      className={`msla-tokenpicker-button ${buttonClassName}`}
      onClick={toggleTokenPicker}
      onMouseDown={(e) => e.preventDefault()}
      style={{ top: `${buttonHeight}px` }}
    >
      <p className="msla-tokenpicker-button-text">{addContent}</p>
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
  );
}
