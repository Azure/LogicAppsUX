import chevronDownDark from '../../icons/dark/chevron-down.svg';
import chevronDownLight from '../../icons/light/chevron-down.svg';
import { FONT_FAMILY_OPTIONS, FONT_SIZE_OPTIONS } from './constants';
import { dropDownActiveClass } from './util';
import { useTheme } from '@fluentui/react';
import {
  MenuItem,
  MenuList,
  Popover,
  PopoverSurface,
  PopoverTrigger,
  ToolbarButton,
  useArrowNavigationGroup,
} from '@fluentui/react-components';
import { $patchStyleText } from '@lexical/selection';
import type { LexicalEditor } from 'lexical';
import { $getSelection, $isRangeSelection } from 'lexical';
import { useCallback, useState } from 'react';
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
  const { isInverted } = useTheme();

  const [isOpen, setIsOpen] = useState(false);

  const arrowNavigationAttributes = useArrowNavigationGroup({ axis: 'vertical', circular: true });

  const handleClick = useCallback(
    (option: string) => {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, {
            [fontDropdownType]: option,
          });
        }
        setIsOpen(false);
      });
    },
    [editor, fontDropdownType]
  );

  const buttonAriaLabel =
    fontDropdownType === FontDropDownType.FONTFAMILY
      ? intl.formatMessage({
          defaultMessage: 'Formatting options for font family',
          id: 'b1840337e49f',
          description: 'Label for Font family dropdown',
        })
      : intl.formatMessage({
          defaultMessage: 'Formatting options for font size',
          id: '2764aeeb138f',
          description: 'Label for Font size dropdown',
        });

  const altTextForChevronDown = intl.formatMessage({
    defaultMessage: 'Alt text for down chevron',
    id: 'f94be8fe96cd',
    description: 'Alt text for down chevron',
  });

  return (
    <Popover onOpenChange={(_, data) => setIsOpen(data.open)} open={isOpen} positioning="below" trapFocus={true}>
      <PopoverTrigger disableButtonEnhancement={true}>
        <ToolbarButton
          aria-label={buttonAriaLabel}
          className={`toolbar-item toolbar-item-with-chevron ${fontDropdownType}`}
          disabled={disabled}
          icon={<img className="chevron-down" src={isInverted ? chevronDownDark : chevronDownLight} alt={altTextForChevronDown} />}
        >
          <span className="toolbar-item-label">{value || '(…)'}</span>
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverSurface>
        <MenuList {...arrowNavigationAttributes}>
          {(fontDropdownType === FontDropDownType.FONTFAMILY ? FONT_FAMILY_OPTIONS : FONT_SIZE_OPTIONS).map(([option, text]) => (
            <MenuItem
              className={`item ${dropDownActiveClass(value === option)} ${
                fontDropdownType === FontDropDownType.FONTSIZE ? 'fontsize-item' : 'fontfamily-item'
              }`}
              onClick={() => {
                handleClick(option);
              }}
              key={option}
            >
              <span className="text">{text}</span>
            </MenuItem>
          ))}
        </MenuList>
      </PopoverSurface>
    </Popover>
  );
}
