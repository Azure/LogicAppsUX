import chevronDownDark from '../icons/dark/chevron-down.svg';
import numberListSvgDark from '../icons/dark/list-ol.svg';
import bulletListSvgDark from '../icons/dark/list-ul.svg';
import h1SvgDark from '../icons/dark/text-h1.svg';
import h2SvgDark from '../icons/dark/text-h2.svg';
import h3SvgDark from '../icons/dark/text-h3.svg';
import paragraphSvgDark from '../icons/dark/text-paragraph.svg';
import chevronDownLight from '../icons/light/chevron-down.svg';
import numberListSvgLight from '../icons/light/list-ol.svg';
import bulletListSvgLight from '../icons/light/list-ul.svg';
import h1SvgLight from '../icons/light/text-h1.svg';
import h2SvgLight from '../icons/light/text-h2.svg';
import h3SvgLight from '../icons/light/text-h3.svg';
import paragraphSvgLight from '../icons/light/text-paragraph.svg';
import { dropDownActiveClass } from './helper/util';
import { blockTypeToBlockName } from './RichTextToolbar';
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
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from '@lexical/list';
import type { HeadingTagType } from '@lexical/rich-text';
import { $createHeadingNode } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import { $isTableSelection } from '@lexical/table';
import type { LexicalEditor } from 'lexical';
import { $createParagraphNode, $getSelection, $isRangeSelection } from 'lexical';
import { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';

interface BlockFormatDropDownProps {
  blockType: keyof typeof blockTypeToBlockName;
  editor: LexicalEditor;
  disabled?: boolean;
}

export const BlockFormatDropDown = ({ editor, blockType, disabled = false }: BlockFormatDropDownProps): JSX.Element => {
  const intl = useIntl();
  const { isInverted } = useTheme();

  const [isOpen, setIsOpen] = useState(false);

  const arrowNavigationAttributes = useArrowNavigationGroup({ axis: 'vertical', circular: true });

  const handleClick = useCallback(() => {
    setIsOpen(false);
  }, []);

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) || $isTableSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
      handleClick();
    });
  };

  const formatHeading = (headingSize: HeadingTagType) => {
    if (blockType !== headingSize) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) || $isTableSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode(headingSize));
        }
        handleClick();
      });
    } else {
      handleClick();
    }
  };

  const formatBulletList = () => {
    if (blockType !== 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
    handleClick();
  };

  const formatNumberedList = () => {
    if (blockType !== 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
    handleClick();
  };

  const TextNames = {
    paragraphText: intl.formatMessage({ defaultMessage: 'Normal', id: '9612ff28b11a', description: 'Normal text' }),
    h1Text: intl.formatMessage({ defaultMessage: 'Heading 1', id: '4ed73448c2db', description: 'Heading 1 text' }),
    h2Text: intl.formatMessage({ defaultMessage: 'Heading 2', id: '4869d3a6dcd0', description: 'Heading 2 text' }),
    h3Text: intl.formatMessage({ defaultMessage: 'Heading 3', id: '3feec6eb6016', description: 'Heading 3 text' }),
    bulletListText: intl.formatMessage({ defaultMessage: 'Bullet list', id: 'c06f1fc33491', description: 'Bullet List text' }),
    numberListText: intl.formatMessage({ defaultMessage: 'Numbered list', id: '6e0d34798e92', description: 'Numbered List text' }),
  };

  const altTextForChevronDown = intl.formatMessage({
    defaultMessage: 'Alt text for down chevron',
    id: 'f94be8fe96cd',
    description: 'Alt text for down chevron',
  });

  return (
    <Popover onOpenChange={(_, data) => setIsOpen(data.open)} open={isOpen} positioning="below" trapFocus={true}>
      <PopoverTrigger disableButtonEnhancement={true}>
        <ToolbarButton
          className="toolbar-item toolbar-item-with-chevron block-controls"
          disabled={disabled}
          icon={<img className="chevron-down" src={isInverted ? chevronDownDark : chevronDownLight} alt={altTextForChevronDown} />}
        >
          <span className="toolbar-item-label">{blockTypeToBlockName[blockType]}</span>
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverSurface>
        <MenuList {...arrowNavigationAttributes}>
          <MenuItem
            className={`item blockcontrol-item ${dropDownActiveClass(blockType === 'paragraph')}`}
            icon={<img className="icon paragraph" src={isInverted ? paragraphSvgDark : paragraphSvgLight} alt="paragraph icon" />}
            onClick={formatParagraph}
          >
            <span className="text">{TextNames.paragraphText}</span>
          </MenuItem>
          <MenuItem
            className={`item blockcontrol-item ${dropDownActiveClass(blockType === 'h1')}`}
            icon={<img className="icon heading1" src={isInverted ? h1SvgDark : h1SvgLight} alt="h1 icon" />}
            onClick={() => formatHeading('h1')}
          >
            <span className="text">{TextNames.h1Text}</span>
          </MenuItem>
          <MenuItem
            className={`item blockcontrol-item ${dropDownActiveClass(blockType === 'h2')}`}
            icon={<img className="icon heading2" src={isInverted ? h2SvgDark : h2SvgLight} alt="h2 icon" />}
            onClick={() => formatHeading('h2')}
          >
            <span className="text">{TextNames.h2Text}</span>
          </MenuItem>
          <MenuItem
            className={`item blockcontrol-item ${dropDownActiveClass(blockType === 'h3')}`}
            icon={<img className="icon heading3" src={isInverted ? h3SvgDark : h3SvgLight} alt="h3 icon" />}
            onClick={() => formatHeading('h3')}
          >
            <span className="text">{TextNames.h3Text}</span>
          </MenuItem>
          <MenuItem
            className={`item blockcontrol-item ${dropDownActiveClass(blockType === 'bullet')}`}
            icon={<img className="icon bulletList" src={isInverted ? bulletListSvgDark : bulletListSvgLight} alt="bulletList icon" />}
            onClick={formatBulletList}
          >
            <span className="text">{TextNames.bulletListText}</span>
          </MenuItem>
          <MenuItem
            className={`item blockcontrol-item ${dropDownActiveClass(blockType === 'number')}`}
            icon={<img className="icon numberList" src={isInverted ? numberListSvgDark : numberListSvgLight} alt="numberList icon" />}
            onClick={formatNumberedList}
          >
            <span className="text">{TextNames.numberListText}</span>
          </MenuItem>
        </MenuList>
      </PopoverSurface>
    </Popover>
  );
};
