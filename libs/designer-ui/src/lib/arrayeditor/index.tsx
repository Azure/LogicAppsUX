import KeyValueMode from '../card/images/key_value_mode.svg';
import KeyValueModeInverted from '../card/images/key_value_mode_inverted.svg';
import TextMode from '../card/images/text_mode.svg';
import TextModeInverted from '../card/images/text_mode_inverted.svg';
import type { Segment } from '../editor/base';
import type { LabelProps } from '../label';
import { isHighContrastBlack } from '../utils';
import { CollapsedArray } from './collapsedarray';
import type { ICalloutProps } from '@fluentui/react';
import { IconButton, TooltipHost, DirectionalHint } from '@fluentui/react';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface IArrayEditorStyles {
  root?: React.CSSProperties;
  itemContainer?: React.CSSProperties;
  item?: React.CSSProperties;
  commandContainer?: React.CSSProperties;
}

export interface ArrayEditorItemProps {
  key: string;
  content: Segment[];
}

export interface ArrayEditorProps {
  // addItemToolbarComponent?: JSX.Element;
  // canDeleteLastItem?: boolean;
  //   collapsed: boolean;
  // disableAddNew?: boolean;
  disabledToggle?: boolean;
  initialItems?: ArrayEditorItemProps[];
  styles?: IArrayEditorStyles;
  readOnly?: boolean;
  labelProps: LabelProps;
  // toggleExpand?(key: string, collapsed: boolean): void;
  // onAddItemClick?(key: string): void;
  // onDeleteItemClick?(itemKey: string): void;
}

const calloutProps: ICalloutProps = {
  directionalHint: DirectionalHint.topCenter,
};

export const ArrayEditor: React.FC<ArrayEditorProps> = ({
  readOnly = false,
  disabledToggle,
  initialItems = [],
  labelProps,
}): JSX.Element => {
  const intl = useIntl();
  const [collapsed, setCollapsed] = useState(false);
  const [items, setItems] = useState(initialItems);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    setCollapsed(!collapsed);
  };

  const renderToggleButton = (enabled: boolean): JSX.Element => {
    const isInverted = isHighContrastBlack();
    const PARAMETER_EXPAND_ICON_DESC = intl.formatMessage({
      defaultMessage: 'Switch to detail inputs for array item',
      description: 'Label for switching input to array',
    });
    const PARAMETER_COLLAPSE_ICON_DESC = intl.formatMessage({
      defaultMessage: 'Switch to input entire array',
      description: 'Label for switching input to Text',
    });
    const toggleIcon = collapsed ? (isInverted ? KeyValueModeInverted : KeyValueMode) : isInverted ? TextModeInverted : TextMode;
    const toggleText = collapsed ? PARAMETER_EXPAND_ICON_DESC : PARAMETER_COLLAPSE_ICON_DESC;

    return (
      <TooltipHost calloutProps={calloutProps} content={toggleText}>
        <IconButton
          aria-label={toggleText}
          className="msla-button msla-array-toggle-button"
          disabled={!enabled}
          iconProps={{ imageProps: { src: toggleIcon } }}
          onClick={handleToggle}
        />
      </TooltipHost>
    );
  };

  return (
    <div className="msla-array-editor-container">
      {/* {collapsed ? renderCollapsedArray() : renderExpandedArray()} */}
      <CollapsedArray labelProps={labelProps} items={items} setItems={setItems} />
      <div className="msla-array-commands">{renderToggleButton(!readOnly && !disabledToggle)}</div>
    </div>
  );
};
