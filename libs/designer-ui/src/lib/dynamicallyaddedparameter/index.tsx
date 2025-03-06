import type { IContextualMenuProps } from '@fluentui/react';
import { DirectionalHint, IconButton, TextField, TooltipHost } from '@fluentui/react';
import type React from 'react';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import StringStack from './plugins/stringstack';

export const DynamicallyAddedParameterType = {
  Text: 'TEXT',
  File: 'FILE',
  Email: 'EMAIL',
  Boolean: 'BOOLEAN',
  Number: 'NUMBER',
  Date: 'DATE',
  Array: 'ARRAY',
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
  shouldDisplayAddDropdownOption?: boolean;
  shouldDisplayAddMultiSelectOption?: boolean;
  shouldDisplayRemoveDropdownOption?: boolean;
  shouldDisplayRemoveMultiSelectOption?: boolean;
  onTitleChange: (schemaKey: string, newValue: string | undefined) => void;
  onRequiredToggle?: (schemaKey: string) => void;
  onDescriptionChange?: (schemaKey: string, newValue: string | undefined) => void;
  onDelete: (schemaKey: string) => void;
  onRenderValueField: (schemaKey: string) => JSX.Element;
  onStringDropdownListToggle?: (schemaKey: string) => void;
  onStringMultiSelectListToggle?: (schemaKey: string) => void;
  onStringListUpdate?: (schemaKey: string, newValue: string[]) => void;
  stringListValues?: (schemaKey: string) => string[];
  isDynamicParameterMultiSelect?: (schemaKey: string) => boolean;
  isDynamicParameterDropdown?: (schemaKey: string) => boolean;
}

export const DynamicallyAddedParameter = (props: DynamicallyAddedParameterProps): JSX.Element => {
  const {
    icon,
    required,
    schemaKey,
    title,
    titlePlaceholder,
    onDelete,
    onRenderValueField,
    onRequiredToggle,
    onStringMultiSelectListToggle,
    onStringDropdownListToggle,
    shouldDisplayAddDropdownOption,
    shouldDisplayAddMultiSelectOption,
    shouldDisplayRemoveDropdownOption,
    shouldDisplayRemoveMultiSelectOption,
    onStringListUpdate = () => {},
    stringListValues = () => [],
  } = props;
  const intl = useIntl();

  const renderMenuButton = (): JSX.Element => {
    const menuButtonTitle = intl.formatMessage({
      defaultMessage: 'Menu',
      id: 'c172402dcc31',
      description: 'Open dynamically added parameter options menu',
    });

    const deleteText = intl.formatMessage({
      defaultMessage: 'Delete',
      id: '824639c9a88b',
      description: 'Delete dynamic parameter corresponding to this row',
    });

    const optionalText = intl.formatMessage({
      defaultMessage: 'Make the field optional',
      id: 'acc6017f021f',
      description: 'Make the dynamic parameter corresponding to this row optional',
    });

    const requiredText = intl.formatMessage({
      defaultMessage: 'Make the field required',
      id: '1d042d173f89',
      description: 'Make the dynamic parameter corresponding to this row required',
    });

    const addDropdownText = intl.formatMessage({
      defaultMessage: 'Add a drop-down list of options',
      id: '5459ee036af8',
      description: 'Add a drop-down list of options to the text input dynamic parameter',
    });

    const removeDropdownText = intl.formatMessage({
      defaultMessage: 'Remove list of options',
      id: '0dbc59852300',
      description: 'Remove the drop-down list of options for the text input dynamic parameter',
    });

    const addMultiSelectText = intl.formatMessage({
      defaultMessage: 'Add a multi-select list of options',
      id: '754d11812d34',
      description: 'Add a multi-select list of options to the text input dynamic parameter',
    });

    const removeMultiSelectText = intl.formatMessage({
      defaultMessage: 'Remove list of multi options',
      id: 'a31707bece08',
      description: 'Remove multi-select list of options to the text input dynamic parameter',
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

    const baseParameterMultiSelectProps = {
      iconProps: { iconName: 'BulletedTreeList' },
      onClick: () => {
        if (onStringMultiSelectListToggle) {
          onStringMultiSelectListToggle(schemaKey);
        }
        return true;
      },
    };

    const addMultiSelectItem = {
      ...baseParameterMultiSelectProps,
      key: 'dynamicallyaddedparameter_menu_add_multiselect',
      text: addMultiSelectText,
    };

    const removeMultiSelectItem = {
      ...baseParameterMultiSelectProps,
      key: 'dynamicallyaddedparameter_menu_remove_multiselect',
      text: removeMultiSelectText,
    };

    const baseParameterDropdownProps = {
      iconProps: { iconName: 'BulletedTreeList' },
      onClick: () => {
        if (onStringDropdownListToggle) {
          onStringDropdownListToggle(schemaKey);
        }
        return true;
      },
    };

    const addDropdownItem = {
      ...baseParameterDropdownProps,
      key: 'dynamicallyaddedparameter_menu_add_dropdown',
      text: addDropdownText,
    };

    const removeDropdownItem = {
      ...baseParameterDropdownProps,
      key: 'dynamicallyaddedparameter_menu_remove_dropdown',
      text: removeDropdownText,
    };

    const menuProps: IContextualMenuProps | undefined = {
      shouldFocusOnMount: true,
      items: [
        ...(parameterRequiredItem ? [parameterRequiredItem] : []),
        ...(shouldDisplayAddMultiSelectOption && !isDynamicParameterDropdown ? [addMultiSelectItem] : []),
        ...(shouldDisplayRemoveMultiSelectOption ? [removeMultiSelectItem] : []),
        ...(shouldDisplayAddDropdownOption && !isDynamicParameterMultiSelect ? [addDropdownItem] : []),
        ...(shouldDisplayRemoveDropdownOption ? [removeDropdownItem] : []),
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

  const multiSelectTitleText = intl.formatMessage({
    defaultMessage: 'Multi-select list of options',
    id: '09c6e6d98663',
    description: 'Multi-select list of options',
  });

  const dropdownTitleText = intl.formatMessage({
    defaultMessage: 'Drop-down list of options',
    id: '07a0630a5445',
    description: 'Drop-down list of options',
  });

  const isDynamicParameterMultiSelect = props?.isDynamicParameterMultiSelect?.(schemaKey) || false;
  const isDynamicParameterDropdown = props?.isDynamicParameterDropdown?.(schemaKey) || false;
  const isAdvancedDynamicStringParameter = isDynamicParameterMultiSelect || isDynamicParameterDropdown;
  const advancedStringParameterTitle = isAdvancedDynamicStringParameter
    ? isDynamicParameterMultiSelect
      ? multiSelectTitleText
      : dropdownTitleText
    : '';

  const [titleValue, setTitleValue] = useState(title ?? '');
  const [descriptionValue, setDescriptionValue] = useState(props?.description ?? '');

  const renderDynamicParameterContainer = (): JSX.Element => {
    const iconStyle = {
      background: `url('${icon}') no-repeat center`,
      backgroundSize: 'contain',
    };

    const onTitleChange = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
      e.preventDefault();
      setTitleValue(newValue ?? '');
    };

    const onDescriptionChange = (e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string): void => {
      e.preventDefault();
      setDescriptionValue(newValue ?? '');
    };

    const onTitleBlur = (): void => {
      props.onTitleChange(schemaKey, titleValue);
    };

    const onDescriptionBlur = (): void => {
      props?.onDescriptionChange?.(schemaKey, descriptionValue);
    };

    return (
      <>
        <div className="msla-dynamic-added-param-header">
          <div className="msla-dynamic-added-param-icon" style={iconStyle} />
          <div className="msla-dynamic-added-param-inputs-container">
            <TextField
              className="msla-dynamic-added-param-title"
              placeholder={titlePlaceholder}
              value={titleValue}
              onChange={onTitleChange}
              onBlur={onTitleBlur}
            />
            <div className="msla-dynamic-added-param-value">{onRenderValueField(schemaKey)}</div>
          </div>
          <div className="msla-dynamic-add-param-menu-container">{renderMenuButton()}</div>
        </div>
        {props?.renderDescriptionField && (
          <div className="msla-dynamic-added-param-footer">
            <TextField
              className="msla-dynamic-added-param-description"
              placeholder={props?.descriptionPlaceholder}
              value={descriptionValue}
              onChange={onDescriptionChange}
              onBlur={onDescriptionBlur}
            />
          </div>
        )}
        {isAdvancedDynamicStringParameter ? (
          <div className="msla-dynamic-added-param-token-picker">
            <StringStack
              advancedStringParameterTitle={advancedStringParameterTitle}
              initialStrings={stringListValues}
              schemaKey={schemaKey}
              onStringListUpdate={onStringListUpdate}
            />
          </div>
        ) : undefined}
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
