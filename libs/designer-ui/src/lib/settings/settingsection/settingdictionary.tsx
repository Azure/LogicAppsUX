import type { EventHandler } from '../..';
import type { SettingProps } from './';
import { SimpleDictionary } from './dictionary/simpledictionary';
import { Input } from '@fluentui/react-components';
import { isObject } from '@microsoft/logic-apps-shared';
import { useStyles } from './settingdictionary.styles';

export type InputChangeHandler = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => void;

export interface SettingDictionaryProps extends SettingProps {
  values: any | Record<string, any>;
  onDictionaryChange?: EventHandler<Record<string, string> | undefined>;
  onTextFieldChange?: InputChangeHandler;
}

export function SettingDictionary({
  values,
  readOnly,
  onDictionaryChange,
  onTextFieldChange,
  ariaLabel,
  customLabel,
}: SettingDictionaryProps): JSX.Element | null {
  if (values === undefined || isObject(values)) {
    return (
      <ValuesInDictionary
        values={values}
        readOnly={readOnly}
        onDictionaryChange={onDictionaryChange}
        ariaLabel={ariaLabel}
        customLabel={customLabel}
      />
    );
  }
  return <ValuesInTextField values={values} readOnly={readOnly} onTextFieldChange={onTextFieldChange} ariaLabel={ariaLabel} />;
}

function ValuesInDictionary({ values, readOnly, onDictionaryChange, customLabel, ariaLabel }: SettingDictionaryProps): JSX.Element {
  const styles = useStyles();
  return (
    <div className={styles.dictionaryContainer}>
      <div className={styles.dictionaryWrapper}>
        <SimpleDictionary
          disabled={readOnly}
          readOnly={readOnly}
          customLabel={customLabel}
          value={values}
          onChange={onDictionaryChange}
          ariaLabel={ariaLabel}
        />
      </div>
    </div>
  );
}

function ValuesInTextField({ values, readOnly, onTextFieldChange, customLabel, ariaLabel }: SettingDictionaryProps): JSX.Element {
  const styles = useStyles();
  // TODO (14725265) add check /support for ambiguous value types being passed in here
  const valuesInString = typeof values !== 'string' ? JSON.stringify(values) : values;

  const handleTextFieldChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = ev.target.value;
    if (newVal !== undefined) {
      onTextFieldChange?.(ev, newVal);
    }
  };

  return (
    <div className={styles.root}>
      {customLabel ? customLabel : null}
      <div className={styles.textFieldWrapper}>
        <Input
          className={styles.textField}
          disabled={readOnly}
          value={valuesInString}
          onChange={handleTextFieldChange}
          aria-label={ariaLabel}
        />
      </div>
    </div>
  );
}
