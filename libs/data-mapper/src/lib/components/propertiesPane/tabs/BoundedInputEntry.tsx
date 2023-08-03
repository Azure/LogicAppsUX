import type { FunctionData, FunctionInput } from '../../../models';
import { InputFormat } from '../../../models';
import type { Connection, ConnectionDictionary } from '../../../models/Connection';
import { getInputName, getInputValue } from '../../../utils/Function.Utils';
import { FileDropdown } from '../../fileDropdown/fileDropdown';
import { InputDropdown } from '../../inputTypes/InputDropdown';
import { InputTextbox } from '../../inputTypes/InputTextbox';
import { Tooltip } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

export interface BoundedInputEntryProps {
  index: number;
  input: FunctionInput;
  functionData: FunctionData;
  connection: Connection;
  connectionDictionary: ConnectionDictionary;
}

export const BoundedInputEntry = ({ index, input, functionData, connection, connectionDictionary }: BoundedInputEntryProps) => {
  const intl = useIntl();
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
      const placeholder = intl.formatMessage({
        defaultMessage: 'Select file',
        description: 'Indicates user should choose a file',
      });
      const relativePathMessage = intl.formatMessage({
        defaultMessage: 'Select function from ',
        description: 'Path to the function to select',
      });
      const ariaLabel = intl.formatMessage({
        defaultMessage: 'Dropdown to select filepath ',
        description: 'Label of the file path selection box',
      });
      const customFunctionPath = 'DataMapper/Extension/Functions';
      inputBox = (
        <FileDropdown
          allPathOptions={['abc']}
          placeholder={placeholder}
          setSelectedPath={(_item: string | undefined) => {
            return null;
          }}
          relativePathMessage={`${relativePathMessage} ${customFunctionPath}`}
          errorMessage="errormessage"
          ariaLabel={ariaLabel}
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
