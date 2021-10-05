import { DirectionalHint, ICalloutProps } from '@fluentui/react/lib/Callout';
import { getTheme, ITheme, registerOnThemeChangeCallback, removeOnThemeChangeCallback } from '@fluentui/react/lib/Styling';
import { ITooltipHost, ITooltipHostStyles, TooltipHost } from '@fluentui/react/lib/Tooltip';
import { css } from '@fluentui/react/lib/Utilities';
import * as React from 'react';
import { findDOMNode } from 'react-dom';

import { Plus } from './images/plus';
import { useEffect } from 'react';

export interface ActionButtonV2Props {
  buttonRef?: React.RefObject<HTMLButtonElement>;
  className?: string;
  disabled?: boolean;
  title: string;
  onClick?(e: React.MouseEvent<HTMLElement>): void;
}

// NOTE(joechung): Set tooltip host's CSS display to inline-block to work around an IE positioning bug.
const tooltipHostStyles: ITooltipHostStyles = {
  root: {
    display: 'inline-block',
  },
};

export function ActionButtonV2({ buttonRef, className, disabled = false, title, onClick }: ActionButtonV2Props): JSX.Element {
  function dismissTooltip(): void {
    setTarget(null);
    if (tooltipRef.current) {
      tooltipRef.current.dismiss();
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLButtonElement>): void {
    e.preventDefault();
    dismissTooltip();
  }

  function handleClick(e: React.MouseEvent<HTMLButtonElement>): void {
    if (onClick) {
      onClick(e);
    }
  }

  function handleFocus(e: React.FocusEvent<HTMLButtonElement>): void {
    e.preventDefault();

    // NOTE(sopai): Use focus events instead of element target to work around a possible multi-instance Fabric Callout bug.
    const focusTarget = e.target;
    // eslint-disable-next-line react/no-find-dom-node
    const element = findDOMNode(buttonRef?.current as unknown as React.ReactInstance) as Element;
    const tooltipTarget = !focusTarget ? element : focusTarget;
    setTarget(tooltipTarget);
  }

  function handleMouseEnter(e: React.MouseEvent<HTMLButtonElement>): void {
    e.preventDefault();

    // NOTE(sopai): Use mouse events instead of element target to work around a possible multi-instance Fabric Callout bug.
    const mouseEvent = e.nativeEvent;
    // eslint-disable-next-line react/no-find-dom-node
    const element = findDOMNode(buttonRef?.current as unknown as React.ReactInstance) as Element;
    const tooltipTarget = !mouseEvent ? element : mouseEvent;
    setTarget(tooltipTarget);
  }

  function handleMouseLeave(e: React.MouseEvent<HTMLButtonElement>): void {
    e.preventDefault();
    dismissTooltip();
  }

  function handleThemeChange(theme: ITheme): void {
    setIsInverted(theme.isInverted);
  }

  const [isInverted, setIsInverted] = React.useState(() => getTheme().isInverted);
  const tooltipRef = React.useRef<ITooltipHost>(null);
  const [target, setTarget] = React.useState<MouseEvent | Element | null>(null);

  useEffect(() => {
    registerOnThemeChangeCallback(handleThemeChange);
    return () => {
      removeOnThemeChangeCallback(handleThemeChange);
    };
  }, []);

  const calloutProps: ICalloutProps = {
    target,
    directionalHint: DirectionalHint.topCenter,
  };

  return (
    <TooltipHost calloutProps={calloutProps} componentRef={tooltipRef} content={title} styles={tooltipHostStyles}>
      <button
        aria-label={title}
        className={css('msla-action-button-v2', className)}
        disabled={disabled}
        ref={buttonRef}
        onBlur={handleBlur}
        onClick={handleClick}
        onFocus={handleFocus}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}>
        <Plus fill={isInverted ? '#3AA0F3' : '#0078D4'} />
      </button>
    </TooltipHost>
  );
}
