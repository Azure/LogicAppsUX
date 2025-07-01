import { Field, Input } from '@fluentui/react-components';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { Label } from '../label';
import { useStyles } from './textInput.styles';

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
  const styles = useStyles();

  const updateValue = (newValue?: string) => {
    if (isInteger && Number.isNaN(Number(newValue))) {
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

  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    updateValue(ev.target.value);
  };

  const handleBlur = () => {
    if (errorMessage) {
      setErrorMessage('');
    }
    onChange(value ?? '');
  };

  return (
    <div className={`${styles.root} ${className || ''}`}>
      <div className={styles.labelContainer}>
        <Label text={label} isRequiredField={required} />
      </div>
      <Field validationMessage={errorMessage} validationState={errorMessage ? 'error' : 'none'} required={required}>
        <Input
          className={styles.input}
          aria-label={label}
          value={value}
          placeholder={placeholder}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </Field>
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
  const styles = useStyles();
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

  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    updateValue(ev.target.value);
  };

  const handleBlur = () => {
    if (!errorMessage) {
      onChange(convertStringToNumberArray(value));
    }
  };

  return (
    <div className={`${styles.root} ${className || ''}`}>
      <div className={styles.labelContainer}>
        <Label text={label} isRequiredField={required} />
      </div>
      <Field validationMessage={errorMessage} validationState={errorMessage ? 'error' : 'none'} required={required}>
        <Input
          className={styles.input}
          aria-label={label}
          value={value}
          placeholder={placeholder}
          readOnly={readOnly}
          disabled={readOnly}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </Field>
    </div>
  );
};

const convertStringToNumberArray = (value: string): number[] => {
  let newValue = value;
  if (!newValue.trim()) {
    return [];
  }
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
