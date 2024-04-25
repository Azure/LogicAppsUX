import type { IContextualMenuProps } from '@fluentui/react';
import { DirectionalHint, IconButton, TextField, TooltipHost } from '@fluentui/react';
import type React from 'react';
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

export interface DynamicallyAddedParameterProps {
  schemaKey: string;
  icon: string;
  title: string;
  titlePlaceholder?: string;
  onTitleChange: (schemaKey: string, newValue: string | undefined) => void;
  onDelete: (schemaKey: string) => void;
  onRenderValueField: (schemaKey: string) => JSX.Element;
}

export const DynamicallyAddedParameter = (props: DynamicallyAddedParameterProps): JSX.Element => {
  const intl = useIntl();

  const renderMenuButton = (): JSX.Element => {
    const menuButtonTitle = intl.formatMessage({
      defaultMessage: 'Menu',
      id: 'wXJALc',
      description: 'Open dynamically added parameter options menu',
    });

    const deleteText = intl.formatMessage({
      defaultMessage: 'Delete',
      id: 'gkY5ya',
      description: 'Delete dynamic parameter corresponding to this row',
    });

    const menuProps: IContextualMenuProps = {
      shouldFocusOnMount: true,
      items: [
        {
          iconProps: { iconName: 'Delete' },
          key: 'dynamicallyaddedparameter_menu_delete',
          text: deleteText,
          onClick: (ev?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
            ev?.preventDefault();
            props.onDelete(props.schemaKey);
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

  const renderDynamicParameterContainer = (): JSX.Element => {
    const iconStyle = {
      background: `url('${props.icon}') no-repeat center`,
      backgroundSize: 'contain',
    };

    const onTitleChange = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
      e.preventDefault();
      props.onTitleChange(props.schemaKey, newValue);
    };

    return (
      <div className="msla-dynamic-added-param-header">
        <div className="msla-dynamic-added-param-icon" style={iconStyle} />
        <div className="msla-dynamic-added-param-inputs-container">
          <TextField
            className="msla-dynamic-added-param-title"
            placeholder={props.titlePlaceholder}
            value={props.title}
            onChange={onTitleChange}
          />
          <div className="msla-dynamic-added-param-value">{props.onRenderValueField(props.schemaKey)}</div>
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
