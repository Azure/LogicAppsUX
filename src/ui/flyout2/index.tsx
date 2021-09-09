import { Callout } from '@fluentui/react/lib/Callout';
import { DirectionalHint } from '@fluentui/react/lib/common/DirectionalHint';
import * as React from 'react';

import { BaseComponent, BaseComponentProps } from '../base';
import InformationImage from '../card/images/information_tiny.svg';
import Constants from '../constants';
import { calloutContentStyles } from '../fabric';
import { getDragStartHandlerWhenDisabled } from '../helper';
import { DocLinkClickedEventHandler, DocumentationLinkItem } from '../recommendation';
import '../flyout/flyout.less';

export interface Flyout2Props extends BaseComponentProps {
  ariaLabel?: string;
  docLink?: Swagger.ExternalDocumentation;
  flyoutExpanded: boolean;
  flyoutKey: string;
  tabIndex?: number;
  text: string;
  title?: string;
  onClick?: FlyoutSelectedEventHandler;
  onDocLinkClick?: DocLinkClickedEventHandler;
}

export interface FlyoutSelectedEventArgs {
  key: string;
}

export type FlyoutSelectedEventHandler = (e: FlyoutSelectedEventArgs) => void;

interface FlyoutBalloonProps extends BaseComponentProps {
  docLink?: Swagger.ExternalDocumentation;
  flyoutExpanded: boolean;
  target: HTMLElement;
  text: string;
  onClick?: FlyoutSelectedEventHandler;
  onDocLinkClick?: DocLinkClickedEventHandler;
}

const onDragStartWhenDisabled = getDragStartHandlerWhenDisabled();

export class Flyout2 extends BaseComponent<Flyout2Props, {}> {
  private _icon: HTMLElement | undefined | null;

  render() {
    const { ariaLabel, docLink, title, flyoutExpanded, text, trackEvent, onClick, onDocLinkClick } = this.props;
    const tabIndex = this.props.tabIndex === undefined ? 0 : this.props.tabIndex;
    return (
      <button
        aria-label={ariaLabel}
        className="msla-button msla-flyout"
        tabIndex={tabIndex}
        title={title}
        onClick={this._handleClick}
        onKeyPress={this._handleEnterKeyPress}>
        <img
          alt=""
          className="msla-flyout-icon"
          draggable={false}
          ref={(icon) => (this._icon = icon)}
          role="presentation"
          src={InformationImage}
          onDragStart={onDragStartWhenDisabled}
        />
        <FlyoutBalloon
          flyoutExpanded={flyoutExpanded}
          target={this._icon!}
          text={text}
          trackEvent={trackEvent}
          docLink={docLink}
          onClick={onClick}
          onDocLinkClick={onDocLinkClick}
        />
      </button>
    );
  }

  protected get telemetryIdentifier(): string {
    return Constants.TELEMETRY_IDENTIFIERS.FLYOUT;
  }

  protected getTelemetryContext() {
    const { title, text } = this.props;
    return {
      ...super.getTelemetryContext(),
      title,
      text,
    };
  }

  private _handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    this._handleClickOrEnterKeyPress(e);
  };

  private _handleEnterKeyPress = (e: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (e.which === Constants.KEYS.ENTER) {
      this._handleClickOrEnterKeyPress(e);
    }
  };

  private _handleClickOrEnterKeyPress(e: React.KeyboardEvent<HTMLButtonElement> | React.MouseEvent<HTMLButtonElement>): void {
    e.preventDefault();
    e.stopPropagation();
    this.handleClickEvent(e);
    const { onClick } = this.props;
    if (onClick) {
      const { flyoutExpanded, flyoutKey } = this.props;
      const key = flyoutExpanded ? '' : flyoutKey;
      onClick({ key });
    }
  }
}

function FlyoutBalloon(props: FlyoutBalloonProps) {
  function handleDismiss() {
    const { onClick } = props;
    if (onClick) {
      onClick({ key: '' });
    }
  }

  function renderDocLink() {
    const { docLink, trackEvent, onDocLinkClick } = props;
    if (docLink) {
      return <DocumentationLinkItem description={docLink.description} trackEvent={trackEvent} url={docLink.url} onClick={onDocLinkClick} />;
    }
  }

  const { flyoutExpanded } = props;
  if (!flyoutExpanded) {
    return null;
  }

  const { target, text } = props;
  return (
    <Callout
      beakWidth={8}
      className="msla-flyout-callout"
      directionalHint={DirectionalHint.rightTopEdge}
      gapSpace={0}
      setInitialFocus={true}
      styles={calloutContentStyles}
      target={target}
      onDismiss={handleDismiss}>
      <div aria-label={text} data-is-focusable={true} role="dialog" tabIndex={0}>
        {text}
        {renderDocLink()}
      </div>
    </Callout>
  );
}
