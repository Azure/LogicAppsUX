import { DynamicallyAddedParameter } from '../dynamicallyaddedparameter';
import { ValueSegment, ValueSegmentType } from '../editor';
import { ChangeHandler } from '../editor/base';
import { getMenuItemsForDynamicAddedParameters } from './helper';
import { KeyCodes } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { ValidationErrorCode, ValidationException, guid } from '@microsoft/utils-logic-apps';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';

export interface FloatingActionMenuItem {
  id: string;
  icon: string;
  label: string;
}

export interface FloatingActionMenuProps {
  supportedTypes: Array<string>;
  onChange?: ChangeHandler;
  initialValue?: ValueSegment[];
}

export const FloatingActionMenu = (props: FloatingActionMenuProps): JSX.Element => {
  const [expanded, { toggle: toggleExpanded }] = useBoolean(false);
  const [value, setValue] = useState(props.initialValue ?? []);

  // const dynamicParameters = value.map((value) => {
  //   const schemaObject = JSON.parse(value.value);
  //   const dynamicProperties = schemaObject.properties;
  //   // return <DynamicallyAddedParameter key={item.id} labelIcon={item.icon} />;
  // });

  if (!props.supportedTypes) {
    throw new ValidationException(ValidationErrorCode.INVALID_PARAMETERS, 'supportedTypes are necessary.');
  }
  const menuItems = getMenuItemsForDynamicAddedParameters(props.supportedTypes);

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
          <div className="msla-vertical-menu-item-add" />
        </div>
      );
    } else {
      return (
        <div key={menuItem.id} className="msla-floating-action-menu-item-horizontal-container">
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

  const handleMenuItemSelected = (item: FloatingActionMenuItem) => {
    toggleExpanded();
    // TODO(WI#17890957): Add callback to render dynamically added parameter
    setValue([
      ...value,
      {
        id: guid(),
        type: ValueSegmentType.LITERAL,
        value: JSON.stringify(item),
      },
    ]);
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
      {/* {dynamicParameters} */}
      <div className="msla-floating-action-menu-container">
        {!expanded ? renderMenuButton() : undefined}
        {expanded ? renderMenuItems() : undefined}
      </div>
    </>
  );
};
