import { ContextualMenu, DirectionalHint, IContextualMenuItem } from '@fluentui/react/lib/ContextualMenu';
import * as React from 'react';
import { useIntl } from 'react-intl';
import { CardV2Props } from './cardv2';

type ICalloutProps = import('@fluentui/react/lib/Callout').ICalloutProps;

export interface CardContextMenuProps extends Partial<CardV2Props> {
  contextMenuLocation: { x: number; y: number };
  showContextMenu: boolean;
  onSetShowContextMenu(value: boolean): void;
}

const calloutProps: ICalloutProps = {
  preventDismissOnLostFocus: false,
  preventDismissOnResize: false,
  preventDismissOnScroll: false,
};

export function CardContextMenu({
  contextMenuLocation,
  contextMenuOptions = [],
  showContextMenu,
  title,
  onSetShowContextMenu,
}: CardContextMenuProps): JSX.Element | null {
  const intl = useIntl();

  function getMenuItems(): IContextualMenuItem[] {
    return contextMenuOptions.map((item) => ({
      key: item.key,
      disabled: item.disabled,
      name: item.title,
      iconOnly: true,
      iconProps: {
        iconName: item.iconName,
      },
      onClick: ((e: React.MouseEvent<HTMLElement>) => {
        handleMenuItemClick(e, item);
      }) as any,
    }));
  }

  function handleDismiss(): void {
    onSetShowContextMenu(false);
  }

  function handleMenuItemClick(e: React.MouseEvent<HTMLElement>, item: IContextualMenuItem): boolean | undefined {
    e.stopPropagation();

    const { clickHandler } = item;
    if (clickHandler) {
      onSetShowContextMenu(false);
      return clickHandler(e);
    }
    return undefined;
  }

  const CARD_CONTEXT_MENU_ARIA_LABEL = intl.formatMessage(
    {
      defaultMessage: 'Context menu for {title} card',
      description: 'Accessability label',
    },
    {
      title,
    }
  );
  if (showContextMenu) {
    return (
      <ContextualMenu
        aria-label={CARD_CONTEXT_MENU_ARIA_LABEL}
        calloutProps={calloutProps}
        directionalHint={DirectionalHint.bottomLeftEdge}
        onDismiss={handleDismiss}
        items={getMenuItems()}
        isBeakVisible={false}
        target={contextMenuLocation}
      />
    );
  }

  return null;
}
