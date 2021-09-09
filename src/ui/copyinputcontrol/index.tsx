import { IButton, IconButton } from '@fluentui/react/lib/Button';
import { ITextField, TextField } from '@fluentui/react/lib/TextField';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import * as React from 'react';
import { injectIntl, WrappedComponentProps } from 'react-intl';
type IIconProps = import('@fluentui/react/lib/Icon').IIconProps;

export interface CopyInputControlProps {
  ariaLabelledBy?: string;
  placeholderText: string;
  text: string;
  onCopy?(): void;
}

const iconProps: IIconProps = {
  iconName: 'Copy',
};

export class InnerClassCopyInput extends React.Component<CopyInputControlProps & WrappedComponentProps<'intl'>> {
  private _buttonRef = React.createRef<IButton>();
  private _textFieldRef = React.createRef<ITextField>();
  private _copyInputContainer = React.createRef<HTMLDivElement>();

  render(): JSX.Element {
    const { ariaLabelledBy, placeholderText, text, intl } = this.props;
    const disabled = this._isDisabled();

    const DISPLAY_TEXT_COPY_URL = intl.formatMessage({
      defaultMessage: 'Copy URL',
      id: 'P8QaSQ',
    });

    return (
      <div className="msla-copy-input-control" ref={this._copyInputContainer}>
        <TextField
          componentRef={this._textFieldRef}
          aria-labelledby={ariaLabelledBy}
          className="msla-copy-input-control-textbox"
          placeholder={placeholderText}
          readOnly
          value={text}
        />
        <TooltipHost content={DISPLAY_TEXT_COPY_URL}>
          <IconButton
            ariaLabel={DISPLAY_TEXT_COPY_URL}
            componentRef={this._buttonRef}
            disabled={disabled}
            iconProps={iconProps}
            onClick={this._handleClick}
          />
        </TooltipHost>
      </div>
    );
  }

  focus(): void {
    if (this._buttonRef.current) {
      this._buttonRef.current.focus();
    }
  }

  scrollIntoView(options?: boolean | ScrollIntoViewOptions): void {
    if (this._copyInputContainer.current) {
      this._copyInputContainer.current.scrollIntoView(options);
    }
  }

  private _isDisabled(): boolean {
    try {
      return !document.queryCommandSupported('Copy');
    } catch {
      return true;
    }
  }

  private _handleClick = (): void => {
    const textbox = this._textFieldRef.current;
    if (textbox) {
      textbox.focus();
      textbox.setSelectionRange(0, textbox?.value?.length ?? 0);
      document.execCommand('Copy');
    }

    const { onCopy } = this.props;
    if (onCopy) {
      onCopy();
    }
  };
}

export const CopyInputControl = injectIntl<'intl', CopyInputControlProps & WrappedComponentProps<'intl'>>(InnerClassCopyInput);
