import { IconButton } from '@fluentui/react/lib/Button';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import { css } from '@fluentui/react/lib/Utilities';
import * as React from 'react';
import { useIntl } from 'react-intl';

import { equals, hexToRgbA } from '../../common/utilities/Utils';

import { CardContextMenu, CardContextMenuProps } from '../card/cardcontextmenu';
import { CardHeaderLogo } from '../card/cardmonitor';
import { MenuItemOption } from '../card/menu';
import Constants from '../constants';
import { Title } from '../title';
import { isDeleteKey } from '../utils/keyboardUtils';

type IIconProps = import('@fluentui/react/lib/Icon').IIconProps;

export interface CardProps {
  brandColor?: string;
  children?: React.ReactNode;
  contextMenuOptions?: MenuItemOption[];
  hideHeaderLogo?: boolean;
  icon: string;
  isPanelModeEnabled?: boolean;
  neverCollapsed?: boolean;
  rootRef?: React.RefObject<any>; // tslint:disable-line: no-any
  selected: boolean;
  title: string;
  onCancelClick?(): void;
  onClick?(): void;
  renderCardViewHeader?: JSX.Element;
}

const CancelButtonProps: IIconProps = {
  iconName: 'Cancel',
};

export const Card: React.FC<CardProps> = (props) => {
  const { brandColor = Constants.DEFAULT_BRAND_COLOR, hideHeaderLogo = false, isPanelModeEnabled = false, neverCollapsed = false } = props;
  if (isPanelModeEnabled || neverCollapsed) {
    return (
      <CardV2
        {...props}
        brandColor={brandColor}
        hideHeaderLogo={hideHeaderLogo}
        isPanelModeEnabled={isPanelModeEnabled}
        neverCollapsed={neverCollapsed}
      />
    );
  }

  return (
    <CardV1
      {...props}
      brandColor={brandColor}
      hideHeaderLogo={hideHeaderLogo}
      isPanelModeEnabled={isPanelModeEnabled}
      neverCollapsed={neverCollapsed}
    />
  );
};

export function getCardV1ButtonGroup(props: CardProps, cancelString: string): JSX.Element {
  const { renderCardViewHeader, onCancelClick } = props;

  return (
    <div className="msla-card-title-button-group">
      {renderCardViewHeader}
      <TooltipHost content={cancelString}>
        <IconButton ariaLabel={cancelString} className="msla-card-close" iconProps={CancelButtonProps} onClick={onCancelClick} />
      </TooltipHost>
    </div>
  );
}

export const CardV1: React.FC<CardProps> = (props) => {
  const { brandColor, children, hideHeaderLogo, icon, selected, title } = props;
  const className = css('msla-card', 'msla-card-fixed-width', 'msla-recommendation', selected && 'msla-card-selected');
  const intl = useIntl();
  const CANCEL = intl.formatMessage({
    defaultMessage: 'Cancel',
    id: '47FYwb',
  });
  const buttonGroup = getCardV1ButtonGroup(props, CANCEL);
  return (
    <div className={className}>
      <div className="msla-card-header" style={getHeaderStyle(brandColor)}>
        <div className="msla-card-title-group">
          <CardHeaderLogo brandColor={brandColor} hideHeaderLogo={hideHeaderLogo} icon={icon} />
          <Title className="msla-card-header-title" text={title} />
        </div>
        {buttonGroup}
      </div>
      <div className="msla-card-body">{children}</div>
    </div>
  );
};

export const CardV2: React.FC<CardProps> = (props: CardProps) => {
  function handleKeyUp(e: React.KeyboardEvent<HTMLElement>) {
    if (isDeleteKey(e)) {
      e.preventDefault();
      e.stopPropagation();
      const menuItemOptions = props.contextMenuOptions;
      for (const itemOption of menuItemOptions ?? []) {
        if (equals(itemOption.key, 'delete') && !itemOption.disabled) {
          itemOption.clickHandler && itemOption.clickHandler(e);
        }
      }
    }
  }

  function handleContextMenu(e: React.MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu(true);
    setContextMenuLocation({ x: e.clientX, y: e.clientY });
  }

  function handleClick(e: React.MouseEvent<HTMLElement>): void {
    // NOTE(joechung): Prevent the designer container from deselecting the recommendation card.
    e.stopPropagation();

    if (onClick) {
      onClick();
    }
  }

  function onSetShowContextMenu(value: boolean): void {
    setShowContextMenu(value);
  }

  const [showContextMenu, setShowContextMenu] = React.useState(false);
  const [contextMenuLocation, setContextMenuLocation] = React.useState({
    x: 0,
    y: 0,
  });

  const { children, neverCollapsed } = props;
  if (neverCollapsed) {
    return children;
  }

  const { brandColor, contextMenuOptions, icon, rootRef, selected, title, onClick } = props;
  const className = css('msla-card-v2', selected && 'msla-selected');
  const contextMenuProps: CardContextMenuProps = {
    ...props,
    contextMenuLocation,
    showContextMenu,
    onSetShowContextMenu,
  };

  return (
    <div onContextMenu={handleContextMenu} onKeyUp={handleKeyUp}>
      <button className={className} style={getCardStyle(brandColor)} onClick={handleClick} ref={rootRef}>
        <img src={icon} alt="" role="presentation" />
        <span>{title}</span>
      </button>
      {contextMenuOptions ? CardContextMenu(contextMenuProps) : null}
    </div>
  );
};

const getBrandColorRgbA = (brandColor?: string, opacity = Constants.HEADER_AND_TOKEN_OPACITY): string => {
  try {
    return hexToRgbA(brandColor ?? Constants.DEFAULT_BRAND_COLOR, opacity);
  } catch {
    return hexToRgbA(Constants.DEFAULT_BRAND_COLOR, opacity);
  }
};

const getCardStyle = (brandColor?: string): React.CSSProperties => {
  return {
    borderLeft: `4px solid ${getBrandColorRgbA(brandColor, /* opacity */ 1)}`,
  };
};

const getHeaderStyle = (brandColor?: string): React.CSSProperties => {
  return {
    backgroundColor: getBrandColorRgbA(brandColor),
  };
};
