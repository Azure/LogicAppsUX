import { setConnectionInput } from '../../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../../core/state/Store';
import { FunctionCategory } from '../../../models';
import type { ConnectionUnit, InputConnection } from '../../../models/Connection';
import type { FunctionData } from '../../../models/Function';
import { isValidConnectionByType, isValidCustomValueByType, newConnectionWillHaveCircularLogic } from '../../../utils/Connection.Utils';
import { functionDropDownItemText } from '../../../utils/Function.Utils';
import { iconForNormalizedDataType } from '../../../utils/Icon.Utils';
import { addSourceReactFlowPrefix } from '../../../utils/ReactFlow.Util';
import { isSchemaNodeExtended } from '../../../utils/Schema.Utils';
import { Stack } from '@fluentui/react';
import type { ComboboxProps } from '@fluentui/react-components';
import { Combobox, Option, Text } from '@fluentui/react-components';
import { isNullOrEmpty, type NormalizedDataType } from '@microsoft/logic-apps-shared';
import React, { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';
import { useStyles } from './styles';

interface InputOptionProps {
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
  inputIndex: number;
  functionId: string;
  labelId?: string;
  placeholder?: string;
  inputAllowsCustomValues?: boolean;
  isUnboundedInput?: boolean;
}

export const InputDropdown = (props: InputDropdownProps) => {
  const {
    currentNode,
    inputName,
    inputValue,
    inputIndex,
    labelId,
    functionId,
    placeholder,
    inputAllowsCustomValues = true,
    isUnboundedInput,
  } = props;
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useStyles();

  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.flattenedSourceSchema);
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);
  const functions = useSelector((state: RootState) => state.function.availableFunctions);

  const [matchingOptions, setMatchingOptions] = useState<InputOptionProps[]>([]);
  const [customValue, setCustomValue] = useState<string | undefined>(inputName === inputValue ? inputName : undefined); // if the name and value are the same, that's a custom value
  const [value, setValue] = useState<string>(inputName || '');
  const [selectedOptions, setSelectedOptions] = React.useState<string[]>(inputValue ? [inputValue] : []);

  useEffect(() => {
    if (inputName) {
      setValue(inputName);
    }
  }, [inputName]);

  useEffect(() => {
    if (inputValue) {
      setSelectedOptions([inputValue]);
    }
  }, [inputValue]);

  const customValueSchemaNodeTypeMismatchLoc = intl.formatMessage({
    defaultMessage: `Warning: custom value does not match the schema node's type`,
    id: 'sRpETS',
    description: 'Warning message for when custom value does not match schema node type',
  });

  const customValueAllowedTypesMismatchLoc = intl.formatMessage({
    defaultMessage: 'Warning: custom value does not match one of the allowed types for this input',
    id: 'BCgiRh',
    description: `Warning message for when custom value does not match one of the function node input's allowed types`,
  });

  const nodeTypeSchemaNodeTypeMismatchLoc = intl.formatMessage({
    defaultMessage: `Warning: input node type does not match the schema node's type`,
    id: '+0H8Or',
    description: 'Warning message for when input node type does not match schema node type',
  });

  const nodeTypeAllowedTypesMismatchLoc = intl.formatMessage({
    defaultMessage: 'Warning: input node type does not match one of the allowed types for this input.',
    id: 'yNtBUV',
    description: `Warning message for when input node type does not match one of the function node input's allowed types`,
  });

  const customValueLoc = intl.formatMessage({
    defaultMessage: '(Custom value)',
    id: 'WgChTm',
    description: 'Suffix for a custom value drop down value.',
  });

  const validateAndCreateConnection = (optionValue: string | undefined) => {
    const option = matchingOptions.find((opt) => opt.value === optionValue);
    if (optionValue) {
      if (option) {
        const selectedInputKey = option.value;
        const isSelectedInputFunction = option.isFunction;

        // ensure that new connection won't create loop/circular logic
        if (newConnectionWillHaveCircularLogic(currentNode.key, selectedInputKey, connectionDictionary)) {
          //dispatch(showNotification({ type: NotificationTypes.CircularLogicError, autoHideDurationMs: errorNotificationAutoHideDuration }));
          return;
        }

        // Create connection
        const source = isSelectedInputFunction ? functionNodeDictionary[selectedInputKey] : sourceSchemaDictionary[selectedInputKey];
        const srcConUnit: ConnectionUnit = {
          node: source,
          reactFlowKey: selectedInputKey,
        };

        updateInput(srcConUnit);
      } else {
        // Create custom value connection
        const srcConUnit: InputConnection = optionValue;

        updateInput(srcConUnit);
      }
    }
  };

  const updateInput = (newValue: InputConnection) => {
    const targetNodeReactFlowKey = functionId;
    dispatch(
      setConnectionInput({
        targetNode: currentNode,
        targetNodeReactFlowKey,
        inputIndex,
        input: newValue,
      })
    );
  };

  const originalOptions = useMemo(() => {
    // Add source schema nodes currently on the canvas
    const options = Object.values(sourceSchemaDictionary).map<InputOptionProps>((srcSchemaNode) => {
      return {
        key: srcSchemaNode.key,
        text: srcSchemaNode.name,
        path: srcSchemaNode.parentKey,
        value: addSourceReactFlowPrefix(srcSchemaNode.key),
        isSchema: true,
        isFunction: false,
        type: srcSchemaNode.type,
      };
    });

    // Add function nodes currently on the canvas
    Object.entries(functionNodeDictionary).forEach(([key, node]) => {
      // Don't list currentNode as an option
      if (key === props.functionId) {
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
  }, [connectionDictionary, sourceSchemaDictionary, functionNodeDictionary, props.functionId]);

  useEffect(() => {
    setMatchingOptions(originalOptions);
  }, [originalOptions]);

  const filteredOptions = useMemo(() => {
    // Add source schema nodes currently on the canvas
    const options = matchingOptions.map((option) => {
      if (option.isSchema) {
        const srcSchemaNode = sourceSchemaDictionary[option.value];
        const TypeIcon = iconForNormalizedDataType(srcSchemaNode.type, 16, false, srcSchemaNode.nodeProperties);
        return (
          <Option key={option.key} text={option.text} value={option.value}>
            <Stack horizontal verticalAlign="center">
              <TypeIcon />
              <div className={styles.optionText} style={{ marginLeft: 4 }}>
                {option.text}
              </div>
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
    const value = event.target.value;
    changeValue(value);
  };

  const onOptionSelect: ComboboxProps['onOptionSelect'] = (_event, data) => {
    if (data.optionValue) {
      const matchingOption = data.optionText && matchingOptions.some((option) => option.text === data.optionText);

      if (matchingOption) {
        setCustomValue(undefined);
      } else {
        setCustomValue(data.optionText);
      }

      setSelectedOptions(data.selectedOptions);
      setValue(data.optionText ?? '');

      validateAndCreateConnection(data.optionValue);
    }
  };

  const changeValue = (value: string) => {
    const matches = isNullOrEmpty(value)
      ? originalOptions
      : originalOptions.filter((option) => option.text.toLowerCase().indexOf(value.toLowerCase()) === 0);

    setMatchingOptions(matches);

    setCustomValue(value);
  };

  const typeValidationMessage = useMemo<string | undefined>(() => {
    if (inputValue) {
      if (customValue) {
        // Schema node (single type)
        if (isSchemaNodeExtended(currentNode)) {
          if (!isValidCustomValueByType(inputValue, currentNode.type)) {
            return customValueSchemaNodeTypeMismatchLoc;
          }
        } else {
          // Function nodes (>= 1 allowed types)
          const matchedAnyAllowedType = currentNode.inputs[isUnboundedInput ? 0 : inputIndex].allowedTypes.some((type) =>
            isValidCustomValueByType(inputValue, type)
          );

          if (!matchedAnyAllowedType) {
            return customValueAllowedTypesMismatchLoc;
          }
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
            currentNode.inputs[isUnboundedInput ? 0 : inputIndex].allowedTypes.forEach((type) => {
              const conversion = functions.find((func) => func.category === FunctionCategory.Conversion && func.outputValueType === type);
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
                    id: 'ur3P27',
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
    customValueSchemaNodeTypeMismatchLoc,
    isUnboundedInput,
    inputIndex,
    customValueAllowedTypesMismatchLoc,
    matchingOptions,
    selectedOptions,
    nodeTypeSchemaNodeTypeMismatchLoc,
    nodeTypeAllowedTypesMismatchLoc,
    functions,
    intl,
  ]);

  return (
    <Stack horizontal={false}>
      <Combobox
        id={`combobox-${functionId}`}
        size="small"
        aria-labelledby={labelId}
        freeform={inputAllowsCustomValues}
        placeholder={placeholder}
        className={styles.inputStyles}
        data-testid={`inputDropdown-dropdown-${inputIndex}`}
        onChange={onChange}
        onOptionSelect={onOptionSelect}
        value={customValue === undefined ? value : customValue}
        selectedOptions={selectedOptions}
      >
        {filteredOptions.length > 0 ? filteredOptions : undefined}
        {customValue && (
          <Option key="freeform" text={customValue}>
            {customValue} {customValueLoc}
          </Option>
        )}
      </Combobox>
      {/* hiding until we fix styling */}
      {typeValidationMessage && (
        <Text style={{ visibility: 'hidden', height: '0px' }} className={styles.validationText}>
          {typeValidationMessage}
        </Text>
      )}
    </Stack>
  );
};
