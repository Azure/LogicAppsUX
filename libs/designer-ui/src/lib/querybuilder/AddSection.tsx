import type { IContextualMenuProps, IIconProps } from '@fluentui/react';
import { DefaultButton } from '@fluentui/react';
import { useIntl } from 'react-intl';

const addIcon: IIconProps = { iconName: 'Add' };

export const AddSection = () => {
  const intl = useIntl();
  const addRowText = intl.formatMessage({
    defaultMessage: 'Add Row',
    description: 'Button to add row',
  });

  const addGroupText = intl.formatMessage({
    defaultMessage: 'Add Group',
    description: 'Button to add group',
  });

  const menuProps: IContextualMenuProps = {
    items: [
      {
        key: 'addRow',
        text: addRowText,
        iconProps: { iconName: 'CirclePlus' },
        onClick: () => console.log('yo'),
      },
      {
        key: 'addGroup',
        text: addGroupText,
        iconProps: { iconName: 'List' },
        onClick: () => console.log('yo'),
      },
    ],
    directionalHintFixed: true,
  };
  return (
    <div className="msla-querybuilder-row-add-container">
      <div className="msla-querybuilder-row-gutter-hook" />
      <DefaultButton text="New item" iconProps={addIcon} menuProps={menuProps} allowDisabledFocus />
    </div>
  );
};
