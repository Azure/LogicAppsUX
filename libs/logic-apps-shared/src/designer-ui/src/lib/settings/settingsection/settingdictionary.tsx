import type { EventHandler } from '../..';
import { SimpleDictionary } from './dictionary/simpledictionary';
import type { SettingProps } from './settingtoggle';
import { TextField } from '@fluentui/react';
import type { ITextFieldStyles } from '@fluentui/react';
import { isObject } from '@microsoft/utils-logic-apps';

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
  } else {
    return <ValuesInTextField values={values} readOnly={readOnly} onTextFieldChange={onTextFieldChange} ariaLabel={ariaLabel} />;
  }
}

function ValuesInDictionary({ values, readOnly, onDictionaryChange, customLabel, ariaLabel }: SettingDictionaryProps): JSX.Element {
  return (
    <div className="msla-operation-setting">
      <div className="msla-setting-row-dictionary-input">
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
  const textFieldStyles: Partial<ITextFieldStyles> = {
    fieldGroup: { height: 24, width: '100%', display: 'inline', marginRight: 8 },
    wrapper: { display: 'inline-flex', width: '100%' },
  };
  // TODO (14725265) add check /support for ambiguous value types being passed in here
  const valuesInString = typeof values !== 'string' ? JSON.stringify(values) : values;
  const handleTextFieldChange: InputChangeHandler = (ev, newVal) => {
    if (newVal) {
      onTextFieldChange?.(ev, newVal);
    }
  };

  return (
    <>
      {customLabel ? customLabel : null}
      <TextField
        className="msla-setting-row-text-input"
        disabled={readOnly}
        value={valuesInString}
        onChange={handleTextFieldChange}
        styles={textFieldStyles}
        ariaLabel={ariaLabel}
      />
    </>
  );
}
