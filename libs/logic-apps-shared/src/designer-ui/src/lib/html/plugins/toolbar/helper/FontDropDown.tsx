import { DropDown } from './Dropdown';
import { DropDownItem } from './DropdownItem';
import { FONT_FAMILY_OPTIONS, FONT_SIZE_OPTIONS } from './constants';
import { dropDownActiveClass } from './util';
import { $patchStyleText } from '@lexical/selection';
import type { LexicalEditor } from 'lexical';
import { $isRangeSelection, $getSelection } from 'lexical';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

export const FontDropDownType = {
  FONTFAMILY: 'font-family',
  FONTSIZE: 'font-size',
} as const;
export type FontDropDownType = (typeof FontDropDownType)[keyof typeof FontDropDownType];
interface FontDropdownProps {
  editor: LexicalEditor;
  value: string;
  fontDropdownType: FontDropDownType;
  disabled?: boolean;
}

export function FontDropDown({ editor, value, fontDropdownType, disabled = false }: FontDropdownProps): JSX.Element {
  const intl = useIntl();
  const handleClick = useCallback(
    (option: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, {
            [fontDropdownType]: option,
          });
        }
      });
    },
    [editor, fontDropdownType]
  );

  const buttonAriaLabel =
    fontDropdownType === FontDropDownType.FONTFAMILY
      ? intl.formatMessage({ defaultMessage: 'Formatting options for font family', description: 'Label for Font family dropdown' })
      : intl.formatMessage({ defaultMessage: 'Formatting options for font size', description: 'Label for Font size dropdown' });

  return (
    <DropDown
      disabled={disabled}
      buttonClassName={'toolbar-item ' + fontDropdownType}
      buttonLabel={value}
      buttonAriaLabel={buttonAriaLabel}
      editor={editor}
    >
      {(fontDropdownType === FontDropDownType.FONTFAMILY ? FONT_FAMILY_OPTIONS : FONT_SIZE_OPTIONS).map(([option, text]) => (
        <DropDownItem
          className={`item ${dropDownActiveClass(value === option)} ${
            fontDropdownType === FontDropDownType.FONTSIZE ? 'fontsize-item' : 'fontfamily-item'
          }`}
          onClick={() => {
            handleClick(option);
          }}
          key={option}
        >
          <span className="text">{text}</span>
        </DropDownItem>
      ))}
    </DropDown>
  );
}
