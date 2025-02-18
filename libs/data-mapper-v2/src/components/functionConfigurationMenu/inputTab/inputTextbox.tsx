import { Tooltip, Textarea } from '@fluentui/react-components';
import { useDebouncedCallback } from '@react-hookz/web';
import { useState, useEffect } from 'react';
import { addQuotesToString, removeQuotesFromString } from '../../../utils/Function.Utils';
import type { InputOptionProps } from '../inputDropdown/InputDropdown';
import type { FunctionInput } from '../../../models';

export type InputTextboxProps = {
  input: FunctionInput;
  loadedInputValue: string | undefined;
  validateAndCreateConnection: (optionValue: string | undefined, option: InputOptionProps | undefined) => void;
};

export const InputTextbox = ({ input, loadedInputValue, validateAndCreateConnection }: InputTextboxProps) => {
  const [inputTyped, setInputTyped] = useState<boolean>(false);

  const [inputText, setInputText] = useState<string>(loadedInputValue ? removeQuotesFromString(loadedInputValue) : '');

  useEffect(() => {
    if (loadedInputValue !== undefined && inputText === '' && inputTyped === false) {
      const formattedValue = removeQuotesFromString(loadedInputValue);
      setInputText(formattedValue);
    }
  }, [loadedInputValue, inputText, inputTyped]);

  const onCustomTextBoxChange = (value: string) => {
    const formattedValue = addQuotesToString(value);

    validateAndCreateConnection(formattedValue, undefined);
  };

  const debounceDelay = 300;
  const onChangeSearchValueDebounced = useDebouncedCallback(onCustomTextBoxChange, [], debounceDelay);

  const onChange = (value: string) => {
    setInputText(removeQuotesFromString(value));
    setInputTyped(true);
    onChangeSearchValueDebounced(value);
  };

  return (
    <Tooltip relationship="label" content={input.tooltip || ''}>
      <Textarea style={{ width: '100%' }} value={inputText} placeholder={input.placeHolder} onChange={(_e, d) => onChange(d.value)} />
    </Tooltip>
  );
};
