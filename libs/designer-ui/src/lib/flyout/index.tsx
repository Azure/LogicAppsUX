import InformationImage from '../card/images/information_tiny.svg';
import { getDragStartHandlerWhenDisabled } from '../helper';
import { FlyoutCallout } from './flyoutcallout';
import type { ITooltipHostStyles } from '@fluentui/react';
import { css, mergeStyleSets, TooltipHost } from '@fluentui/react';
import React, { useRef, useState } from 'react';

export interface FlyoutProps {
  ariaLabel?: string;
  iconStyle?: React.CSSProperties;
  style?: React.CSSProperties;
  tabIndex?: number;
  text: string;
  title?: string;
  tooltipHostStyles?: ITooltipHostStyles;
  iconSize?: 'sm' | 'lg';
  onClick?(): void;
}

const onDragStartWhenDisabled = getDragStartHandlerWhenDisabled();

const defaultTooltipHostStyles: ITooltipHostStyles = {
  root: {
    display: 'inline-flex',
  },
};

export const Flyout = React.forwardRef<{ collapseFlyout(): void }, FlyoutProps>(
  ({ ariaLabel, iconStyle, style, tabIndex = 0, text, tooltipHostStyles, onClick, title, iconSize = 'lg' }, ref) => {
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    const [flyoutExpanded, setFlyoutExpanded] = useState(false);

    React.useImperativeHandle(ref, () => ({
      collapseFlyout() {
        setFlyoutExpanded(false);
      },
    }));

    const handleDismiss = (): void => {
      setFlyoutExpanded(false);
    };

    const handleFlyoutClick: React.MouseEventHandler<HTMLElement> = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setFlyoutExpanded(!flyoutExpanded);
      onClick?.();
    };

    const styles = mergeStyleSets(defaultTooltipHostStyles, tooltipHostStyles);

    return (
      <TooltipHost content={ariaLabel} styles={styles}>
        <button
          data-testid="callout-btn"
          ref={buttonRef}
          aria-label={ariaLabel ?? title ?? text}
          className="msla-button msla-flyout"
          style={style}
          tabIndex={tabIndex}
          onClick={handleFlyoutClick}
        >
          <img
            alt=""
            className={css('msla-flyout-icon', iconSize)}
            draggable={false}
            role="presentation"
            style={iconStyle}
            src={InformationImage}
            onDragStart={onDragStartWhenDisabled}
          />
          <FlyoutCallout target={buttonRef.current} text={text} visible={flyoutExpanded} onDismiss={handleDismiss} />
        </button>
      </TooltipHost>
    );
  }
);

Flyout.displayName = 'Flyout';
