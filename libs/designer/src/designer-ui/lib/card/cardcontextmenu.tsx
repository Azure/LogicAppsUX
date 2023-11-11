import type { CardProps } from './index';
import type { MenuItemOption } from './types';
import type { ICalloutProps, IContextualMenuItem, Target } from '@fluentui/react';
import { ContextualMenu, DirectionalHint } from '@fluentui/react';
import { useIntl } from 'react-intl';

export interface CardContextMenuProps extends Pick<CardProps, 'contextMenuOptions' | 'title'> {
  contextMenuLocation: Target | undefined;
  showContextMenu: boolean;
  onSetShowContextMenu(value: boolean): void;
}

const calloutProps: ICalloutProps = {
  preventDismissOnLostFocus: false, // danielle use prevent on preventDismissOnEvent
  preventDismissOnResize: false,
  preventDismissOnScroll: false, // danielle this might be it, true
};

// const preventDismiss = (ev: Event | React.FocusEvent | React.KeyboardEvent | React.MouseEvent):boolean => {
//   if (ev) {
//     return true;
//   }
//   return false;
// }

export const CardContextMenu: React.FC<CardContextMenuProps> = ({
  contextMenuLocation,
  contextMenuOptions = [],
  showContextMenu,
  title,
  onSetShowContextMenu,
}) => {
  const intl = useIntl();

  if (!showContextMenu) {
    return null;
  }

  const getMenuItems = (): IContextualMenuItem[] => {
    return contextMenuOptions.map((item: MenuItemOption) => ({
      key: item.key,
      disabled: item.disabled,
      iconOnly: true,
      iconProps: {
        iconName: item.iconName,
      },
      name: item.title,
      onClick(e) {
        e?.stopPropagation();

        if (item?.onClick) {
          onSetShowContextMenu(false);
          item.onClick(e);
        }
      },
    }));
  };

  const handleDismiss = () => {
    onSetShowContextMenu(false);
  };

  const CARD_CONTEXT_MENU_ARIA_LABEL = intl.formatMessage(
    {
      defaultMessage: 'Context menu for {title} card',
      description: 'Accessibility label',
    },
    {
      title,
    }
  );

  return (
    <ContextualMenu
      ariaLabel={CARD_CONTEXT_MENU_ARIA_LABEL}
      calloutProps={calloutProps}
      directionalHint={DirectionalHint.bottomLeftEdge}
      isBeakVisible={false}
      items={getMenuItems()}
      target={contextMenuLocation}
      onDismiss={handleDismiss}
    />
  );
};
