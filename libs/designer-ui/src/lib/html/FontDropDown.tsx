import DropDown, { DropDownItem } from './Dropdown';
import { $patchStyleText } from '@lexical/selection';
import type { LexicalEditor } from 'lexical';
import { $isRangeSelection, $getSelection } from 'lexical';
import { useCallback } from 'react';

const FONT_FAMILY_OPTIONS: [string, string][] = [
  ['Arial', 'Arial'],
  ['Courier New', 'Courier New'],
  ['Georgia', 'Georgia'],
  ['Impact', 'Impact'],
  ['Tahoma', 'Tahoma'],
  ['Times New Roman', 'Times New Roman'],
  ['Trebuchet MS', 'Trebuchet MS'],
  ['Verdana', 'Verdana'],
];

const FONT_SIZE_OPTIONS: [string, string][] = [
  ['10px', '10px'],
  ['11px', '11px'],
  ['12px', '12px'],
  ['13px', '13px'],
  ['14px', '14px'],
  ['15px', '15px'],
  ['16px', '16px'],
  ['17px', '17px'],
  ['18px', '18px'],
  ['19px', '19px'],
  ['20px', '20px'],
];

export function FontDropDown({ editor, value, hasStyle }: { editor: LexicalEditor; value: string; hasStyle: string }): JSX.Element {
  const handleClick = useCallback(
    (option: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, {
            [hasStyle]: option,
          });
        }
      });
    },
    [editor, hasStyle]
  );

  const buttonAriaLabel = hasStyle === 'font-family' ? 'Formatting options for font family' : 'Formatting options for font size';

  return (
    <DropDown
      buttonClassName={'toolbar-item ' + hasStyle}
      buttonLabel={value}
      buttonIconClassName={hasStyle === 'font-family' ? 'icon block-type font-family' : ''}
      buttonAriaLabel={buttonAriaLabel}
    >
      {(hasStyle === 'font-family' ? FONT_FAMILY_OPTIONS : FONT_SIZE_OPTIONS).map(([option, text]) => (
        <DropDownItem
          className={`item ${dropDownActiveClass(value === option)} ${hasStyle === 'font-size' ? 'fontsize-item' : ''}`}
          onClick={() => handleClick(option)}
          key={option}
        >
          <span className="text">{text}</span>
        </DropDownItem>
      ))}
    </DropDown>
  );
}

function dropDownActiveClass(active: boolean) {
  if (active) return 'active dropdown-item-active';
  else return '';
}
