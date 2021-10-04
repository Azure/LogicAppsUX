import { Target } from '@fluentui/react/lib/Callout';
import {
  ContextualMenu as FabricContextualMenu,
  ContextualMenuItem,
  ContextualMenuItemType,
  DirectionalHint,
  IContextualMenuItem,
  IContextualMenuItemProps,
} from '@fluentui/react/lib/ContextualMenu';
import { Icon, IIconProps } from '@fluentui/react/lib/Icon';
import { getTheme, IStyle } from '@fluentui/react/lib/Styling';
import { classNamesFunction } from '@fluentui/react/lib/Utilities';
import * as React from 'react';
import { getIntl } from '../../../common/i18n/intl';

import { BaseComponent, BaseComponentProps } from '../../base';
import Constants from '../../constants';
import { Flyout } from '../../flyout';
import { UserAction } from '../../telemetry/models';
import { getMenuItemStyles } from './menu.styles';

export enum MenuItemType {
  Normal = 0,
  Divider = 1,
  Header = 2,
  Advanced = 3,
}

export interface MenuItemOption {
  disabled?: boolean;
  disabledReason?: string;
  iconName?: string;
  iconUri?: string;
  checked?: boolean;
  key: string;
  subMenuItems?: MenuItemOption[]; // NOTE(shimedh): Sub-menus are only supported for basic menu item by Fabric.
  subtitle?: SubtitleOption;
  title: string;
  type: MenuItemType;
  clickHandler?(e: React.SyntheticEvent<HTMLElement>): void;
}

export interface SubtitleOption {
  disabled?: boolean;
  iconUri?: string;
  title: string;
}

export interface MenuProps extends BaseComponentProps {
  directionalHint?: DirectionalHint;
  gapSpace?: number;
  ignoreDismissTarget?: Element;
  maxWidth?: number;
  menuItems: MenuItemOption[];
  showConnectionsOnMenu?: boolean;
  target?: Target;
  onClick?(): void;
  onDismiss?(): void;
}

export interface IMenuItemStyles {
  mainContentContainer: IStyle;
  mainIconRoot: IStyle;
  mainText: IStyle;
  root: IStyle;
  secondaryText: IStyle;
  textAreaIcon: IStyle;
  textContainer: IStyle;
}

export class Menu extends BaseComponent<MenuProps> {
  private readonly getClassNames = classNamesFunction<Record<string, unknown>, IMenuItemStyles>();

  render(): JSX.Element {
    return (
      <FabricContextualMenu
        directionalHint={this.props.directionalHint}
        gapSpace={this.props.gapSpace}
        items={this.props.menuItems.map((menuItem) => this._getMenuItem(menuItem))}
        shouldFocusOnMount={true}
        target={this.props.target}
        contextualMenuItemAs={(props: IContextualMenuItemProps) => this._renderMenuItem(props)}
        onDismiss={this._handleDismiss}
      />
    );
  }

  protected get telemetryIdentifier(): string {
    return Constants.TELEMETRY_IDENTIFIERS.MENU;
  }

  private _renderMenuItem = (contextualMenuItem: IContextualMenuItemProps): JSX.Element | null => {
    const menuItems: MenuItemOption[] = this.props.menuItems.filter((menuItemOption: MenuItemOption) => {
      return menuItemOption.key === contextualMenuItem.item.key;
    });

    const menuItem = menuItems[0];
    if (!menuItem) {
      return null;
    }

    if (menuItem.type !== MenuItemType.Advanced) {
      return <ContextualMenuItem {...contextualMenuItem} />;
    }

    const menuItemClassNames = this.getClassNames(getMenuItemStyles(menuItem, this.props));

    return (
      <div className={menuItemClassNames.root}>
        <div className={menuItemClassNames.mainContentContainer} key={menuItem.key} data-disabled={menuItem.disabled}>
          {this._renderMenuIcon(menuItem)}
          {this._renderTitle(menuItem)}
        </div>
        {this._renderDisabledReason(menuItem)}
      </div>
    );
  };

  private _getMenuItem(menuItem: MenuItemOption): IContextualMenuItem | never {
    const iconProps: IIconProps | undefined = menuItem.iconUri
      ? {
          imageProps: {
            src: menuItem.iconUri,
            styles: {
              image: {
                height: 14,
                width: 14,
              },
            },
          },
        }
      : undefined;

    switch (menuItem.type) {
      case MenuItemType.Header:
        return {
          key: menuItem.key,
          itemType: ContextualMenuItemType.Header,
          name: menuItem.title,
          disabled: menuItem.disabled,
          iconProps,
        };

      case MenuItemType.Normal:
        return {
          key: menuItem.key,
          itemType: ContextualMenuItemType.Normal,
          name: menuItem.title,
          disabled: menuItem.disabled,
          iconProps,
          onClick: !!menuItem.subMenuItems && menuItem.subMenuItems.length > 0 ? undefined : (e) => this._handleClick(menuItem, e as any),
          subMenuProps:
            !!menuItem.subMenuItems && menuItem.subMenuItems.length > 0
              ? { items: menuItem.subMenuItems.map((subMenuItem) => this._getMenuItem(subMenuItem)) ?? [] }
              : undefined,
        };

      case MenuItemType.Divider:
        return {
          key: menuItem.key,
          itemType: ContextualMenuItemType.Divider,
          name: menuItem.title,
        };

      case MenuItemType.Advanced:
        return {
          key: menuItem.key,
          name: menuItem.title,
          disabled: menuItem.disabled,
          checked: menuItem.checked,
          title: (menuItem.disabled && menuItem.disabledReason) || undefined,
          onClick: (e) => this._handleClick(menuItem, e as any),
        };

      default:
        throw new Error(`Unexpected menu item type '${menuItem.type}'.`);
    }
  }

  private _flyoutGetMoreIntoText = () => {
    const intl = getIntl();
    return intl.formatMessage({
      defaultMessage: 'More info',
      id: 'HOsSgX',
    });
  };
  private _renderDisabledReason(menuItem: MenuItemOption): JSX.Element | null {
    const { disabled, disabledReason } = menuItem;

    if (!(disabled && disabledReason)) {
      return null;
    }

    return (
      <Flyout
        title={this._flyoutGetMoreIntoText()}
        ariaLabel={this._getMenuItemMoreInfoAriaLabel(menuItem.title)}
        style={{
          alignItems: 'center',
          border: 'none',
          display: 'flex',
        }}
        iconStyle={{
          height: 15,
          width: 15,
          margin: 0,
        }}
        text={disabledReason}
      />
    );
  }

  private _getMenuItemMoreInfoAriaLabel(menuItemTitle: string): string {
    return menuItemTitle ? `${menuItemTitle} ${this._flyoutGetMoreIntoText()}` : this._flyoutGetMoreIntoText();
  }

  private _renderTitle(menuItem: MenuItemOption): JSX.Element {
    const menuItemClassNames = this.getClassNames(getMenuItemStyles(menuItem, this.props));

    if (menuItem.subtitle) {
      return (
        <span className={menuItemClassNames.textContainer}>
          <div className={menuItemClassNames.mainText}>
            <span>{menuItem.title}</span>
            {this._renderSubtitleIcon(menuItem)}
          </div>
          <div className={menuItemClassNames.secondaryText}>{menuItem.subtitle.title}</div>
        </span>
      );
    } else {
      return <span className={menuItemClassNames.textContainer}>{menuItem.title}</span>;
    }
  }

  private _renderSubtitleIcon(menuItem: MenuItemOption): JSX.Element | null {
    const { subtitle } = menuItem;

    if (subtitle?.iconUri) {
      const menuItemClassNames = this.getClassNames(getMenuItemStyles(menuItem, this.props));

      return (
        <img alt={subtitle.title || ''} title={subtitle.title || ''} className={menuItemClassNames.textAreaIcon} src={subtitle.iconUri} />
      );
    } else {
      return null;
    }
  }

  private _renderMenuIcon(menuItem: MenuItemOption): JSX.Element {
    const iconUri = menuItem.iconUri;
    const iconName = menuItem.iconName;

    const menuItemClassNames = this.getClassNames(getMenuItemStyles(menuItem, this.props));

    if (iconName) {
      const theme = getTheme();
      const colorThemeStyles = menuItem.checked ? { root: { color: theme.palette.themePrimary } } : undefined;

      return <Icon iconName={iconName} styles={colorThemeStyles} className={menuItemClassNames.mainIconRoot} />;
    } else if (iconUri) {
      return <img className={menuItemClassNames.mainIconRoot} src={iconUri} />;
    } else {
      return <div className={menuItemClassNames.mainIconRoot}></div>;
    }
  }

  private _handleClick(menu: MenuItemOption, e: React.SyntheticEvent<HTMLElement>): void {
    const telemetryContext = {
      disabled: menu.disabled,
      title: menu.title,
      type: menu.type,
    };

    this.trackAction(UserAction.click, Constants.TELEMETRY_IDENTIFIERS.MENU_ITEM, telemetryContext);

    if (menu.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const onClick = this.props.onClick;
    if (onClick) {
      onClick();
    }

    if (menu.clickHandler) {
      menu.clickHandler(e);
    }
  }

  // tslint:disable-next-line: no-any
  private _handleDismiss = (e: any): void => {
    const { ignoreDismissTarget, onDismiss } = this.props;
    if (onDismiss && (!ignoreDismissTarget || ignoreDismissTarget !== e.target)) {
      onDismiss();
    }
  };
}
