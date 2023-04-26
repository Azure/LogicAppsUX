import type { IContextualMenuItem, IContextualMenuProps } from '@fluentui/react';
import { DirectionalHint, IconButton, TextField, TooltipHost } from '@fluentui/react';
import React from 'react';
import { useIntl } from 'react-intl';

export const DynamicallyAddedParameterType = {
  Text: 'TEXT',
  File: 'FILE',
  Email: 'EMAIL',
  Boolean: 'BOOLEAN',
  Number: 'NUMBER',
  Date: 'DATE',
} as const;
export type DynamicallyAddedParameterTypeType = (typeof DynamicallyAddedParameterType)[keyof typeof DynamicallyAddedParameterType];

export interface IDynamicallyAddedParameterProperties {
  title: string;
  type: string;
  description: string;
  'x-ms-content-hint': string;
  'x-ms-dynamically-added'?: boolean;
  format?: string;
  properties?: {
    name?: {
      type: string;
    };
    contentBytes?: {
      type: string;
      format: string;
    };
  };
  items?: {
    enum: string[];
    type: string;
  };
}

export type TextFieldOnChangeHandler = (schemaKey: string, propertyName: string, newPropertyValue?: string) => void;
export type DeleteDynamicallyAddedParameterHandler = (schemaKey: string) => void;

export interface DynamicallyAddedParameterProps {
  icon: string;
  schemaKey: string;
  properties: IDynamicallyAddedParameterProperties;
  required: boolean;
  onChange?: TextFieldOnChangeHandler;
  onDelete?: DeleteDynamicallyAddedParameterHandler;
}

export const DynamicallyAddedParameter = (props: DynamicallyAddedParameterProps): JSX.Element => {
  const intl = useIntl();
  const menuButtonTitle = intl.formatMessage({
    defaultMessage: 'Menu',
    description: 'Open dynamically added parameter options menu',
  });

  const renderMenuButton = (): JSX.Element => {
    const deleteText = intl.formatMessage({
      defaultMessage: 'Delete',
      description: 'Delete dynamic parameter corresponding to this row',
    });

    const menuProps: IContextualMenuProps = {
      shouldFocusOnMount: true,
      items: [
        {
          iconProps: { iconName: 'Delete' },
          key: 'dynamicallyaddedparameter_menu_delete',
          text: deleteText,
          onClick: (ev?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>, _item?: IContextualMenuItem) => {
            ev?.preventDefault();
            const { onDelete } = props;
            if (onDelete) onDelete(props.schemaKey);
            return true;
          },
        },
      ],
      gapSpace: 2,
      directionalHint: DirectionalHint.leftBottomEdge,
    };

    return (
      <TooltipHost content={menuButtonTitle}>
        <IconButton
          className="msla-button msla-card-header-menu-button"
          iconProps={{ iconName: 'CollapseMenu' }}
          title={menuButtonTitle}
          aria-label={menuButtonTitle}
          menuProps={menuProps}
        />
      </TooltipHost>
    );
  };

  const onTitleChange = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newPropertyValue?: string) => {
    e.preventDefault();
    const { onChange } = props;
    if (onChange) onChange(props.schemaKey, /* propertyName */ 'title', newPropertyValue);
  };

  const onDescriptionChange = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newPropertyValue?: string) => {
    e.preventDefault();
    const { onChange } = props;
    if (onChange) onChange(props.schemaKey, /* propertyName */ 'description', newPropertyValue);
  };

  const renderDynamicParameterContainer = (): JSX.Element => {
    const iconStyle = {
      background: `url('${props.icon}') no-repeat center`,
      backgroundSize: 'contain',
    };

    return (
      <div className="msla-dynamic-added-param-header">
        <div className="msla-dynamic-added-param-icon" style={iconStyle}></div>
        <div className="msla-dynamic-added-param-inputs-container">
          <TextField className="msla-dynamic-added-param-title" value={props.properties.title} onChange={onTitleChange} />
          <TextField className="msla-dynamic-added-param-description" value={props.properties.description} onChange={onDescriptionChange} />
        </div>
        <div className="msla-dynamic-add-param-menu-container">{renderMenuButton()}</div>
      </div>
    );
  };

  return (
    <div className="msla-dynamic-added-param-container">
      {renderDynamicParameterContainer()}
      <div className="msla-dynamic-added-param-bottom-divider" />
    </div>
  );
};
