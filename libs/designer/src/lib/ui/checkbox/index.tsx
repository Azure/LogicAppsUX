import { css } from '@fluentui/react';
import { Callout, DirectionalHint } from '@fluentui/react/lib/Callout';
import { Checkbox as FabricCheckbox, ICheckbox } from '@fluentui/react/lib/Checkbox';
import { Icon } from '@fluentui/react/lib/Icon';
import * as React from 'react';
import { useState, useRef } from 'react';
import { useIntl } from 'react-intl';
import { calloutContentStyles, checkboxStyles } from '../fabric';
import { getDurationString } from '../utils/utils';

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

export const Checkbox = (props: CheckboxProps) => {
  const [checkboxDescriptionExpanded, setCheckboxDescriptionExpanded] = useState(false);
  const [checked, setChecked] = useState<boolean>(!!props.initChecked);
  const checkboxDescriptionButtonRef = useRef<HTMLButtonElement | null>();
  const checkboxRef = useRef<ICheckbox>();
  const intl = useIntl();

  const handleCheckboxDescriptionDismiss = (): void => {
    setCheckboxDescriptionExpanded(false);
  };

  const handleChange: React.MouseEventHandler<HTMLInputElement> = () => {
    setChecked(!checked);

    const { onChange } = props;
    if (onChange) {
      onChange(checked);
    }
  };

  const handleCheckboxDescriptionButtonClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    setCheckboxDescriptionExpanded(!checkboxDescriptionExpanded);
  };

  const { ariaLabel, className, id, text, disabled } = props;

  const moreInfoMessage = intl.formatMessage({
    defaultMessage: 'More Info',
  });
  return (
    <div className={css(className, 'msla-checkbox')}>
      <FabricCheckbox
        ariaLabel={ariaLabel}
        componentRef={(e) => (checkboxRef.current = e as any)}
        checked={checked}
        className="msla-checkbox-label"
        id={id}
        label={text + ' ' + getDurationString(1500, false)}
        styles={checkboxStyles}
        disabled={disabled}
        onChange={handleChange as any}
      />
      {props.descriptionText ? (
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
          ariaLabel={props.descriptionText}
          className="msla-checkbox-description-callout"
          directionalHint={DirectionalHint.rightCenter}
          gapSpace={0}
          setInitialFocus={true}
          styles={calloutContentStyles}
          target={checkboxDescriptionButtonRef.current}
          onDismiss={handleCheckboxDescriptionDismiss}
        >
          <div data-is-focusable={true} role="dialog" tabIndex={0}>
            {props.descriptionText}
          </div>
        </Callout>
      ) : null}
    </div>
  );
};
