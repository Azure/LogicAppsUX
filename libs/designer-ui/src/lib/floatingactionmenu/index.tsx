import type { DynamicallyAddedParameterProps, DynamicallyAddedParameterTypeType } from '../dynamicallyaddedparameter';
import { DynamicallyAddedParameter } from '../dynamicallyaddedparameter';
import {
  createDynamicallyAddedParameterProperties,
  deserialize,
  generateDynamicParameterKey,
  getEmptySchemaValueSegmentForInitialization,
  serialize,
} from '../dynamicallyaddedparameter/helper';
import type { ValueSegment } from '../editor';
import type { ChangeHandler } from '../editor/base';
import { getMenuItemsForDynamicAddedParameters } from './helper';
import { KeyCodes } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { ValidationErrorCode, ValidationException, safeSetObjectPropertyValue } from '@microsoft/utils-logic-apps';
import React from 'react';
import { useIntl } from 'react-intl';

export interface FloatingActionMenuItem {
  type: DynamicallyAddedParameterTypeType;
  icon: string;
  label: string;
}

export interface FloatingActionMenuProps {
  supportedTypes: Array<string>;
  useStaticInputs: boolean | undefined;
  initialValue: ValueSegment[];
  isManualTrigger: boolean;
  onChange?: ChangeHandler;
}

export const FloatingActionMenu = (props: FloatingActionMenuProps): JSX.Element => {
  const [expanded, { toggle: toggleExpanded }] = useBoolean(false);

  if (!props.supportedTypes) {
    throw new ValidationException(ValidationErrorCode.INVALID_PARAMETERS, 'supportedTypes are necessary.');
  }
  const menuItems = getMenuItemsForDynamicAddedParameters(props.supportedTypes);

  // Set an empty schema object in the value so that the object structure is what Flow-RP expects.
  if (props.initialValue.length > 0 && !props.initialValue[0].value) {
    const { onChange } = props;
    if (onChange) {
      const value = getEmptySchemaValueSegmentForInitialization(!!props.useStaticInputs, props.isManualTrigger);
      onChange({ value });
    }
  }

  const intl = useIntl();
  const closeErrorButtonAriaLabel = intl.formatMessage({
    defaultMessage: 'Close',
    description: 'Close button aria label',
  });
  const collapsedTitle = intl.formatMessage({ defaultMessage: 'Add an input', description: 'Button to add a dynamically added parameter' });
  const expandedTitle = intl.formatMessage({
    defaultMessage: 'Choose the type of user input',
    description: 'Button to choose data type of the dynamically added parameter',
  });

  const onDynamicallyAddedParameterChange = (schemaKey: string, propertyName: string, newPropertyValue?: string) => {
    const { onChange } = props;
    if (onChange) {
      const indexOfPropToUpdate = dynamicParameterProps.findIndex((prop) => prop.schemaKey === schemaKey);
      safeSetObjectPropertyValue(dynamicParameterProps[indexOfPropToUpdate], ['properties', propertyName], newPropertyValue);
      const value = serialize(dynamicParameterProps, props.isManualTrigger);
      onChange({ value });
    }
  };

  const onDynamicallyAddedParameterDelete = (schemaKey: string) => {
    const { onChange } = props;
    if (onChange) {
      const indexToDelete = dynamicParameterProps.findIndex((prop) => prop.schemaKey === schemaKey);
      dynamicParameterProps.splice(indexToDelete, 1);
      const value = serialize(dynamicParameterProps, props.isManualTrigger);
      onChange({ value });
    }
  };

  const dynamicParameterProps: DynamicallyAddedParameterProps[] = deserialize(props.initialValue, props.isManualTrigger).map((prop) => ({
    ...prop,
    onChange: onDynamicallyAddedParameterChange,
    onDelete: onDynamicallyAddedParameterDelete,
  }));

  const toggleExpandedOnKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const { keyCode } = e;

    if (keyCode === KeyCodes.enter || keyCode === KeyCodes.space) {
      e.preventDefault();
      e.stopPropagation();
      toggleExpanded();
    }
  };

  const renderMenuButton = (): JSX.Element => {
    return (
      <div role="button" className="msla-floating-action-menu" onClick={toggleExpanded} onKeyDown={toggleExpandedOnKeyDown} tabIndex={0}>
        <span className="msla-floating-action-menu-plus-icon">{'+'}</span>
        <span className="msla-floating-action-menu-title">{collapsedTitle}</span>
      </div>
    );
  };

  const renderMenuItems = (): JSX.Element => {
    return (
      <div className="msla-floating-action-menu-items-container">
        {renderMenuItemsHeader()}
        <div className="msla-floating-action-menu-items">
          {menuItems.map((item: FloatingActionMenuItem) => {
            return renderMenuItem(item);
          })}
        </div>
      </div>
    );
  };

  const renderMenuItemsHeader = (): JSX.Element => {
    return (
      <div>
        <span className="msla-floating-action-menu-items-title">{expandedTitle}</span>
        <span
          role="button"
          aria-label={closeErrorButtonAriaLabel}
          className="msla-floating-action-menu-items-close"
          onClick={toggleExpanded}
          onKeyDown={toggleExpandedOnKeyDown}
          tabIndex={0}
        >
          {'x'}
        </span>
      </div>
    );
  };

  const renderMenuItem = (menuItem: FloatingActionMenuItem): JSX.Element => {
    const itemStyle = {
      background: `url('${menuItem.icon}') no-repeat center`,
    };

    if (menuItems.length === 1) {
      return (
        <div
          role="button"
          aria-label={menuItem.label}
          tabIndex={0}
          className="msla-floating-action-menu-item-vertical-container"
          onClick={() => handleMenuItemSelected(menuItem)}
          onKeyDown={(e: React.KeyboardEvent<HTMLElement>): void => handleMenuItemSelectedOnKeyDown(e, menuItem)}
        >
          <div className="msla-menu-item-logo" style={itemStyle} />
          <span className="msla-vertical-menu-item-label">{menuItem.label}</span>
        </div>
      );
    } else {
      return (
        <div key={menuItem.type} className="msla-floating-action-menu-item-horizontal-container">
          <div
            role="button"
            aria-label={menuItem.label}
            tabIndex={0}
            className="msla-menu-item-logo"
            style={itemStyle}
            onClick={() => handleMenuItemSelected(menuItem)}
            onKeyDown={(e: React.KeyboardEvent<HTMLElement>): void => handleMenuItemSelectedOnKeyDown(e, menuItem)}
          />
          <span className="msla-horizontal-menu-item-label">{menuItem.label}</span>
        </div>
      );
    }
  };

  const addNewDynamicallyAddedParameter = (item: FloatingActionMenuItem) => {
    const { icon, type: floatingActionMenuItemType } = item;

    const schemaKey = generateDynamicParameterKey(dynamicParameterProps, item.type);
    dynamicParameterProps.push({
      icon,
      schemaKey,
      properties: createDynamicallyAddedParameterProperties(floatingActionMenuItemType, schemaKey),
      required: true, // TODO: add functionality to allow making parameters optional
      onChange: onDynamicallyAddedParameterChange,
      onDelete: onDynamicallyAddedParameterDelete,
    });
  };

  const handleMenuItemSelected = (selectedItem: FloatingActionMenuItem) => {
    toggleExpanded();

    addNewDynamicallyAddedParameter(selectedItem);

    const { onChange } = props;
    if (onChange) {
      const value = serialize(dynamicParameterProps, props.isManualTrigger);
      onChange({ value });
    }
  };

  const handleMenuItemSelectedOnKeyDown = (e: React.KeyboardEvent<HTMLElement>, item: FloatingActionMenuItem) => {
    const { keyCode } = e;

    if (keyCode === KeyCodes.enter || keyCode === KeyCodes.space) {
      e.preventDefault();
      e.stopPropagation();
      handleMenuItemSelected(item);
    }
  };

  return (
    <>
      <div className="msla-dynamic-added-params-container">
        {dynamicParameterProps.map((props) =>
          props.properties['x-ms-dynamically-added'] === true ? <DynamicallyAddedParameter {...props} key={props.schemaKey} /> : null
        )}
      </div>
      <div className="msla-floating-action-menu-container">
        {!expanded ? renderMenuButton() : null}
        {expanded ? renderMenuItems() : null}
      </div>
    </>
  );
};
