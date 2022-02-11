import { IButton, IconButton, IIconProps, ITextField, TextField, TooltipHost } from '@fluentui/react';
import { useConst } from '@fluentui/react-hooks';
import * as React from 'react';
import { useIntl } from 'react-intl';

export interface CopyInputControlProps {
  ariaLabelledBy?: string;
  placeholder: string;
  text: string;
  onCopy?(): void;
}

const iconProps: IIconProps = {
  iconName: 'Copy',
};

export const CopyInputControl = React.forwardRef<Pick<HTMLElement, 'focus' | 'scrollIntoView'>, CopyInputControlProps>(
  ({ ariaLabelledBy, placeholder, text, onCopy }, ref) => {
    const disabled = useConst(() => {
      try {
        return !document.queryCommandSupported('Copy');
      } catch {
        return true;
      }
    });
    const intl = useIntl();
    const buttonRef = React.useRef<IButton | null>(null);
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const textFieldRef = React.useRef<ITextField | null>(null);

    React.useImperativeHandle(ref, () => ({
      focus() {
        buttonRef.current?.focus();
      },
      scrollIntoView(options?: boolean | ScrollIntoViewOptions) {
        containerRef.current?.scrollIntoView(options);
      },
    }));

    const DISPLAY_TEXT_COPY_URL = intl.formatMessage({
      defaultMessage: 'Copy URL',
      description: 'ARIA label and tooltip text for the copy button',
    });

    const handleClick = () => {
      const textbox = textFieldRef.current;
      if (textbox) {
        textbox.focus();
        textbox.setSelectionRange(0, textbox.value?.length ?? 0);
        document.execCommand('Copy');
      }

      onCopy?.();
    };

    return (
      <div className="msla-copy-input-control" ref={(container) => (containerRef.current = container)}>
        <TextField
          aria-labelledby={ariaLabelledBy}
          className="msla-copy-input-control-textbox"
          componentRef={(textField) => (textFieldRef.current = textField)}
          placeholder={placeholder}
          readOnly
          value={text}
        />
        <TooltipHost content={DISPLAY_TEXT_COPY_URL}>
          <IconButton
            ariaLabel={DISPLAY_TEXT_COPY_URL}
            componentRef={(button) => (buttonRef.current = button)}
            disabled={disabled}
            iconProps={iconProps}
            onClick={handleClick}
          />
        </TooltipHost>
      </div>
    );
  }
);

CopyInputControl.displayName = 'CopyInputControl';
