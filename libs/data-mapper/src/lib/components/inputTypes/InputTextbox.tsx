import { setConnectionInput } from '../../core/state/DataMapSlice';
import type { RootState } from '../../core/state/Store';
import type { FunctionData, FunctionInput } from '../../models';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import { Tooltip, Textarea } from '@fluentui/react-components';
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

  const [inputText, setCustomValue] = useState<string>(loadedInputValue ? loadedInputValue : '');
  const dispatch = useDispatch();

  useEffect(() => {
    if (loadedInputValue !== undefined && inputText === '' && inputTyped === false) {
      setCustomValue(loadedInputValue);
    }
  }, [loadedInputValue, inputText, inputTyped]);

  useEffect(() => {
    const onCustomTextBoxChange = (value: string) => {
      setInputTyped(true);
      if (!selectedItemKey) {
        LogService.error(LogCategory.InputTextbox, 'updateInput', {
          message: 'Attempted to update input with nothing selected on canvas',
        });

        return;
      }

      if (inputTyped) {
        dispatch(
          setConnectionInput({
            targetNode: functionNode,
            targetNodeReactFlowKey: selectedItemKey,
            inputIndex: 0,
            input: value,
          })
        );
      }
    };
    const timeOutId = setTimeout(() => onCustomTextBoxChange(inputText), 500);
    return () => clearTimeout(timeOutId);
  }, [inputText, dispatch, functionNode, selectedItemKey, inputTyped]);

  return (
    <Tooltip relationship="label" content={input.tooltip || ''}>
      <Textarea
        style={{ width: '100%' }}
        value={inputText}
        placeholder={input.placeHolder}
        onChange={(_e, d) => setCustomValue(d.value)}
      ></Textarea>
    </Tooltip>
  );
};
