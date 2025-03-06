import type { RootState } from '../../../core/state/Store';
import { FunctionCategory, type FunctionData } from '../../../models/Function';
import { functionDropDownItemText } from '../../../utils/Function.Utils';
import { iconForNormalizedDataType } from '../../../utils/Icon.Utils';
import { addSourceReactFlowPrefix, addTargetReactFlowPrefix } from '../../../utils/ReactFlow.Util';
import { Stack } from '@fluentui/react';
import type { ComboboxProps } from '@fluentui/react-components';
import { Caption2, Combobox, Option } from '@fluentui/react-components';
import { isNullOrEmpty, SchemaType, type NormalizedDataType } from '@microsoft/logic-apps-shared';
import React, { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useStyles } from './styles';
import { isSchemaNodeExtended } from '../../../utils';
import { isValidConnectionByType, isValidCustomValueByType } from '../../../utils/Connection.Utils';
import { UnboundedInput } from '../../../constants/FunctionConstants';

export interface InputOptionProps {
  key: string;
  text: string;
  path?: string;
  value: string;
  isSchema: boolean;
  isFunction: boolean;
  type: NormalizedDataType;
}

export interface InputDropdownProps {
  currentNode: FunctionData;
  inputName: string | undefined;
  inputValue: string | undefined; // undefined, Node ID, or custom value (string)
  functionId: string;
  schemaListType: SchemaType;
  labelId?: string;
  inputAllowsCustomValues?: boolean;
  index: number;
  validateAndCreateConnection: (optionValue: string | undefined, option: InputOptionProps | undefined) => void;
}

export const InputDropdown = ({
  currentNode,
  inputName,
  inputValue,
  labelId,
  schemaListType,
  index,
  functionId,
  inputAllowsCustomValues = true,
  validateAndCreateConnection,
}: InputDropdownProps) => {
  const intl = useIntl();
  const styles = useStyles();

  const sourceSchemaDictionary = useSelector((state: RootState) =>
    schemaListType === SchemaType.Source
      ? state.dataMap.present.curDataMapOperation.flattenedSourceSchema
      : state.dataMap.present.curDataMapOperation.flattenedTargetSchema
  );
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);
  const functionManifest = useSelector((state: RootState) => state.function.availableFunctions);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);

  const [matchingOptions, setMatchingOptions] = useState<InputOptionProps[]>([]);
  const [customValue, setCustomValue] = useState<string | undefined>(inputName === inputValue ? inputName : undefined); // if the name and value are the same, that's a custom value
  const [value, setValue] = useState<string>(inputName || '');
  const [selectedOptions, setSelectedOptions] = React.useState<string[]>(inputValue ? [inputValue] : []);

  const customValueLoc = intl.formatMessage({
    defaultMessage: '(Custom value)',
    id: '5a00a14e60b8',
    description: 'Suffix for a custom value drop down value.',
  });

  const placeholder = intl.formatMessage({
    defaultMessage: 'Enter a value',
    id: '9bc3231c7f68',
    description: 'Placeholder for a dropdown',
  });

  useEffect(() => {
    if (inputName) {
      setValue(inputName);
    } else {
      setValue('');
    }
  }, [inputName]);

  const customValueAllowedTypesMismatchLoc = intl.formatMessage({
    defaultMessage: 'Warning: custom value does not match one of the allowed types for this input',
    id: '0428224619b4',
    description: `Warning message for when custom value does not match one of the function node input's allowed types`,
  });

  const nodeTypeSchemaNodeTypeMismatchLoc = intl.formatMessage({
    defaultMessage: `Warning: input node type does not match the schema node's type`,
    id: 'fb41fc3ab4c6',
    description: 'Warning message for when input node type does not match schema node type',
  });

  const nodeTypeAllowedTypesMismatchLoc = intl.formatMessage({
    defaultMessage: 'Warning: input node type does not match one of the allowed types for this input.',
    id: 'c8db415158c0',
    description: `Warning message for when input node type does not match one of the function node input's allowed types`,
  });

  const typeValidationMessage = useMemo<string | undefined>(() => {
    if (inputValue) {
      const isUnboundedInput = currentNode.maxNumberOfInputs === UnboundedInput;
      if (customValue) {
        // Function nodes (>= 1 allowed types)
        const matchedAnyAllowedType = currentNode.inputs[isUnboundedInput ? 0 : index].allowedTypes.some((type) =>
          isValidCustomValueByType(inputValue, type)
        );
        if (!matchedAnyAllowedType) {
          return customValueAllowedTypesMismatchLoc;
        }
      } else {
        const selectedOption = matchingOptions.find((option) => option.value === selectedOptions[0]);

        if (selectedOption) {
          if (isSchemaNodeExtended(currentNode)) {
            if (!isValidConnectionByType(selectedOption.type, currentNode.type)) {
              return nodeTypeSchemaNodeTypeMismatchLoc;
            }
          } else {
            let someTypesMatched = false;
            let possibleConversionFunctions = '';
            currentNode.inputs[isUnboundedInput ? 0 : index].allowedTypes.forEach((type) => {
              const conversion = functionManifest.find(
                (func) => func.category === FunctionCategory.Conversion && func.outputValueType === type
              );
              if (conversion) {
                possibleConversionFunctions += `${conversion?.displayName}, `;
              }
              if (isValidConnectionByType(selectedOption.type, type)) {
                someTypesMatched = true;
              }
            });
            possibleConversionFunctions = possibleConversionFunctions.substring(0, possibleConversionFunctions.length - 2);

            if (!someTypesMatched) {
              let conversionMessage = '';
              if (possibleConversionFunctions !== '') {
                conversionMessage = intl.formatMessage(
                  {
                    defaultMessage: ' Try using a Conversion function such as: {conversionFunctions}',
                    id: 'babdcfdbbea6',
                    description: 'Suggest to the user to try a conversion function instead',
                  },
                  {
                    conversionFunctions: possibleConversionFunctions,
                  }
                );
              }
              return `${nodeTypeAllowedTypesMismatchLoc} ${conversionMessage}`;
            }
          }
        }
      }
    }

    return undefined;
  }, [
    inputValue,
    customValue,
    currentNode,
    index,
    customValueAllowedTypesMismatchLoc,
    matchingOptions,
    selectedOptions,
    nodeTypeSchemaNodeTypeMismatchLoc,
    nodeTypeAllowedTypesMismatchLoc,
    functionManifest,
    intl,
  ]);

  useEffect(() => {
    if (inputValue) {
      setSelectedOptions([inputValue]);
    }
    if (inputValue === undefined) {
      setSelectedOptions([]);
      setCustomValue(undefined);
    }
  }, [inputValue]);

  const originalOptions = useMemo(() => {
    const options = Object.values(sourceSchemaDictionary).map<InputOptionProps>((srcSchemaNode) => {
      return {
        key: srcSchemaNode.key,
        text: srcSchemaNode.name,
        path: srcSchemaNode.parentKey,
        value:
          schemaListType === SchemaType.Source ? addSourceReactFlowPrefix(srcSchemaNode.key) : addTargetReactFlowPrefix(srcSchemaNode.key),
        isSchema: true,
        isFunction: false,
        type: srcSchemaNode.type,
      };
    });

    Object.entries(functionNodeDictionary).forEach(([key, node]) => {
      // Don't list currentNode as an option
      if (key === functionId) {
        return;
      }

      // Compile Function's input values (if any)
      const nodeName = functionDropDownItemText(key, node, connectionDictionary);

      options.push({
        key,
        text: nodeName,
        value: key,
        isSchema: false,
        isFunction: true,
        type: node.outputValueType,
      });
    });

    return options;
  }, [connectionDictionary, sourceSchemaDictionary, functionNodeDictionary, functionId, schemaListType]);

  useEffect(() => {
    setMatchingOptions(originalOptions);
  }, [originalOptions]);

  const filteredOptions = useMemo(() => {
    const options = matchingOptions.map((option) => {
      if (option.isSchema) {
        const srcSchemaNode = sourceSchemaDictionary[option.value];
        const TypeIcon = iconForNormalizedDataType(srcSchemaNode.type, 16, false, srcSchemaNode.nodeProperties);
        return (
          <Option key={option.key} text={option.text} value={option.value}>
            <Stack className={styles.optionStack} horizontal verticalAlign="center">
              <TypeIcon className={styles.icon} />
              <div className={styles.optionText}>{option.text}</div>
              <div className={styles.pathText}>{option.path}</div>
            </Stack>
          </Option>
        );
      }
      return (
        <Option className={styles.optionText} key={option.key} text={option.text} value={option.key}>
          {option.text}
        </Option>
      );
    });

    return options;
  }, [matchingOptions, sourceSchemaDictionary, styles]);

  const onChange: ComboboxProps['onChange'] = (event) => {
    const value2 = event.target.value;
    setCustomValue(value2);
    changeValue(value2);
  };

  const onOptionSelect: ComboboxProps['onOptionSelect'] = (_event, data) => {
    if (data.optionValue) {
      const matchingOption = data.optionText && matchingOptions.some((option) => option.text === data.optionText);
      const option = matchingOptions.find((opt) => opt.value === data.optionValue);

      if (matchingOption) {
        setCustomValue(undefined);
      } else {
        setCustomValue(data.optionText);
      }

      setSelectedOptions(data.selectedOptions);
      setValue(data.optionText ?? '');

      validateAndCreateConnection(data.optionValue, option);
    }
  };

  const changeValue = (value: string) => {
    const matches = isNullOrEmpty(value)
      ? originalOptions
      : originalOptions.filter((option) => option.text.toLowerCase().indexOf(value.toLowerCase()) === 0);

    setMatchingOptions(matches);

    setCustomValue(value);
  };

  const selectCustomValueOnClose: ComboboxProps['onOpenChange'] = (_event, data) => {
    if (data.open === false) {
      const matchingOption = customValue && matchingOptions.some((option) => option.text === customValue);
      if (!matchingOption && customValue && customValue !== value) {
        setSelectedOptions([customValue]);
        setValue(customValue);

        validateAndCreateConnection(customValue, undefined);
      }
    }
  };

  return (
    <Stack horizontal={false}>
      <Combobox
        id={`combobox-${functionId}`}
        size="small"
        aria-labelledby={labelId}
        freeform={inputAllowsCustomValues}
        placeholder={placeholder}
        onOpenChange={selectCustomValueOnClose}
        className={styles.inputStyles}
        onChange={onChange}
        onOptionSelect={onOptionSelect}
        value={customValue === undefined ? value : customValue}
        selectedOptions={selectedOptions}
      >
        {filteredOptions.length > 0 ? filteredOptions : undefined}
        {customValue && inputAllowsCustomValues && (
          <Option key="freeform" text={customValue}>
            {customValue} {customValueLoc}
          </Option>
        )}
      </Combobox>
      <Caption2 className={styles.validationWarningmessage}>{typeValidationMessage}</Caption2>
    </Stack>
  );
};
