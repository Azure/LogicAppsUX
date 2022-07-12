import KeyValueMode from '../card/images/key_value_mode.svg';
import KeyValueModeInverted from '../card/images/key_value_mode_inverted.svg';
import TextMode from '../card/images/text_mode.svg';
import TextModeInverted from '../card/images/text_mode_inverted.svg';
import type { BaseEditorProps, Segment } from '../editor/base';
import type { LabelProps } from '../label';
import { isHighContrastBlack } from '../utils';
import { CollapsedArray } from './collapsedarray';
import { ExpandedArray } from './expandedarray';
import type { ICalloutProps } from '@fluentui/react';
import { IconButton, TooltipHost, DirectionalHint } from '@fluentui/react';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

export interface IArrayEditorStyles {
  root?: React.CSSProperties;
  itemContainer?: React.CSSProperties;
  item?: React.CSSProperties;
  commandContainer?: React.CSSProperties;
}

export interface ArrayEditorItemProps {
  key?: string;
  content: Segment[];
}

export interface ArrayEditorProps extends BaseEditorProps {
  disabledToggle?: boolean;
  initialItems?: ArrayEditorItemProps[];
  canDeleteLastItem?: boolean;
  styles?: IArrayEditorStyles;
  readOnly?: boolean;
  labelProps: LabelProps;
}

const calloutProps: ICalloutProps = {
  directionalHint: DirectionalHint.topCenter,
};

export const ArrayEditor: React.FC<ArrayEditorProps> = ({
  readOnly = false,
  disabledToggle = false,
  canDeleteLastItem = true,
  initialItems = [],
  labelProps,
}): JSX.Element => {
  const intl = useIntl();
  const [collapsed, setCollapsed] = useState(false);
  const [items, setItems] = useState(initialItems);
  const [isValid, setIsValid] = useState(true);

  useEffect(() => {
    console.log(items);
  }, [items]);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>): void => {
    e.stopPropagation();
    setCollapsed(!collapsed);
  };

  const renderToggleButton = (enabled: boolean): JSX.Element | null => {
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

    return !disabledToggle ? (
      <TooltipHost calloutProps={calloutProps} content={toggleText}>
        <IconButton
          aria-label={toggleText}
          className="msla-button msla-array-toggle-button"
          disabled={!enabled}
          iconProps={{ imageProps: { src: toggleIcon } }}
          onClick={handleToggle}
        />
      </TooltipHost>
    ) : null;
  };

  return (
    <div className="msla-array-editor-container">
      {collapsed ? (
        <CollapsedArray labelProps={labelProps} items={items} isValid={isValid} setItems={setItems} setIsValid={setIsValid} />
      ) : (
        <ExpandedArray
          items={items}
          setItems={setItems}
          labelProps={labelProps}
          readOnly={readOnly}
          canDeleteLastItem={canDeleteLastItem}
        />
      )}
      <div className="msla-array-commands">{renderToggleButton(isValid && !readOnly)}</div>
    </div>
  );
};
