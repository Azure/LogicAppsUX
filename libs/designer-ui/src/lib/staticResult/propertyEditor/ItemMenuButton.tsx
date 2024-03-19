import type { IButtonStyles, IContextualMenuProps } from '@fluentui/react';
import { DefaultButton, TooltipHost } from '@fluentui/react';
import { useIntl } from 'react-intl';

interface ItemMenuButtonProps {
  disabled: boolean;
  hideRename: boolean;
  onDeleteClicked: () => void;
  onRenameClicked: () => void;
}

const menuButtonStyles: IButtonStyles = {
  root: {
    height: '30px',
    padding: 0,
    border: 'none',
    minWidth: '40px',
    width: '40px',
  },
};

const ContextMenuKeys = {
  DELETE: 'delete',
  RENAME: 'rename',
};

export const ItemMenuButton = ({ disabled, hideRename, onDeleteClicked, onRenameClicked }: ItemMenuButtonProps): JSX.Element => {
  const intl = useIntl();

  const deleteButton = intl.formatMessage({
    defaultMessage: 'Delete',
    id: 'JErLDT',
    description: 'Delete label',
  });

  const renameButton = intl.formatMessage({
    defaultMessage: 'Rename',
    id: '8eTWaf',
    description: 'Rename label',
  });

  const menuLabel = intl.formatMessage({
    defaultMessage: 'Menu',
    id: 'z3VuE+',
    description: 'Menu label',
  });

  const menuProps: IContextualMenuProps = {
    items: [
      {
        key: ContextMenuKeys.DELETE,
        name: deleteButton,
        iconProps: { iconName: 'Delete' },
      },
      {
        key: ContextMenuKeys.RENAME,
        name: renameButton,
        iconProps: { iconName: 'Rename' },
      },
    ],
    onItemClick(_, menuItem) {
      if (menuItem?.key === ContextMenuKeys.DELETE) {
        onDeleteClicked();
      } else if (menuItem?.key === ContextMenuKeys.RENAME) {
        onRenameClicked();
      }
    },
  };

  const noRenameMenuProps: IContextualMenuProps = {
    items: [
      {
        key: ContextMenuKeys.DELETE,
        name: deleteButton,
        iconProps: { iconName: 'Delete' },
      },
    ],
    onItemClick(_, menuItem) {
      if (menuItem?.key === ContextMenuKeys.DELETE) {
        onDeleteClicked();
      }
    },
  };

  return (
    <TooltipHost content={menuLabel}>
      <DefaultButton
        ariaLabel={menuLabel}
        disabled={disabled}
        styles={menuButtonStyles}
        menuProps={hideRename ? noRenameMenuProps : menuProps}
      />
    </TooltipHost>
  );
};
