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
  description?: string;
  titlePlaceholder?: string;
  descriptionPlaceholder?: string;
  renderDescriptionField?: boolean;
  required?: boolean;
  onTitleChange: (schemaKey: string, newValue: string | undefined) => void;
  onRequiredToggle?: (schemaKey: string) => void;
  onDescriptionChange?: (schemaKey: string, newValue: string | undefined) => void;
  onDelete: (schemaKey: string) => void;
  onRenderValueField: (schemaKey: string) => JSX.Element;
}

export const DynamicallyAddedParameter = (props: DynamicallyAddedParameterProps): JSX.Element => {
  const { icon, required, schemaKey, title, titlePlaceholder, onDelete, onRenderValueField, onRequiredToggle } = props;
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

    const optionalText = intl.formatMessage({
      defaultMessage: 'Make the field optional',
      id: 'rMYBfw',
      description: 'Make the dynamic parameter corresponding to this row optional',
    });

    const requiredText = intl.formatMessage({
      defaultMessage: 'Make the field required',
      id: 'HQQtFz',
      description: 'Make the dynamic parameter corresponding to this row required',
    });

    const baseParameterRequiredProps = {
      iconProps: { iconName: 'CheckboxComposite' },
      onClick: () => {
        if (onRequiredToggle) {
          onRequiredToggle(schemaKey);
        }
        return true;
      },
    };

    const parameterRequiredItem = onRequiredToggle
      ? {
          ...baseParameterRequiredProps,
          key: required ? 'dynamicallyaddedparameter_menu_optional' : 'dynamicallyaddedparameter_menu_required',
          text: required ? optionalText : requiredText,
        }
      : null;

    const menuProps: IContextualMenuProps | undefined = {
      shouldFocusOnMount: true,
      items: [
        ...(parameterRequiredItem ? [parameterRequiredItem] : []),
        {
          iconProps: { iconName: 'Delete' },
          key: 'dynamicallyaddedparameter_menu_delete',
          text: deleteText,
          onClick: (ev?: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => {
            ev?.preventDefault();
            onDelete(schemaKey);
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
      background: `url('${icon}') no-repeat center`,
      backgroundSize: 'contain',
    };

    const onTitleChange = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
      e.preventDefault();
      props.onTitleChange(schemaKey, newValue);
    };

    const onDescriptionChange = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
      e.preventDefault();
      props?.onDescriptionChange?.(schemaKey, newValue);
    };

    return (
      <>
        <div className="msla-dynamic-added-param-header">
          <div className="msla-dynamic-added-param-icon" style={iconStyle} />
          <div className="msla-dynamic-added-param-inputs-container">
            <TextField className="msla-dynamic-added-param-title" placeholder={titlePlaceholder} value={title} onChange={onTitleChange} />
            <div className="msla-dynamic-added-param-value">{onRenderValueField(schemaKey)}</div>
          </div>
          <div className="msla-dynamic-add-param-menu-container">{renderMenuButton()}</div>
        </div>
        {props?.renderDescriptionField && (
          <div className="msla-dynamic-added-param-footer">
            <TextField
              className="msla-dynamic-added-param-description"
              placeholder={props?.descriptionPlaceholder}
              value={props?.description}
              onChange={onDescriptionChange}
            />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="msla-dynamic-added-param-container">
      {renderDynamicParameterContainer()}
      <div className="msla-dynamic-added-param-bottom-divider" />
    </div>
  );
};
