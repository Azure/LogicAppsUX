import type { EventHandler } from '../..';
import { SimpleDictionary } from './dictionary/simpledictionary';
import type { SettingProps } from './settingtoggle';
import { TextField } from '@fluentui/react';
import type { ITextFieldStyles } from '@fluentui/react';
import { isObject } from '@microsoft-logic-apps/utils';

export type InputChangeHandler = (event: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, newValue?: string) => void;

export interface SettingDictionaryProps extends SettingProps {
  values: any | Record<string, any>;
  onDictionaryChange?: EventHandler<Record<string, string> | undefined>;
  onTextFieldChange?: InputChangeHandler;
  label?: string;
}

export function SettingDictionary({
  values,
  readOnly,
  onDictionaryChange,
  onTextFieldChange,
  customLabel,
}: SettingDictionaryProps): JSX.Element | null {
  if (values === undefined || isObject(values)) {
    return <ValuesInDictionary values={values} readOnly={readOnly} onDictionaryChange={onDictionaryChange} customLabel={customLabel} />;
  } else {
    return <ValuesInTextField values={values} readOnly={readOnly} onTextFieldChange={onTextFieldChange} />;
  }
}

function ValuesInDictionary({ values, readOnly, onDictionaryChange, label, customLabel }: SettingDictionaryProps): JSX.Element {
  let valuesInDictionary: Record<string, string> = {};
  if (isObject(values)) {
    valuesInDictionary = {};
    for (const key of Object.keys(values)) {
      valuesInDictionary[key] = JSON.stringify(values[key]);
    }
  }

  return customLabel ? (
    <>
      {customLabel()}
      <div className="msla-operation-setting">
        <div className="msla-setting-row-dictionary-input">
          <SimpleDictionary
            disabled={readOnly}
            readOnly={readOnly}
            title={'Tracked Properties'}
            value={values}
            onChange={onDictionaryChange}
          />
        </div>
      </div>
    </>
  ) : (
    <div className="msla-operation-setting">
      <div className="msla-setting-row-dictionary-input">
        <SimpleDictionary disabled={readOnly} readOnly={readOnly} title={label} value={values} onChange={onDictionaryChange} />
      </div>
    </div>
  );
}

function ValuesInTextField({ values, readOnly, onTextFieldChange, customLabel, label }: SettingDictionaryProps): JSX.Element {
  const textFieldStyles: Partial<ITextFieldStyles> = {
    fieldGroup: { height: 24, width: '100%', display: 'inline', marginRight: 8 },
    wrapper: { display: 'inline-flex', width: '100%' },
  };
  // TODO (14725265) add check /support for ambiguous value types being passed in here
  const valuesInString = typeof values !== 'string' ? JSON.stringify(values) : values;
  return customLabel ? (
    <>
      {customLabel()}
      <TextField
        className="msla-setting-row-text-input"
        disabled={readOnly}
        value={valuesInString}
        onChange={onTextFieldChange}
        styles={textFieldStyles}
      />
    </>
  ) : (
    <div className="msla-setting-section-row">
      <TextField
        label={label}
        className="msla-setting-row-text-input"
        disabled={readOnly}
        value={valuesInString}
        onChange={onTextFieldChange}
        styles={textFieldStyles}
      />
    </div>
  );
}
