import { Checkbox } from '../checkbox';
import type { ValueSegment } from '../editor';
import type { ChangeState } from '../editor/base';
import { StringEditor } from '../editor/string';
import { RowDropdown } from './RowDropdown';
import type { ICalloutProps, IIconProps, IOverflowSetItemProps, IOverflowSetStyles } from '@fluentui/react';
import { IconButton, DirectionalHint, TooltipHost, OverflowSet } from '@fluentui/react';
import { useState } from 'react';
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

interface RowProps {
  checked?: boolean;
  rowMenuItems: IOverflowSetItemProps[];
  keyValue?: ValueSegment[];
  valueValue?: ValueSegment[];
  dropdownValue?: string;
  GetTokenPicker: (
    editorId: string,
    labelId: string,
    onClick?: (b: boolean) => void,
    tokenClicked?: (token: ValueSegment) => void
  ) => JSX.Element;
}

export const Row = ({ checked = false, rowMenuItems, keyValue = [], valueValue = [], dropdownValue, GetTokenPicker }: RowProps) => {
  const intl = useIntl();
  const [key, setKey] = useState<string>('');

  const updateKey = (newState: ChangeState) => {
    if (newState?.value[0]?.value) {
      setKey(newState.value[0].value);
    } else {
      setKey('');
    }
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
        <StringEditor
          className={'msla-querybuilder-row-value-input'}
          initialValue={keyValue}
          placeholder={rowValueInputPlaceholder}
          singleLine={true}
          // remove
          BasePlugins={{ tokens: false }}
          onChange={updateKey}
          GetTokenPicker={GetTokenPicker}
        />
        <RowDropdown disabled={key.length === 0} selectedOption={dropdownValue} />
        <StringEditor
          className={'msla-querybuilder-row-value-input'}
          initialValue={valueValue}
          placeholder={rowValueInputPlaceholder}
          // remove
          BasePlugins={{ tokens: false }}
          GetTokenPicker={GetTokenPicker}
        />
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
