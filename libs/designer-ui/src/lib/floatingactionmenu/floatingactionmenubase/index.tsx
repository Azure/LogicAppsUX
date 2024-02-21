import type { DynamicallyAddedParameterTypeType } from '../../dynamicallyaddedparameter';
import { getMenuItemsForDynamicAddedParameters } from './helper';
import { Icon, KeyCodes } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import { ValidationErrorCode, ValidationException } from '@microsoft/logic-apps-shared';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { useIntl } from 'react-intl';

export type FloatingActionMenuItem = {
  type: DynamicallyAddedParameterTypeType;
  icon: string;
  label: string;
};

type FloatingActionMenuBaseProps = {
  supportedTypes: string[];
  collapsedTitle: string;
  expandedTitle: string;
  onMenuItemSelected: (item: FloatingActionMenuItem) => void;
};

export const FloatingActionMenuBase = (props: PropsWithChildren<FloatingActionMenuBaseProps>): JSX.Element => {
  const intl = useIntl();
  const [expanded, { toggle: toggleExpanded }] = useBoolean(false);

  if (!props.supportedTypes?.length) {
    throw new ValidationException(ValidationErrorCode.INVALID_PARAMETERS, 'supportedTypes are necessary.');
  }

  const menuItems = getMenuItemsForDynamicAddedParameters(props.supportedTypes);

  const toggleExpandedOnKeyDown = (e: React.KeyboardEvent<HTMLElement>): void => {
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
        <Icon className="msla-floating-action-menu-plus-icon" iconName={'Add'} />
        <span className="msla-floating-action-menu-title">{props.collapsedTitle}</span>
      </div>
    );
  };

  const renderMenuItemsHeader = (): JSX.Element => {
    const closeErrorButtonAriaLabel = intl.formatMessage({
      defaultMessage: 'Close',
      description: 'Close button aria label',
    });

    return (
      <div>
        <span className="msla-floating-action-menu-items-title">{props.expandedTitle}</span>
        <span
          role="button"
          aria-label={closeErrorButtonAriaLabel}
          className="msla-floating-action-menu-items-close"
          onClick={toggleExpanded}
          onKeyDown={toggleExpandedOnKeyDown}
          tabIndex={0}
        >
          <Icon className="msla-floating-action-menu-x-icon" iconName={'Cancel'} />
        </span>
      </div>
    );
  };

  const renderMenuItem = (menuItem: FloatingActionMenuItem): JSX.Element => {
    const itemStyle = {
      background: `url('${menuItem.icon}') no-repeat center`,
    };

    const handleMenuItemSelected = (item: FloatingActionMenuItem): void => {
      toggleExpanded();

      props.onMenuItemSelected(item);
    };

    const handleMenuItemSelectedOnKeyDown = (e: React.KeyboardEvent<HTMLElement>, item: FloatingActionMenuItem): void => {
      const { keyCode } = e;

      if (keyCode === KeyCodes.enter || keyCode === KeyCodes.space) {
        e.preventDefault();
        e.stopPropagation();
        handleMenuItemSelected(item);
      }
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

  return (
    <>
      <div className="msla-dynamic-added-params-container">{props.children}</div>
      <div className="msla-floating-action-menu-container">{expanded ? renderMenuItems() : renderMenuButton()}</div>
    </>
  );
};
