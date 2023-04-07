import { KeyCodes } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import React from 'react';
import { useIntl } from 'react-intl';

export enum DynamicallyAddedParameterType {
  Text = 1,
  File,
  Email,
  Boolean,
  Number,
  Date,
}

export interface FloatingActionMenuItem {
  id: number;
  icon: string;
  label: string;
}

export interface FloatingActionMenuProps {
  collapsedTitle: string;
  expandable: boolean;
  expandedTitle: string;
  menuItems: FloatingActionMenuItem[];
  onMenuItemSelected(item: FloatingActionMenuItem): void;
}

export const FloatingActionMenu = (props: FloatingActionMenuProps): JSX.Element => {
  const [expanded, { toggle: toggleExpanded }] = useBoolean(false);

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
        <span className="msla-floating-action-menu-title">{props.collapsedTitle}</span>
      </div>
    );
  };

  const renderMenuItems = (): JSX.Element => {
    return (
      <div className="msla-floating-action-menu-items-container">
        {renderMenuItemsHeader()}
        <div className="msla-floating-action-menu-items">
          {props.menuItems.map((item: FloatingActionMenuItem) => {
            return renderMenuItem(item);
          })}
        </div>
      </div>
    );
  };

  const renderMenuItemsHeader = (): JSX.Element => {
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
          {'x'}
        </span>
      </div>
    );
  };

  const renderMenuItem = (menuItem: FloatingActionMenuItem): JSX.Element => {
    const itemStyle = {
      background: `url('${menuItem.icon}') no-repeat center`,
    };

    if (props.menuItems.length === 1) {
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
    props.onMenuItemSelected(item);
  };

  const handleMenuItemSelectedOnKeyDown = (e: React.KeyboardEvent<HTMLElement>, item: FloatingActionMenuItem) => {
    const { keyCode } = e;

    if (keyCode === KeyCodes.enter || keyCode === KeyCodes.space) {
      e.preventDefault();
      e.stopPropagation();
      handleMenuItemSelected(item);
    }
  };

  const intl = useIntl();

  const closeErrorButtonAriaLabel = intl.formatMessage({
    defaultMessage: 'Close',
    description: 'Close button aria label',
  });

  return (
    <div className="msla-floating-action-menu-container">
      {!expanded ? renderMenuButton() : undefined}
      {expanded ? renderMenuItems() : undefined}
    </div>
  );
};
