import { ContextualMenu, DirectionalHint, ICalloutProps, IContextualMenuItem, Target } from '@fluentui/react';
import { useIntl } from 'react-intl';
import { CardProps } from './index';

export interface CardContextMenuProps extends Pick<CardProps, 'contextMenuOptions' | 'title'> {
  contextMenuLocation: Target | undefined;
  showContextMenu: boolean;
  onSetShowContextMenu(value: boolean): void;
}

const calloutProps: ICalloutProps = {
  preventDismissOnLostFocus: false,
  preventDismissOnResize: false,
  preventDismissOnScroll: false,
};

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
    return contextMenuOptions.map((item) => ({
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
      description: 'Accessability label',
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
