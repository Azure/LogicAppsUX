import type { RootState } from '../../../core/state/Store';
import type { FunctionData } from '../../../models/Function';
import { functionDropDownItemText } from '../../../utils/Function.Utils';
import { iconForNormalizedDataType } from '../../../utils/Icon.Utils';
import { addSourceReactFlowPrefix, addTargetReactFlowPrefix } from '../../../utils/ReactFlow.Util';
import { Stack } from '@fluentui/react';
import type { ComboboxProps } from '@fluentui/react-components';
import { Combobox, Option } from '@fluentui/react-components';
import { isNullOrEmpty, SchemaType, type NormalizedDataType } from '@microsoft/logic-apps-shared';
import React, { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useStyles } from './styles';

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
  placeholder?: string;
  inputAllowsCustomValues?: boolean;
  validateAndCreateConnection: (optionValue: string | undefined, option: InputOptionProps | undefined) => void;
}

export const InputDropdown = (props: InputDropdownProps) => {
  const {
    inputName,
    inputValue,
    labelId,
    schemaListType,
    functionId,
    placeholder,
    inputAllowsCustomValues = true,
    validateAndCreateConnection,
  } = props;
  const intl = useIntl();
  const styles = useStyles();

  const sourceSchemaDictionary = useSelector((state: RootState) =>
    schemaListType === SchemaType.Source
      ? state.dataMap.present.curDataMapOperation.flattenedSourceSchema
      : state.dataMap.present.curDataMapOperation.flattenedTargetSchema
  );
  const functionNodeDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.functionNodes);
  const connectionDictionary = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.dataMapConnections);

  const [matchingOptions, setMatchingOptions] = useState<InputOptionProps[]>([]);
  const [customValue, setCustomValue] = useState<string | undefined>(inputName === inputValue ? inputName : undefined); // if the name and value are the same, that's a custom value
  const [value, setValue] = useState<string>(inputName || '');
  const [selectedOptions, setSelectedOptions] = React.useState<string[]>(inputValue ? [inputValue] : []);

  const customValueLoc = intl.formatMessage({
    defaultMessage: '(Custom value)',
    id: 'WgChTm',
    description: 'Suffix for a custom value drop down value.',
  });

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

  const originalOptions = useMemo(() => {
    // Add source schema nodes currently on the canvas
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
  }, [connectionDictionary, sourceSchemaDictionary, functionNodeDictionary, props.functionId, schemaListType]);

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
    const value = event.target.value;
    changeValue(value);
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

  return (
    <Stack horizontal={false}>
      <Combobox
        id={`combobox-${functionId}`}
        size="small"
        aria-labelledby={labelId}
        freeform={inputAllowsCustomValues}
        placeholder={placeholder}
        className={styles.inputStyles}
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
    </Stack>
  );
};
