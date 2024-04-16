import type { ITextFieldStyles } from '@fluentui/react';
import { Label, TextField } from '@fluentui/react';
import { useState } from 'react';
import { useIntl } from 'react-intl';

interface BaseTextProps {
  label: string;
  required: boolean;
  initialValue: string | undefined;
  placeholder: string;
  className?: string;
  readOnly?: boolean;
  isInteger?: boolean;
}

interface TextProps extends BaseTextProps {
  onChange: (newValue: string) => void;
}

const textFieldStyles: Partial<ITextFieldStyles> = {
  fieldGroup: { height: 28, width: '100%' },
  wrapper: { display: 'inline-flex', width: '100%', maxHeight: 40, alignItems: 'center' },
};

export const TextInput = ({
  label,
  required,
  initialValue,
  placeholder,
  onChange,
  className,
  readOnly,
  isInteger = false,
}: TextProps): JSX.Element => {
  const [value, setValue] = useState<string>(initialValue ?? '');
  const [errorMessage, setErrorMessage] = useState('');
  const intl = useIntl();

  const updateValue = (newValue?: string) => {
    if (isInteger && Number.isNaN(newValue as any)) {
      setValue(value ?? '');
      setErrorMessage(
        intl.formatMessage({
          defaultMessage: 'Invalid integer value',
          id: 'oR2x4N',
          description: 'Error message for invalid integer value',
        })
      );
    } else {
      setValue(newValue ?? '');
      setErrorMessage('');
    }
  };

  return (
    <div className={className}>
      <div className="msla-input-parameter-label">
        <Label className={'msla-label'} required={required}>
          {label}
        </Label>
      </div>
      <TextField
        ariaLabel={label}
        value={value}
        placeholder={placeholder}
        styles={textFieldStyles}
        readOnly={readOnly}
        onChange={(_, value) => updateValue(value)}
        onBlur={() => {
          if (errorMessage) {
            setErrorMessage('');
          }
          onChange(value ?? '');
        }}
        errorMessage={errorMessage}
      />
    </div>
  );
};

interface MinuteTextProps extends BaseTextProps {
  onChange: (newValue: number[]) => void;
}

export const MinuteTextInput = ({
  label,
  required,
  initialValue = '',
  placeholder,
  onChange,
  className,
  readOnly,
}: MinuteTextProps): JSX.Element => {
  const intl = useIntl();
  const [value, setValue] = useState<string>(initialValue);
  const getErrorMessage = (input: number[]): string => {
    if (input.includes(Number.NaN)) {
      return intl.formatMessage({
        defaultMessage: 'This contains an invalid value',
        id: 'i4Om5O',
        description: 'Error message for invalid integer array',
      });
    }
    if (input.some((value, index) => input.indexOf(value) !== index)) {
      return intl.formatMessage({
        defaultMessage: 'This contains a duplicate value',
        id: 'vxOc/M',
        description: 'Error message for duplicate integer array',
      });
    }
    if (input.some((value) => value < 0 || value > 59)) {
      return intl.formatMessage({
        defaultMessage: 'This contains a value that is not between 0 and 59',
        id: 'GEB1on',
        description: 'Error message for invalid minute array',
      });
    }
    return '';
  };

  const [errorMessage, setErrorMessage] = useState(getErrorMessage(convertStringToNumberArray(initialValue)));

  const updateValue = (newValue?: string) => {
    const numberArray = convertStringToNumberArray(newValue ?? '');
    setErrorMessage(getErrorMessage(numberArray));
    setValue(newValue ?? '');
  };

  return (
    <div className={className}>
      <div className="msla-input-parameter-label">
        <Label className={'msla-label'} required={required}>
          {label}
        </Label>
      </div>
      <TextField
        ariaLabel={label}
        value={value}
        placeholder={placeholder}
        styles={textFieldStyles}
        readOnly={readOnly}
        onChange={(_, value) => updateValue(value)}
        onBlur={() => {
          if (!errorMessage) {
            onChange(convertStringToNumberArray(value));
          }
        }}
        errorMessage={errorMessage}
      />
    </div>
  );
};

const convertStringToNumberArray = (value: string): number[] => {
  let newValue = value;
  if (newValue.startsWith('[') && newValue.endsWith(']')) {
    newValue = newValue.replace(/^\[|\]$/g, '');
  }
  return newValue
    .split(',')
    .map((item) => item.trim())
    .map((str) => {
      if (str === '' && newValue.split(',').length > 1) {
        return Number.NaN;
      }
      return Number(str);
    });
};
