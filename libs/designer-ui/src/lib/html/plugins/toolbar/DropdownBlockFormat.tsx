import numberListSvg from '../icons/list-ol.svg';
import bulletListSvg from '../icons/list-ul.svg';
import h1Svg from '../icons/text-h1.svg';
import h2Svg from '../icons/text-h2.svg';
import h3Svg from '../icons/text-h3.svg';
import paragraphSvg from '../icons/text-paragraph.svg';
import { blockTypeToBlockName } from './Toolbar';
import { DropDown } from './helper/Dropdown';
import { DropDownItem } from './helper/DropdownItem';
import { dropDownActiveClass } from './helper/util';
import { INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, REMOVE_LIST_COMMAND } from '@lexical/list';
import { $createHeadingNode } from '@lexical/rich-text';
import type { HeadingTagType } from '@lexical/rich-text';
import { $setBlocksType } from '@lexical/selection';
import type { LexicalEditor } from 'lexical';
import { $createParagraphNode, $isRangeSelection, DEPRECATED_$isGridSelection, $getSelection } from 'lexical';
import { useIntl } from 'react-intl';

interface BlockFormatDropDownProps {
  blockType: keyof typeof blockTypeToBlockName;
  editor: LexicalEditor;
  disabled?: boolean;
}

export const BlockFormatDropDown = ({ editor, blockType, disabled = false }: BlockFormatDropDownProps): JSX.Element => {
  const intl = useIntl();

  const formatParagraph = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection) || DEPRECATED_$isGridSelection(selection)) {
        $setBlocksType(selection, () => $createParagraphNode());
      }
    });
  };

  const formatHeading = (headingSize: HeadingTagType) => {
    if (blockType !== headingSize) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) || DEPRECATED_$isGridSelection(selection)) {
          $setBlocksType(selection, () => $createHeadingNode(headingSize));
        }
      });
    }
  };

  const formatBulletList = () => {
    if (blockType !== 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  };

  const formatNumberedList = () => {
    if (blockType !== 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  };

  const TextNames = {
    paragraphText: intl.formatMessage({ defaultMessage: 'Normal', description: 'Normal text' }),
    h1Text: intl.formatMessage({ defaultMessage: 'Heading 1', description: 'Heading 1 text' }),
    h2Text: intl.formatMessage({ defaultMessage: 'Heading 2', description: 'Heading 2 text' }),
    h3Text: intl.formatMessage({ defaultMessage: 'Heading 3', description: 'Heading 3 text' }),
    bulletListText: intl.formatMessage({ defaultMessage: 'Bullet List', description: 'Bullet List text' }),
    numberListText: intl.formatMessage({ defaultMessage: 'Numbered List', description: 'Numbered List text' }),
  };

  return (
    <DropDown
      disabled={disabled}
      buttonClassName="toolbar-item block-controls"
      buttonLabel={blockTypeToBlockName[blockType]}
      buttonAriaLabel="Formatting options for text style"
      editor={editor}
    >
      <DropDownItem className={'item blockcontrol-item ' + dropDownActiveClass(blockType === 'paragraph')} onClick={formatParagraph}>
        <img className="icon paragraph" src={paragraphSvg} alt="paragraph icon" />
        <span className="text">{TextNames.paragraphText}</span>
      </DropDownItem>
      <DropDownItem className={'item blockcontrol-item ' + dropDownActiveClass(blockType === 'h1')} onClick={() => formatHeading('h1')}>
        <img className="icon heading1" src={h1Svg} alt="h1 icon" />
        <span className="text">{TextNames.h1Text}</span>
      </DropDownItem>
      <DropDownItem className={'item blockcontrol-item ' + dropDownActiveClass(blockType === 'h2')} onClick={() => formatHeading('h2')}>
        <img className="icon heading2" src={h2Svg} alt="h2 icon" />
        <span className="text">{TextNames.h2Text}</span>
      </DropDownItem>
      <DropDownItem className={'item blockcontrol-item ' + dropDownActiveClass(blockType === 'h3')} onClick={() => formatHeading('h3')}>
        <img className="icon heading3" src={h3Svg} alt="h3 icon" />
        <span className="text">{TextNames.h3Text}</span>
      </DropDownItem>
      <DropDownItem className={'item blockcontrol-item ' + dropDownActiveClass(blockType === 'bullet')} onClick={formatBulletList}>
        <img className="icon bulletList" src={bulletListSvg} alt="bulletList icon" />
        <span className="text">{TextNames.bulletListText}</span>
      </DropDownItem>
      <DropDownItem className={'item blockcontrol-item ' + dropDownActiveClass(blockType === 'number')} onClick={formatNumberedList}>
        <img className="icon numberList" src={numberListSvg} alt="numberList icon" />
        <span className="text">{TextNames.numberListText}</span>
      </DropDownItem>
    </DropDown>
  );
};
