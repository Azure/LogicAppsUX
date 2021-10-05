import * as React from 'react';

import InformationIcon from './images/information.svg';
import Constants from '../constants';

export interface ActionButtonProps {
  ariaLabel?: string;
  disabled?: boolean;
  icon?: string;
  infoBalloon?: string;
  selected?: boolean;
  text: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
}

export class ActionButton extends React.PureComponent<ActionButtonProps> {
  render(): JSX.Element {
    const { ariaLabel, disabled, icon, infoBalloon, selected, text } = this.props;

    let iconControl: JSX.Element | undefined;
    if (icon) {
      iconControl = <img src={icon} className="icon" alt="" />;
    }

    let infoBalloonControl: JSX.Element | undefined;
    if (infoBalloon) {
      infoBalloonControl = <img src={InformationIcon} alt={infoBalloon} title={infoBalloon} />;
    }

    let className = 'msla-button msla-action-button';
    if (selected) {
      className += ' selected';
    }

    return (
      <button aria-label={ariaLabel} className={className} disabled={disabled} onClick={this._handleClick}>
        {iconControl}
        <div className="msla-action-button-text">{text}</div>
        <span className="info-balloon">{infoBalloonControl}</span>
      </button>
    );
  }

  protected get telemetryIdentifier(): string {
    return Constants.TELEMETRY_IDENTIFIERS.ACTIONBUTTON;
  }

  private _handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();

    const { onClick } = this.props;
    if (onClick) {
      onClick(e);
    }
  };
}
