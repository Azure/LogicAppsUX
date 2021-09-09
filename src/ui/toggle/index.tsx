import { ActionButton, IButtonStyles } from '@fluentui/react/lib/Button';
import { IIconProps } from '@fluentui/react/lib/Icon';
import { FontSizes } from '@fluentui/react/lib/Styling';
import * as React from 'react';
import { FormattedMessage } from 'react-intl';

import { BaseComponent, BaseComponentProps } from '../base';
import Constants from '../constants';

export interface ToggleProps extends BaseComponentProps {
  buttonClassName?: string;
  collapseIcon?: Readonly<IIconProps>;
  collapseText?: string;
  expanded: boolean;
  expandIcon?: Readonly<IIconProps>;
  expandText?: string;
  iconProps?: Readonly<IIconProps>;
  onClick?(): void;
}

const styles: IButtonStyles = {
  flexContainer: {
    flexDirection: 'row-reverse',
  },
  root: {
    fontSize: FontSizes.small,
  },
};

export class Toggle extends BaseComponent<ToggleProps> {
  static defaultProps = {
    buttonClassName: 'msla-button msla-input-parameters-show-more',
    collapseIcon: {
      iconName: 'ChevronUp',
    },
    collapseText: <FormattedMessage id="Asi2Jg" defaultMessage="Hide advanced options" />,
    expandIcon: {
      iconName: 'ChevronDown',
    },
    expandText: <FormattedMessage id="lIEejV" defaultMessage="Show advanced options" />,
    iconProps: {
      styles: {
        root: {
          fontSize: FontSizes.small,
          marginLeft: 5,
        },
      },
    },
  };

  render() {
    const { buttonClassName, collapseIcon, collapseText, expanded, expandIcon, expandText } = this.props;

    const iconProps = {
      ...this.props.iconProps,
      ...(expanded ? collapseIcon : expandIcon),
    };

    const text = expanded ? collapseText : expandText;

    return (
      <ActionButton
        aria-expanded={expanded}
        aria-pressed={expanded}
        className={buttonClassName}
        iconProps={iconProps}
        styles={styles}
        onClick={this._handleClick}>
        {text}
      </ActionButton>
    );
  }

  protected get telemetryIdentifier(): string {
    return Constants.TELEMETRY_IDENTIFIERS.TOGGLE;
  }

  protected getTelemetryContext() {
    return {
      ...super.getTelemetryContext(),
      expanded: this.props.expanded,
      className: this.props.buttonClassName,
    };
  }

  private _handleClick = (): void => {
    this.handleClickEvent();
    const { onClick } = this.props;
    if (onClick) {
      onClick();
    }
  };
}
