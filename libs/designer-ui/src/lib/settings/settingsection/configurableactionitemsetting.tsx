import { Checkbox, FontSizes, IconButton } from '@fluentui/react';
import type { IButtonStyles, IIconProps } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { isNullOrUndefined } from '@microsoft-logic-apps/utils';
import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

export interface ConfigurableMultiSelectItemSectionProps {
  configurableActionItems: ConfigurableAction[];
  configuredActionItems: ConfigurableAction[];
  isReadOnly: boolean;
}

export interface ConfigurableAction {
  id: string;
  title: string;
  icon?: string;
  statuses: Record<string, boolean>;
}

type StatusChangeHandler = (statusKey: string, checked?: boolean) => void;

export const ConfigurableMultiSelectItemSection: React.FC<ConfigurableMultiSelectItemSectionProps> = (props): JSX.Element => {
  const canDelete = (item: ConfigurableAction, actions: ConfigurableAction[]): boolean => actions.length > 1;
  const { configurableActionItems, configuredActionItems, isReadOnly } = props;
  const defaultStatuses: Record<string, boolean> = {
    'Option 1': true,
    'Option 2': false,
    'Option 3': false,
    'Option 4': false,
  };
  const [items, setItems] = useState(configuredActionItems);

  const onStatusChange = (itemId: string, statusKey: string, checked?: boolean): void => {
    if (isNullOrUndefined(checked)) {
      return;
    }
    const itemIndex = items.indexOf(items.filter((item) => item.id === itemId)[0]);
    const itemsCopy = [...items];
    const currentItem = items[itemIndex];
    const modifiedItem: ConfigurableAction = { ...currentItem, statuses: { ...currentItem.statuses, [statusKey]: checked } };
    itemsCopy.splice(itemIndex, 1, modifiedItem);
    setItems(itemsCopy);
  };
  // const handleActionAddition = (id: string): void => {
  //   // construct action object via id -> add new action to state items object
  //   let newAction: ConfigurableAction = {
  //     id,
  //     title: 'Random Action',
  //     icon: '',
  //     statuses: defaultStatuses,
  //   };
  //   setItems([...items, newAction]);
  // };
  const handleActionDelete = (id: string): void => {
    const indexOfItemToDelete = items.indexOf(items.filter((item) => item.id === id)[0]);
    const itemsCopy = [...items];
    itemsCopy.splice(indexOfItemToDelete, 1);
    setItems(itemsCopy);
  };
  return (
    <>
      {items.map((configuredAction) => {
        return (
          <ActionItemConfiguration
            key={configuredAction.id}
            onDelete={handleActionDelete}
            action={configuredAction}
            canDelete={canDelete(configuredAction, items)}
            onStatusChange={(statusKey: string, checked?: boolean) => onStatusChange(configuredAction.id, statusKey, checked)}
            isReadOnly={isReadOnly}
          />
        );
      })}
      <div className="'msla-run-after-action-add">
        {/* <AddActionItem>
            configurableItems={configurableActionItems}
            preconfiguredItems={configuredActionItems}
            onActionAdd={handleActionAddition}
        </AddActionItem> */}
      </div>
    </>
  );
};

interface ActionHeaderProps {
  id: string;
  icon?: string;
  title: string;
  customRender?(): JSX.Element | null;
}

interface ActionItemConfigurationProps {
  action: ConfigurableAction;
  canDelete: boolean;
  onDelete: DeleteActionHandler;
  onStatusChange: StatusChangeHandler;
  isReadOnly: boolean;
}

const ActionItemConfiguration: React.FC<ActionItemConfigurationProps> = (props): JSX.Element => {
  const {
    action: { statuses, id, icon, title },
    canDelete,
    onDelete,
    onStatusChange,
    isReadOnly,
  } = props;
  const [expanded, toggleExpand] = useBoolean(!canDelete);
  const toggleActionExpand = (_: React.MouseEvent<HTMLElement>): void => {
    toggleExpand.toggle();
  };
  const ActionHeader: React.FC<ActionHeaderProps> = (props): JSX.Element => {
    const { customRender } = props;
    const iconProps: IIconProps = { iconName: expanded ? 'ChevronDownMed' : 'ChevronRightMed' };
    const chevronStyles: IButtonStyles = {
      icon: {
        color: '#8a8886',
        fontSize: FontSizes.small,
      },
    };
    const intl = useIntl();
    const expandOrCollapse = intl.formatMessage({
      defaultMessage: 'Expand or Collapse',
      description: 'description to toggle expansion of section',
    });
    return (
      <div className="msla-run-after-edge-header">
        <div className="msla-run-after-edge-header-contents-container" onClick={toggleActionExpand}>
          <div>
            <div className="msla-run-after-edge-header-contents">
              <IconButton ariaLabel={expandOrCollapse} className="msla-run-after-icon" iconProps={iconProps} styles={chevronStyles} />
              <div className="msla-run-after-edge-header-logo">
                <img
                  alt=""
                  className="msla-run-after-logo-image"
                  role="presentation"
                  src={icon ?? 'https://reactnativecode.com/wp-content/uploads/2018/02/Default_Image_Thumbnail.png'}
                />
              </div>
              <div className="msla-run-after-edge-header-text">{title}</div>
            </div>
            {customRender}
            <DeleteButton id={id} visible={canDelete && !isReadOnly} onDelete={onDelete} />
          </div>
        </div>
      </div>
    );
  };
  const actionHeaderProps: ActionHeaderProps = {
    id,
    title,
    icon,
  };

  return (
    <>
      <ActionHeader {...actionHeaderProps} />
      {expanded ? <ActionStatuses id={id} statuses={statuses} onStatusChange={onStatusChange} /> : null}
    </>
  );
};

type DeleteActionHandler = (id: string) => void;

interface DeleteButtonProps {
  id: string;
  visible: boolean;
  onDelete: DeleteActionHandler;
}

const DeleteButton: React.FC<DeleteButtonProps> = (props): JSX.Element | null => {
  const { onDelete, id, visible } = props;
  const intl = useIntl();
  const deleteAriaLabel = intl.formatMessage({
    defaultMessage: 'Delete',
    description: 'aria label for Delete icon',
  });
  const deleteIconProp: IIconProps = {
    iconName: 'Delete',
  };
  const deleteIconStyles: IButtonStyles = {
    icon: {
      color: '#0078d4',
      fontSize: 16,
    },
  };
  const handleDelete = (e: React.MouseEvent<HTMLElement>): void => {
    onDelete(id);
  };

  if (!visible) {
    return null;
  }

  return (
    <div className="msla-run-after-delete-icon">
      <IconButton ariaLabel={deleteAriaLabel} iconProps={deleteIconProp} styles={deleteIconStyles} onClick={handleDelete} />
    </div>
  );
};

export interface ActionStatusesProps {
  id: string;
  statuses: Record<string, boolean>;
  onStatusChange: StatusChangeHandler;
  onRenderLabel?(status: string, label: string): JSX.Element | null;
}

const ActionStatuses: React.FC<ActionStatusesProps> = (props): JSX.Element => {
  const { statuses, onStatusChange, onRenderLabel } = props;
  const intl = useIntl();
  const option1Label = intl.formatMessage({
    defaultMessage: 'Option 1',
    description: 'label for first status checkbox',
  });
  const option2Label = intl.formatMessage({
    defaultMessage: 'Option 2',
    description: 'label for second status checkbox',
  });
  const option3Label = intl.formatMessage({
    defaultMessage: 'Option 3',
    description: 'label for third status checkbox',
  });
  const option4Label = intl.formatMessage({
    defaultMessage: 'Option 4',
    description: 'label for fourth status checkbox',
  });
  return (
    <div className="msla-run-after-statuses">
      <div className="msla-run-after-status-checkbox">
        <Checkbox
          checked={statuses[option1Label]}
          label={option1Label}
          onChange={(_, checked) => onStatusChange?.(option1Label, checked)}
        />
      </div>
      <div className="msla-run-after-status-checkbox">
        <Checkbox
          checked={statuses[option2Label]}
          label={option2Label}
          onChange={(_, checked) => onStatusChange?.(option2Label, checked)}
        />
      </div>
      <div className="msla-run-after-status-checkbox">
        <Checkbox
          checked={statuses[option3Label]}
          label={option3Label}
          onChange={(_, checked) => onStatusChange?.(option3Label, checked)}
        />
      </div>
      <div className="msla-run-after-status-checkbox">
        <Checkbox
          checked={statuses[option4Label]}
          label={option4Label}
          onChange={(_, checked) => onStatusChange?.(option4Label, checked)}
        />
      </div>
    </div>
  );
};
