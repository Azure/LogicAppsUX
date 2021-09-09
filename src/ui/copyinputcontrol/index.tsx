import { IButton, IconButton } from '@fluentui/react/lib/Button';
import { ITextField, TextField } from '@fluentui/react/lib/TextField';
import { TooltipHost } from '@fluentui/react/lib/Tooltip';
import * as React from 'react';
import { findDOMNode } from 'react-dom';
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

class CopyInputControlInner extends React.Component<CopyInputControlProps & WrappedComponentProps<'intl'>> {
  private _buttonRef = React.createRef<IButton>();
  private _textFieldRef = React.createRef<ITextField>();
  private _copyInputContainer = React.createRef<HTMLDivElement>();

  render(): JSX.Element {
    const { ariaLabelledBy, placeholderText, text } = this.props;
    const disabled = this._isDisabled();

    
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
        <TooltipHost
          calloutProps={{ target: findDOMNode(this._buttonRef.current as unknown as React.ReactInstance) as Element }}
          content={'CHANGE ME'}>
          <IconButton
            ariaLabel={'CHANGE ME'}
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

export const CopyInputControl = injectIntl<'intl', CopyInputControlProps & WrappedComponentProps<'intl'>>(CopyInputControlInner);
