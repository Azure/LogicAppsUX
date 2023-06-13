import { setConnectionInput, showNotification } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { NormalizedDataType, SchemaNodeExtended } from '../../models';
import type { ConnectionUnit, InputConnection } from '../../models/Connection';
import type { FunctionData } from '../../models/Function';
import { isValidConnectionByType, isValidCustomValueByType, newConnectionWillHaveCircularLogic } from '../../utils/Connection.Utils';
import { functionDropDownItemText, isFunctionData } from '../../utils/Function.Utils';
import { iconForNormalizedDataType } from '../../utils/Icon.Utils';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import { addSourceReactFlowPrefix } from '../../utils/ReactFlow.Util';
import { isSchemaNodeExtended } from '../../utils/Schema.Utils';
import { NotificationTypes, errorNotificationAutoHideDuration } from '../notification/Notification';
import { Stack } from '@fluentui/react';
import type { ComboboxProps } from '@fluentui/react-components';
import { Combobox, Option, Text, makeStyles, tokens, typographyStyles } from '@fluentui/react-components';
import { isNullOrEmpty } from '@microsoft/utils-logic-apps';
import React, { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

interface InputOptionProps {
  key: string;
  text: string;
  value: string;
  isSchema: boolean;
  isFunction: boolean;
  type: NormalizedDataType;
}

const useStyles = makeStyles({
  inputStyles: {
    width: '100%',
  },
  inputLabel: {
    ...typographyStyles.body1,
    color: tokens.colorNeutralForeground1,
  },
});

export interface InputDropdownProps {
  currentNode: SchemaNodeExtended | FunctionData;
  inputName: string | undefined;
  inputValue: string | undefined; // undefined, Node ID, or custom value (string)
  inputIndex: number;
  id?: string;
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
    id,
    placeholder,
    inputAllowsCustomValues = true,
    isUnboundedInput,
  } = props;
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useStyles();

  const currentSourceSchemaNodes = useSelector((state: RootState) => state.dataMap.curDataMapOperation.currentSourceSchemaNodes);
  const sourceSchemaDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.flattenedSourceSchema);
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.functionNodes);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.curDataMapOperation.dataMapConnections);
  const selectedItemKey = useSelector((state: RootState) => state.dataMap.curDataMapOperation.selectedItemKey);

  const [matchingOptions, setMatchingOptions] = useState<InputOptionProps[]>([]);
  const [customValue, setCustomValue] = useState<string | undefined>(inputName === inputValue ? inputName : undefined); // if the name and value are the same, that's a custom value
  const [value, setValue] = useState<string>(inputName || '');
  const [selectedOptions, setSelectedOptions] = React.useState<string[]>(inputValue ? [inputValue] : []);

  const customValueSchemaNodeTypeMismatchLoc = intl.formatMessage({
    defaultMessage: `Warning: custom value does not match the schema node's type`,
    description: 'Warning message for when custom value does not match schema node type',
  });

  const customValueAllowedTypesMismatchLoc = intl.formatMessage({
    defaultMessage: `Warning: custom value does not match one of the allowed types for this input`,
    description: `Warning message for when custom value does not match one of the function node input's allowed types`,
  });

  const nodeTypeSchemaNodeTypeMismatchLoc = intl.formatMessage({
    defaultMessage: `Warning: input node type does not match the schema node's type`,
    description: 'Warning message for when input node type does not match schema node type',
  });

  const nodeTypeAllowedTypesMismatchLoc = intl.formatMessage({
    defaultMessage: `Warning: input node type does not match one of the allowed types for this input`,
    description: `Warning message for when input node type does not match one of the function node input's allowed types`,
  });

  const customValueLoc = intl.formatMessage({
    defaultMessage: `(Custom value)`,
    description: `Suffix for a custom value drop down value.`,
  });

  const validateAndCreateConnection = (optionValue: string | undefined) => {
    const option = matchingOptions.find((opt) => opt.value === optionValue);
    if (optionValue) {
      if (!option) {
        // Create custom value connection
        const srcConUnit: InputConnection = optionValue;

        updateInput(srcConUnit);
      } else {
        const selectedInputKey = option.value;
        const isSelectedInputFunction = option.isFunction;

        // If Function node, ensure that new connection won't create loop/circular logic
        if (
          isFunctionData(currentNode) &&
          selectedItemKey &&
          newConnectionWillHaveCircularLogic(selectedItemKey, selectedInputKey, connectionDictionary)
        ) {
          dispatch(showNotification({ type: NotificationTypes.CircularLogicError, autoHideDurationMs: errorNotificationAutoHideDuration }));
          return;
        }

        // Create connection
        const source = isSelectedInputFunction
          ? functionNodeDictionary[selectedInputKey].functionData
          : sourceSchemaDictionary[selectedInputKey];
        const srcConUnit: ConnectionUnit = {
          node: source,
          reactFlowKey: selectedInputKey,
        };

        updateInput(srcConUnit);
      }
    }
  };

  const updateInput = (newValue: InputConnection) => {
    if (!selectedItemKey) {
      LogService.error(LogCategory.InputDropDown, 'updateInput', {
        message: 'Attempted to update input with nothing selected on canvas',
      });

      return;
    }

    const targetNodeReactFlowKey = selectedItemKey;
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
    const options = currentSourceSchemaNodes.map<InputOptionProps>((srcSchemaNode) => {
      return {
        key: srcSchemaNode.key,
        text: srcSchemaNode.name,
        value: addSourceReactFlowPrefix(srcSchemaNode.key),
        isSchema: true,
        isFunction: false,
        type: srcSchemaNode.type,
      };
    });

    // Add function nodes currently on the canvas
    Object.entries(functionNodeDictionary).forEach(([key, node]) => {
      // Don't list currentNode as an option
      if (key === selectedItemKey) {
        return;
      }

      // Compile Function's input values (if any)
      const nodeName = functionDropDownItemText(key, node.functionData, connectionDictionary);

      options.push({
        key,
        text: nodeName,
        value: key,
        isSchema: false,
        isFunction: true,
        type: node.functionData.outputValueType,
      });
    });

    return options;
  }, [connectionDictionary, currentSourceSchemaNodes, functionNodeDictionary, selectedItemKey]);

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
              <div style={{ marginLeft: 4 }}>{option.text}</div>
            </Stack>
          </Option>
        );
      } else {
        return (
          <Option key={option.key} text={option.text} value={option.key}>
            {option.text}
          </Option>
        );
      }
    });

    return options;
  }, [matchingOptions, sourceSchemaDictionary]);

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
    const matches = !isNullOrEmpty(value)
      ? originalOptions.filter((option) => option.text.toLowerCase().indexOf(value.toLowerCase()) === 0)
      : originalOptions;

    setMatchingOptions(matches);

    if (value.length && matches.length < 1) {
      setCustomValue(value);
    } else {
      setCustomValue(undefined);
    }
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
            currentNode.inputs[isUnboundedInput ? 0 : inputIndex].allowedTypes.forEach((type) => {
              if (isValidConnectionByType(selectedOption.type, type)) {
                someTypesMatched = true;
              }
            });

            if (!someTypesMatched) {
              return nodeTypeAllowedTypesMismatchLoc;
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
  ]);

  return (
    <Stack horizontal={false}>
      <Combobox
        id={id}
        aria-labelledby={labelId}
        freeform={inputAllowsCustomValues}
        placeholder={placeholder}
        className={styles.inputStyles}
        data-testid={`inputDropdown-dropdown-${inputIndex}`}
        onChange={onChange}
        onOptionSelect={onOptionSelect}
        value={customValue || value}
        selectedOptions={selectedOptions}
        style={{ width: '500px' }}
      >
        {filteredOptions.length > 0 ? filteredOptions : undefined}
        {customValue && (
          <Option key="freeform" text={customValue}>
            {customValue} {customValueLoc}
          </Option>
        )}
      </Combobox>
      {typeValidationMessage && <Text style={{ color: tokens.colorPaletteYellowForeground2 }}>{typeValidationMessage}</Text>}
    </Stack>
  );
};
