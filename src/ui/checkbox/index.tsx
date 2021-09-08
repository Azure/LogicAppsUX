import { css } from "@fluentui/react";
import { Callout, DirectionalHint } from "@fluentui/react/lib/Callout";
import {
  Checkbox as FabricCheckbox,
  ICheckbox,
} from "@fluentui/react/lib/Checkbox";
import { Icon } from "@fluentui/react/lib/Icon";
import * as React from "react";
import { FormattedMessage } from "react-intl";
import { calloutContentStyles, checkboxStyles } from "../fabric";
import "./checkbox.less";
export interface CheckboxProps {
  ariaLabel?: string;
  className?: string;
  descriptionText?: string;
  disabled?: boolean;
  id?: string;
  initChecked?: boolean;
  text?: string;
  onChange?(checked: boolean): void;
}

export interface CheckboxState {
  checkboxDescriptionExpanded: boolean;
  checked: boolean;
}

export class Checkbox extends React.Component<CheckboxProps, CheckboxState> {
  private _checkboxDescriptionButtonRef = React.createRef<HTMLButtonElement>();
  private _checkboxRef: ICheckbox | undefined;

  private moreInfoMessage = (
    <FormattedMessage
      id="checkbox_more_info_message"
      description="More Info Tooltip title for a checkbox"
      defaultMessage="More Info Too"
    />
  );
  constructor(props: CheckboxProps) {
    super(props);

    this.state = {
      checkboxDescriptionExpanded: false,
      checked: props.initChecked as any,
    };
  }

  focus(): void {
    if (this._checkboxRef) {
      this._checkboxRef.focus();
    }
  }

  render(): JSX.Element {
    const { ariaLabel, className, id, text, disabled } = this.props;
    const { checked } = this.state;

    return (
      <div className={css(className, "msla-checkbox")}>
        <FabricCheckbox
          ariaLabel={ariaLabel}
          componentRef={(e) => (this._checkboxRef = e as any)}
          checked={checked}
          className="msla-checkbox-label"
          id={id}
          label={text}
          styles={checkboxStyles}
          disabled={disabled}
          onChange={this._handleChange as any}
        />
        {this._renderCheckboxDescriptionButton()}
        {this._renderCheckboxDescription()}
      </div>
    );
  }

  private _renderCheckboxDescription(): JSX.Element | null {
    if (!this.state.checkboxDescriptionExpanded) {
      return null;
    }

    const { descriptionText } = this.props;
    return (
      <Callout
        ariaLabel={descriptionText}
        className="msla-checkbox-description-callout"
        directionalHint={DirectionalHint.rightCenter}
        gapSpace={0}
        setInitialFocus={true}
        styles={calloutContentStyles}
        target={this._checkboxDescriptionButtonRef.current}
        onDismiss={this._handleCheckboxDescriptionDismiss}
      >
        <div data-is-focusable={true} role="dialog" tabIndex={0}>
          {descriptionText}
        </div>
      </Callout>
    );
  }

  private _renderCheckboxDescriptionButton(): JSX.Element | null {
    if (!this.props.descriptionText) {
      return null;
    }

    return (
      <button
        ref={this._checkboxDescriptionButtonRef}
        aria-label={"More Info"}
        className="msla-button msla-checkbox-description-icon-button"
        title={"More Info"}
        onClick={this._handleCheckboxDescriptionButtonClick}
      >
        <Icon className="msla-checkbox-description-icon" iconName="Info" />
      </button>
    );
  }

  private _handleChange: React.MouseEventHandler<HTMLInputElement> = () => {
    const checked = !this.state.checked;

    this.setState({
      checked,
    });

    const { onChange } = this.props;
    if (onChange) {
      onChange(checked);
    }
  };

  private _handleCheckboxDescriptionButtonClick: React.MouseEventHandler<HTMLButtonElement> = (
    e
  ) => {
    e.preventDefault();

    this.setState({
      checkboxDescriptionExpanded: !this.state.checkboxDescriptionExpanded,
    });
  };

  private _handleCheckboxDescriptionDismiss = (): void => {
    this.setState({
      checkboxDescriptionExpanded: false,
    });
  };
}
