import { calloutContentStyles, checkboxStyles } from '../fabric';
import type { ICheckbox } from '@fluentui/react';
import { Callout, Checkbox as FluentCheckbox, css, DirectionalHint, Icon } from '@fluentui/react';
import { useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useCheckboxStyles, useCheckboxDescriptionCalloutStyles } from './styles';

export interface CheckboxProps {
  ariaLabel?: string;
  className?: string;
  descriptionText?: string;
  disabled?: boolean;
  id?: string;
  initialChecked?: boolean;
  text?: string;
  onChange?(checked: boolean): void;
}

export interface CheckboxState {
  checkboxDescriptionExpanded: boolean;
  checked: boolean;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  ariaLabel,
  className,
  descriptionText,
  id,
  initialChecked = false,
  text,
  disabled,
  onChange,
}) => {
  const [checkboxDescriptionExpanded, setCheckboxDescriptionExpanded] = useState(false);
  const [checked, setChecked] = useState<boolean>(initialChecked);
  const checkboxDescriptionButtonRef = useRef<HTMLButtonElement | null>();
  const checkboxRef = useRef<ICheckbox>();
  const intl = useIntl();
  const classes = useCheckboxStyles();
  const calloutClasses = useCheckboxDescriptionCalloutStyles();

  const handleCheckboxDescriptionDismiss = () => {
    setCheckboxDescriptionExpanded(false);
  };

  const handleChange: React.MouseEventHandler<HTMLInputElement> = () => {
    setChecked(!checked);

    if (onChange) {
      onChange(checked);
    }
  };

  const handleCheckboxDescriptionButtonClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    setCheckboxDescriptionExpanded(!checkboxDescriptionExpanded);
  };

  const moreInfoMessage = intl.formatMessage({
    defaultMessage: 'More info',
    id: 'XY5SKM',
    description: 'Shown as an aria label on button and as the tooltip shown after you select the button.',
  });

  return (
    <div className={css(className, classes.root)}>
      <FluentCheckbox
        ariaLabel={ariaLabel}
        componentRef={(e) => (checkboxRef.current = e as any)}
        checked={checked}
        className={classes.label}
        id={id}
        label={text}
        styles={checkboxStyles}
        disabled={disabled}
        onChange={handleChange as any}
      />
      {descriptionText ? (
        <button
          ref={(ref) => (checkboxDescriptionButtonRef.current = ref)}
          aria-label={moreInfoMessage}
          className="msla-button msla-checkbox-description-icon-button"
          title={moreInfoMessage}
          onClick={handleCheckboxDescriptionButtonClick}
        >
          <Icon className="msla-checkbox-description-icon" iconName="Info" />
        </button>
      ) : null}
      {checkboxDescriptionExpanded ? (
        <Callout
          ariaLabel={descriptionText}
          className={calloutClasses.dialog}
          directionalHint={DirectionalHint.rightCenter}
          gapSpace={0}
          setInitialFocus={true}
          styles={calloutContentStyles}
          target={checkboxDescriptionButtonRef.current}
          onDismiss={handleCheckboxDescriptionDismiss}
        >
          <div data-is-focusable={true} role="dialog" tabIndex={0}>
            {descriptionText}
          </div>
        </Callout>
      ) : null}
    </div>
  );
};
