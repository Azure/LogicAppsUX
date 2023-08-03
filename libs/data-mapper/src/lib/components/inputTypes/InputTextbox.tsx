import { setConnectionInput } from '../../core/state/DataMapSlice';
import type { RootState } from '../../core/state/Store';
import type { FunctionData, FunctionInput } from '../../models';
import { addQuotesToString, removeQuotesFromString } from '../../utils/Function.Utils';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import { Tooltip, Textarea } from '@fluentui/react-components';
import { useDebouncedCallback } from '@react-hookz/web';
import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export type InputTextboxProps = {
  input: FunctionInput;
  functionNode: FunctionData;
  loadedInputValue: string | undefined;
};

export const InputTextbox = ({ input, functionNode, loadedInputValue }: InputTextboxProps) => {
  const selectedItemKey = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKey);
  const [inputTyped, setInputTyped] = useState<boolean>(false);

  const [inputText, setInputText] = useState<string>(loadedInputValue ? removeQuotesFromString(loadedInputValue) : '');
  const dispatch = useDispatch();

  useEffect(() => {
    if (loadedInputValue !== undefined && inputText === '' && inputTyped === false) {
      const formattedValue = removeQuotesFromString(loadedInputValue);
      setInputText(formattedValue);
    }
  }, [loadedInputValue, inputText, inputTyped]);

  const onCustomTextBoxChange = (value: string) => {
    if (!selectedItemKey) {
      LogService.error(LogCategory.InputTextbox, 'updateInput', {
        message: 'Attempted to update input with nothing selected on canvas',
      });

      return;
    }

    const formattedValue = addQuotesToString(value);

    if (inputTyped) {
      dispatch(
        setConnectionInput({
          targetNode: functionNode,
          targetNodeReactFlowKey: selectedItemKey,
          inputIndex: 0,
          input: formattedValue,
        })
      );
    }
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
      <Textarea
        style={{ width: '100%' }}
        value={inputText}
        placeholder={input.placeHolder}
        onChange={(_e, d) => onChange(d.value)}
      ></Textarea>
    </Tooltip>
  );
};
