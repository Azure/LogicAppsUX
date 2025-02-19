import { Tooltip, Textarea } from '@fluentui/react-components';
import { useDebouncedCallback } from '@react-hookz/web';
import { useState, useEffect } from 'react';
import { addQuotesToString } from '../../../utils/Function.Utils';
import type { FunctionInput } from '../../../models';

export type InputTextboxProps = {
  input: FunctionInput;
  loadedInputValue: string | undefined;
  updateCustomInputConnection: (optionValue: string) => void;
};

export const InputTextbox = ({ input, loadedInputValue, updateCustomInputConnection }: InputTextboxProps) => {
  const [inputTyped, setInputTyped] = useState<boolean>(false);

  const [inputText, setInputText] = useState<string>(loadedInputValue ? loadedInputValue : '');

  useEffect(() => {
    if (loadedInputValue !== undefined && inputText === '' && inputTyped === false) {
      setInputText(loadedInputValue);
    }
  }, [loadedInputValue, inputText, inputTyped]);

  const onCustomTextBoxChange = (value: string) => {
    const formattedValue = addQuotesToString(value);

    updateCustomInputConnection(formattedValue);
  };

  const debounceDelay = 300;
  const onChangeSearchValueDebounced = useDebouncedCallback(onCustomTextBoxChange, [], debounceDelay);

  const onChange = (value: string) => {
    setInputText(value);
    setInputTyped(true);
    onChangeSearchValueDebounced(value);
  };

  return (
    <Tooltip relationship="label" content={input.tooltip || ''}>
      <Textarea style={{ width: '100%' }} value={inputText} placeholder={input.placeHolder} onChange={(_e, d) => onChange(d.value)} />
    </Tooltip>
  );
};
