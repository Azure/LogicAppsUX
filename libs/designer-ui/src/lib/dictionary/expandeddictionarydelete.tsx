import type { DictionaryEditorItemProps } from '.';
import type { IIconProps } from '@fluentui/react';
import { css, IconButton, TooltipHost } from '@fluentui/react';
import { guid } from '@microsoft/utils-logic-apps';
import { useIntl } from 'react-intl';

const deleteButtonIconProps: IIconProps = {
  iconName: 'Cancel',
};

interface DictionaryDeleteButtonProps {
  disabled?: boolean;
  items: DictionaryEditorItemProps[];
  index: number;
  setItems: (items: DictionaryEditorItemProps[]) => void;
}

export const DictionaryDeleteButton = ({ disabled, items, index, setItems }: DictionaryDeleteButtonProps): JSX.Element => {
  const intl = useIntl();

  const deleteLabel = intl.formatMessage({
    defaultMessage: 'Click to delete item',
    description: 'Label to delete dictionary item',
  });

  const handleDeleteItem = () => {
    // remove the item at the index and reassign the ids to rerender remaining items
    const newItems = items.filter((_, i) => i !== index).map((item) => ({ ...item, id: guid() }));
    setItems(newItems);
  };

  return (
    <TooltipHost content={deleteLabel}>
      <IconButton
        disabled={disabled}
        aria-label={deleteLabel}
        className={css('msla-button', 'msla-dictionary-item-delete', index === items.length - 1 ? 'msla-hidden' : undefined)}
        iconProps={deleteButtonIconProps}
        onClick={handleDeleteItem}
      />
    </TooltipHost>
  );
};
