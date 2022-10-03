import { Checkbox } from '../checkbox';
import type { ValueSegment } from '../editor';
import type { ChangeState } from '../editor/base';
import type { ButtonOffSet } from '../editor/base/plugins/TokenPickerButton';
import { StringEditor } from '../editor/string';
import { RowDropdown } from './RowDropdown';
import type { ICalloutProps, IIconProps, IOverflowSetItemProps, IOverflowSetStyles } from '@fluentui/react';
import { IconButton, DirectionalHint, TooltipHost, OverflowSet } from '@fluentui/react';
import { useRef, useState } from 'react';
import { useIntl } from 'react-intl';

const overflowStyle: Partial<IOverflowSetStyles> = {
  root: {
    height: '100%',
    backgroundColor: 'transparent',
  },
};

const menuIconProps: IIconProps = {
  iconName: 'More',
};

enum EditorType {
  KEY = 'key',
  VALUE = 'value',
}

interface RowProps {
  checked?: boolean;
  rowMenuItems: IOverflowSetItemProps[];
  keyValue?: ValueSegment[];
  valueValue?: ValueSegment[];
  dropdownValue?: string;
  containerOffset: number;
  GetTokenPicker: (
    editorId: string,
    labelId: string,
    onClick?: (b: boolean) => void,
    tokenClicked?: (token: ValueSegment) => void
  ) => JSX.Element;
}

export const Row = ({
  checked = false,
  rowMenuItems,
  keyValue = [],
  valueValue = [],
  dropdownValue,
  containerOffset,
  GetTokenPicker,
}: RowProps) => {
  const intl = useIntl();
  const keyEditorRef = useRef<HTMLDivElement | null>(null);
  const valueEditorRef = useRef<HTMLDivElement | null>(null);
  const [key, setKey] = useState(keyValue);
  const [pickerOffset, setPickerOffset] = useState<ButtonOffSet>();

  const updateKey = (newState: ChangeState) => {
    if (newState.value) {
      setKey(newState.value);
    } else {
      setKey([]);
    }
  };

  const updateTokenPickerLocation = (type: EditorType) => {
    console.log(containerOffset);
    let itemHeight = window.scrollY;
    if (type === EditorType.KEY && keyEditorRef.current) {
      itemHeight += keyEditorRef.current.getBoundingClientRect().top ?? 0;
    } else if (type === EditorType.VALUE && valueEditorRef.current) {
      itemHeight += valueEditorRef.current.getBoundingClientRect().top ?? 0;
    }
    setPickerOffset({ heightOffset: containerOffset - itemHeight });
  };

  const onRenderOverflowButton = (): JSX.Element => {
    const calloutProps: ICalloutProps = {
      directionalHint: DirectionalHint.leftCenter,
    };

    const rowCommands = intl.formatMessage({
      defaultMessage: 'More commands',
      description: 'Label for commands in row',
    });
    return (
      <TooltipHost calloutProps={calloutProps} content={rowCommands}>
        <IconButton
          ariaLabel={rowCommands}
          styles={overflowStyle}
          menuIconProps={menuIconProps}
          menuProps={rowMenuItems && { items: rowMenuItems }}
        />
      </TooltipHost>
    );
  };

  const rowValueInputPlaceholder = intl.formatMessage({
    defaultMessage: 'Choose a value',
    description: 'placeholder text for row values',
  });
  return (
    <div className="msla-querybuilder-row-container">
      <div className="msla-querybuilder-row-gutter-hook" />
      <Checkbox className="msla-querybuilder-row-checkbox" initialChecked={checked} />
      <div className="msla-querybuilder-row-content">
        <div ref={keyEditorRef}>
          <StringEditor
            className={'msla-querybuilder-row-value-input'}
            initialValue={keyValue}
            placeholder={rowValueInputPlaceholder}
            singleLine={true}
            onFocus={() => updateTokenPickerLocation(EditorType.KEY)}
            onChange={updateKey}
            GetTokenPicker={GetTokenPicker}
            tokenPickerButtonProps={{ buttonOffset: pickerOffset }}
          />
        </div>
        <RowDropdown disabled={key.length === 0} selectedOption={dropdownValue} />
        <div ref={valueEditorRef}>
          <StringEditor
            className={'msla-querybuilder-row-value-input'}
            initialValue={valueValue}
            placeholder={rowValueInputPlaceholder}
            singleLine={true}
            GetTokenPicker={GetTokenPicker}
            onFocus={() => updateTokenPickerLocation(EditorType.VALUE)}
            tokenPickerButtonProps={{ buttonOffset: pickerOffset }}
          />
        </div>
      </div>
      <OverflowSet
        className="msla-querybuilder-row-more"
        styles={overflowStyle}
        items={[]}
        overflowItems={rowMenuItems}
        onRenderOverflowButton={onRenderOverflowButton}
        onRenderItem={function (_item: IOverflowSetItemProps) {
          throw new Error('No items in overflowset');
        }}
      />
    </div>
  );
};
