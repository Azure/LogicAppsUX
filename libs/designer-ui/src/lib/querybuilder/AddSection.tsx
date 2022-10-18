import type { GroupItemProps, RowItemProps } from '.';
import type { IContextualMenuProps, IIconProps } from '@fluentui/react';
import { DefaultButton } from '@fluentui/react';
import { useIntl } from 'react-intl';

const addIcon: IIconProps = { iconName: 'Add' };

interface AddSectionProps {
  handleUpdateParent: (newProps: GroupItemProps | RowItemProps, index: number) => void;
  index: number;
  addEmptyRow: boolean;
}

export const AddSection = ({ handleUpdateParent, index, addEmptyRow }: AddSectionProps) => {
  const intl = useIntl();
  const addRowText = intl.formatMessage({
    defaultMessage: 'Add Row',
    description: 'Button to add row',
  });

  const addGroupText = intl.formatMessage({
    defaultMessage: 'Add Group',
    description: 'Button to add group',
  });

  const handleAddRow = () => {
    if (addEmptyRow) {
      handleUpdateParent({ type: 'row' }, index);
    }
    handleUpdateParent({ type: 'row' }, index + (addEmptyRow ? 1 : 0));
  };

  const handleAddGroup = () => {
    if (addEmptyRow) {
      handleUpdateParent({ type: 'row' }, index);
    }
    handleUpdateParent({ type: 'group', items: [] }, index + (addEmptyRow ? 1 : 0));
  };

  const menuProps: IContextualMenuProps = {
    items: [
      {
        key: 'addRow',
        text: addRowText,
        iconProps: { iconName: 'CirclePlus' },
        onClick: () => handleAddRow(),
      },
      {
        key: 'addGroup',
        text: addGroupText,
        iconProps: { iconName: 'List' },
        onClick: () => handleAddGroup(),
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
