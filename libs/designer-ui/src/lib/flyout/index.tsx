import { DirectionalHint, FocusTrapCallout, ICalloutContentStyles } from '@fluentui/react/lib/Callout';
import { IFocusTrapZoneProps } from '@fluentui/react/lib/FocusTrapZone';
import { FontSizes, getTheme, mergeStyleSets } from '@fluentui/react/lib/Styling';
import { ITooltipHostStyles, TooltipHost } from '@fluentui/react/lib/Tooltip';
import * as React from 'react';

import InformationImage from '../card/images/information_tiny.svg';
import { Event, EventHandler } from '../eventhandler';
import { getDragStartHandlerWhenDisabled } from '../helper';

export interface FlyoutProps {
  ariaLabel?: string;
  iconStyle?: React.CSSProperties;
  style?: React.CSSProperties;
  tabIndex?: number;
  text: string;
  title?: string;
  tooltipHostStyles?: ITooltipHostStyles;
  clickHandler?: EventHandler<Event<Flyout>>;
}

export interface FlyoutState {
  flyoutExpanded: boolean;
}

const onDragStartWhenDisabled = getDragStartHandlerWhenDisabled();

const focusTrapProps: IFocusTrapZoneProps = { isClickableOutsideFocusTrap: true };

const calloutContentStyles: Partial<ICalloutContentStyles> = {
  calloutMain: {
    fontSize: FontSizes.small,
    whiteSpace: 'pre-line',
    width: 160,
  },
};

const defaultTooltipHostStyles: ITooltipHostStyles = {
  root: {
    display: 'inline-flex',
  },
};

export class Flyout extends React.Component<FlyoutProps, FlyoutState> {
  static defaultProps = {
    tabIndex: 0,
  };

  private _buttonRef = React.createRef<HTMLButtonElement>();

  state = {
    flyoutExpanded: false,
  };

  render(): JSX.Element {
    const { ariaLabel, iconStyle, style, tabIndex, text, tooltipHostStyles } = this.props;
    const { flyoutExpanded } = this.state;
    const styles = mergeStyleSets(defaultTooltipHostStyles, tooltipHostStyles);

    return (
      <TooltipHost content={ariaLabel} styles={styles}>
        <button
          ref={this._buttonRef}
          aria-label={ariaLabel}
          className="msla-button msla-flyout"
          style={style}
          tabIndex={tabIndex}
          onClick={this._handleFlyoutClick}
        >
          <img
            alt=""
            className="msla-flyout-icon"
            draggable={false}
            role="presentation"
            style={iconStyle}
            src={InformationImage}
            onDragStart={onDragStartWhenDisabled}
          />
          <FlyoutCallout target={this._buttonRef.current} text={text} visible={flyoutExpanded} onDismiss={this._handleDismiss} />
        </button>
      </TooltipHost>
    );
  }

  collapseFlyout(): void {
    this.setState({
      flyoutExpanded: false,
    });
  }

  private _handleDismiss = (): void => {
    this.setState({
      flyoutExpanded: false,
    });
  };

  private _handleFlyoutClick: React.MouseEventHandler<HTMLElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const { flyoutExpanded } = this.state;
    this.setState({
      flyoutExpanded: !flyoutExpanded,
    });

    const { clickHandler } = this.props;
    if (clickHandler) {
      clickHandler({
        currentTarget: this,
      });
    }
  };
}

interface FlyoutCalloutProps {
  target: HTMLElement | null;
  text: string;
  visible: boolean;
  onDismiss(): void;
}

class FlyoutCallout extends React.Component<FlyoutCalloutProps> {
  render(): JSX.Element | null {
    const { visible } = this.props;
    if (!visible) {
      return null;
    }

    const { target, text, onDismiss } = this.props;
    const palette = getTheme().palette;

    return (
      <FocusTrapCallout
        ariaLabel={text}
        beakWidth={8}
        className="msla-flyout-callout"
        directionalHint={DirectionalHint.rightTopEdge}
        focusTrapProps={focusTrapProps}
        gapSpace={0}
        setInitialFocus={true}
        styles={calloutContentStyles}
        target={target}
        onDismiss={onDismiss}
      >
        <div role="dialog" style={{ color: palette.neutralPrimary }} data-is-focusable={true} tabIndex={0}>
          {text}
        </div>
      </FocusTrapCallout>
    );
  }
}
