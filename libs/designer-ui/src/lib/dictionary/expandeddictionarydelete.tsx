import type { DictionaryEditorItemProps } from '.';
import type { IIconProps } from '@fluentui/react';
import { css, IconButton, TooltipHost } from '@fluentui/react';
import { useIntl } from 'react-intl';

const deleteButtonIconProps: IIconProps = {
  iconName: 'Cancel',
};

interface DictionaryDeleteButtonProps {
  items: DictionaryEditorItemProps[];
  index: number;
  setItems: (items: DictionaryEditorItemProps[]) => void;
}

export const DictionaryDeleteButton = ({ items, index, setItems }: DictionaryDeleteButtonProps): JSX.Element => {
  const intl = useIntl();

  const deleteLabel = intl.formatMessage({
    defaultMessage: 'Click to delete item',
    description: 'Label to delete dictionary item',
  });

  const handleDeleteItem = () => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  return (
    <TooltipHost content={deleteLabel}>
      <IconButton
        aria-label={deleteLabel}
        className={css('msla-button', 'msla-dictionary-item-delete', index === items.length - 1 ? 'msla-hidden' : undefined)}
        iconProps={deleteButtonIconProps}
        onClick={handleDeleteItem}
      />
    </TooltipHost>
  );
};
