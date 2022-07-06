import type { ArrayEditorItemProps } from '.';
import { BaseEditor } from '../editor/base';
import { Label } from '../label';
import type { LabelProps } from '../label';
import type { IContextualMenuProps, IIconProps, IIconStyles } from '@fluentui/react';
import { IconButton, TooltipHost, DefaultButton } from '@fluentui/react';
import type { Dispatch, SetStateAction } from 'react';
import { useIntl } from 'react-intl';

export interface ExpandedArrayProps {
  labelProps: LabelProps;
  items: ArrayEditorItemProps[];
  canDeleteLastItem: boolean;
  readOnly: boolean;
  setItems: Dispatch<SetStateAction<ArrayEditorItemProps[]>>;
}

const addItemButtonIconProps: IIconProps = {
  iconName: 'Add',
};

const ContextMenuKeys = {
  DELETE: 'delete',
};

const menuButtonIconProps: IIconProps = {
  iconName: 'More',
};
const menuButtonStyles: IIconStyles = {
  root: {
    height: '20px',
  },
};

export const ExpandedArray = ({ labelProps, items, canDeleteLastItem, readOnly, setItems }: ExpandedArrayProps): JSX.Element => {
  const intl = useIntl();

  const addItemButtonLabel = intl.formatMessage({
    defaultMessage: 'Add new Item',
    description: 'Label to add item to array editor',
  });

  const renderLabel = (index: number): JSX.Element => {
    const { text, isRequiredField } = labelProps;
    return (
      <div className="msla-array-editor-label">
        <Label text={text + ' Item - ' + index} isRequiredField={isRequiredField} />
      </div>
    );
  };

  return (
    <div className="msla-array-container msla-array-item-container">
      {items.map((item, index) => {
        return (
          <div key={index} className="msla-array-item">
            <div className="msla-array-item-header">
              {renderLabel(index)}
              <div className="msla-array-item-commands">
                <ItemMenuButton
                  disabled={readOnly}
                  itemKey={index}
                  visible={canDeleteLastItem || items.length > 1}
                  onDeleteItem={(index) => setItems([...items.splice(index)])}
                />
              </div>
            </div>

            <BaseEditor className="msla-array-editor-container-expanded" initialValue={item.content ?? []} BasePlugins={{ tokens: true }} />
          </div>
        );
      })}
      <div className="msla-array-toolbar">
        <DefaultButton
          className="msla-array-add-item-button"
          iconProps={addItemButtonIconProps}
          text={addItemButtonLabel}
          onClick={() => setItems((items) => [...items, { content: null }])}
        />
      </div>
    </div>
  );
};

interface ItemMenuButtonProps {
  disabled: boolean;
  itemKey: number;
  visible: boolean;
  onDeleteItem(itemKey: number): void;
}

const ItemMenuButton = ({ disabled, itemKey, visible, onDeleteItem }: ItemMenuButtonProps): JSX.Element | null => {
  const intl = useIntl();
  if (!visible) {
    return null;
  }
  const deleteButton = intl.formatMessage({
    defaultMessage: 'Delete',
    description: 'Delete label',
  });

  const menuButton = intl.formatMessage({
    defaultMessage: 'Menu',
    description: 'Menu label',
  });

  const menuProps: IContextualMenuProps = {
    items: [
      {
        key: ContextMenuKeys.DELETE,
        name: deleteButton,
        icon: 'Delete',
      },
    ],
    onItemClick(_, menuItem) {
      if (menuItem && menuItem.key === ContextMenuKeys.DELETE) {
        onDeleteItem(itemKey);
      }
    },
  };

  return (
    <TooltipHost content={menuButton}>
      <IconButton
        ariaLabel={menuButton}
        className="msla-array-item-contextbutton"
        disabled={disabled}
        iconProps={menuButtonIconProps}
        styles={menuButtonStyles}
        menuProps={menuProps}
      />
    </TooltipHost>
  );
};
