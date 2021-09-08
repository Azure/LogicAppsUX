import { DirectionalHint, ICalloutProps } from '@fluentui/react/lib/Callout';
import { getTheme, ITheme, registerOnThemeChangeCallback, removeOnThemeChangeCallback } from '@fluentui/react/lib/Styling';
import { ITooltipHost, ITooltipHostStyles, TooltipHost } from '@fluentui/react/lib/Tooltip';
import { css } from '@fluentui/react/lib/Utilities';
import * as React from 'react';
import { findDOMNode } from 'react-dom';

import { BaseComponentProps } from '../base';
import Constants from '../constants';
import { UserAction } from '../telemetry/models';
import { Plus } from './images/plus';
import './actionbuttonv2.less';

export interface ActionButtonV2Props extends BaseComponentProps {
    buttonRef?: React.RefObject<HTMLButtonElement>;
    className?: string;
    disabled?: boolean;
    title: string;
    onClick?(e: React.MouseEvent<HTMLElement>): void;
}

// NOTE(joechung): Set tooltip host's CSS display to inline-block to work around an IE positioning bug.
const tooltipHostStyles: ITooltipHostStyles = {
    root: {
        display: 'inline-block'
    }
};

export function ActionButtonV2({ buttonRef, className, disabled = false, title, trackEvent, onClick }: ActionButtonV2Props): JSX.Element {
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
        trackEvent({
            action: UserAction.click,
            controlId: Constants.TELEMETRY_IDENTIFIERS.ACTIONBUTTONV2
        });

        if (onClick) {
            onClick(e);
        }
    }

    function handleFocus(e: React.FocusEvent<HTMLButtonElement>): void {
        e.preventDefault();

        // NOTE(sopai): Use focus events instead of element target to work around a possible multi-instance Fabric Callout bug.
        const focusTarget = e.target;
        const element = findDOMNode(buttonRef?.current as unknown as React.ReactInstance) as Element;
        const tooltipTarget = !focusTarget ? element : focusTarget;
        setTarget(tooltipTarget);
    }

    function handleMouseEnter(e: React.MouseEvent<HTMLButtonElement>): void {
        e.preventDefault();

        // NOTE(sopai): Use mouse events instead of element target to work around a possible multi-instance Fabric Callout bug.
        const mouseEvent = e.nativeEvent;
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

    React.useEffect(() => {
        registerOnThemeChangeCallback(handleThemeChange);
        return () => {
            removeOnThemeChangeCallback(handleThemeChange);
        };
    }, []);

    const calloutProps: ICalloutProps = {
        target,
        directionalHint: DirectionalHint.topCenter
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
                onMouseLeave={handleMouseLeave}
            >
                <Plus fill={isInverted ? '#3AA0F3' : '#0078D4'} />
            </button>
        </TooltipHost>
    );
}
