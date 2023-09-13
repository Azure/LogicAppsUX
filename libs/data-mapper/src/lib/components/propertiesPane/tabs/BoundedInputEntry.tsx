import { setConnectionInput } from '../../../core/state/DataMapSlice';
import type { RootState } from '../../../core/state/Store';
import type { FunctionData, FunctionInput } from '../../../models';
import { InputFormat } from '../../../models';
import type { Connection, ConnectionDictionary } from '../../../models/Connection';
import { addQuotesToString, getInputName, getInputValue, removeQuotesFromString } from '../../../utils/Function.Utils';
import { FileDropdown } from '../../fileDropdown/fileDropdown';
import { InputDropdown } from '../../inputTypes/InputDropdown';
import { InputTextbox } from '../../inputTypes/InputTextbox';
import { Tooltip } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export interface BoundedInputEntryProps {
  index: number;
  input: FunctionInput;
  functionData: FunctionData;
  connection: Connection;
  connectionDictionary: ConnectionDictionary;
}

export const BoundedInputEntry = ({ index, input, functionData, connection, connectionDictionary }: BoundedInputEntryProps) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const selectedItemKey = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKey);

  const pathOptions = useSelector((state: RootState) => state.function.customXsltFilePaths);
  const inputConnection = !connection
    ? undefined
    : Object.values(connection.inputs).length > 1
    ? connection.inputs[index][0]
    : connection.inputs[0][index];

  let inputBox: JSX.Element;

  switch (input.inputEntryType) {
    case InputFormat.TextBox:
      inputBox = (
        <div key={index} style={{ marginTop: 8 }}>
          <InputTextbox input={input} loadedInputValue={getInputValue(inputConnection)} functionNode={functionData}></InputTextbox>{' '}
        </div>
      );
      break;
    case InputFormat.FilePicker: {
      const customXsltPath = 'DataMapper/Extensions/InlineXslt';

      const relativePathMessage = intl.formatMessage({
        defaultMessage: 'Select function from ',
        description: 'Path to the function to select',
      });
      const ariaLabel = intl.formatMessage({
        defaultMessage: 'Dropdown to select filepath ',
        description: 'Label of the file path selection box',
      });
      const noFilesFound = intl.formatMessage(
        {
          defaultMessage: 'No files found in {filePath}, please save XSLT to specified path to use this function',
          description: 'Files could not be found in specified path',
        },
        {
          filePath: customXsltPath,
        }
      );

      let placeholder = `${relativePathMessage} ${customXsltPath}`;
      let isDisabled = false;

      if (pathOptions.length === 0) {
        placeholder = noFilesFound;
        isDisabled = true;
      }

      inputBox = (
        <FileDropdown
          loadedSelection={removeQuotesFromString((connection?.inputs[0][0] as string) || '')}
          allPathOptions={pathOptions}
          placeholder={placeholder}
          setSelectedPath={(item: string | undefined) => {
            if (item && selectedItemKey && pathOptions.find((path) => path === item))
              dispatch(
                setConnectionInput({
                  targetNode: functionData,
                  targetNodeReactFlowKey: selectedItemKey,
                  inputIndex: 0,
                  input: addQuotesToString(item),
                })
              );
          }}
          relativePathMessage={''}
          errorMessage=""
          ariaLabel={ariaLabel}
          disabled={isDisabled}
        />
      );
      break;
    }
    default:
      inputBox = (
        <Tooltip relationship="label" content={input.tooltip || ''}>
          <InputDropdown
            currentNode={functionData}
            placeholder={input.placeHolder}
            inputName={getInputName(inputConnection, connectionDictionary)}
            inputValue={getInputValue(inputConnection)}
            inputIndex={index}
            inputAllowsCustomValues={input.allowCustomInput}
          />
        </Tooltip>
      );
  }

  return (
    <div key={index} style={{ marginTop: 8 }}>
      {inputBox}
    </div>
  );
};
